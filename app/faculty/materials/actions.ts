"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ALLOWED_EXTENSIONS } from "@/lib/file-constants";

function revalidateMaterialCaches(materialId?: string) {
  revalidatePath("/faculty/materials");
  revalidatePath("/faculty");
  revalidatePath("/admin");
  revalidatePath("/admin/analytics");
  revalidatePath("/student");
  revalidatePath("/student/subjects");
  if (materialId) {
    revalidatePath(`/student/materials/${materialId}`);
  }
}

// Archive or Publish a Material
export async function toggleMaterialState(id: string, newState: "draft" | "published" | "archived") {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("materials")
    .update({ state: newState })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidateMaterialCaches(id);
  return { success: true };
}

// Soft Delete a Material (supports multi-branch linked IDs)
export async function deleteMaterial(id: string, linkedIds?: string[]) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const idsToDelete = Array.from(new Set([id, ...(linkedIds || [])]));

  for (const matId of idsToDelete) {
    await supabase
      .from("materials")
      .update({ state: "deleted" })
      .eq("id", matId)
      .eq("owner_id", user.id);
  }

  revalidateMaterialCaches(id);
  return { success: true };
}

// Delete a Specific Attached Study File
export async function deleteMaterialFile(
  materialId: string,
  fileId: string,
  storageRef?: string,
  linkedMaterialIds?: string[]
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch the target file record
  const { data: fileRecord } = await supabase
    .from("material_files")
    .select("id, file_name, storage_ref, storage_path, material_id")
    .eq("id", fileId)
    .single();

  if (!fileRecord) {
    return { error: "File record not found." };
  }

  // Delete target file from database
  await supabase
    .from("material_files")
    .delete()
    .eq("id", fileId);

  // If storage reference is present, physically remove the file
  const ref = storageRef || fileRecord.storage_path || fileRecord.storage_ref;
  if (ref) {
    try {
      await supabase.storage.from("materials").remove([ref]);
    } catch (e) {
      console.warn("Storage deletion notice:", e);
    }
  }

  // If requested to delete across all linked branches
  if (linkedMaterialIds && linkedMaterialIds.length > 0) {
    for (const linkedId of linkedMaterialIds) {
      if (linkedId === materialId) continue;
      const { data: siblingFiles } = await supabase
        .from("material_files")
        .select("id, storage_ref, storage_path")
        .eq("material_id", linkedId)
        .eq("file_name", fileRecord.file_name);

      if (siblingFiles && siblingFiles.length > 0) {
        for (const sf of siblingFiles) {
          await supabase.from("material_files").delete().eq("id", sf.id);
          const sRef = sf.storage_path || sf.storage_ref;
          if (sRef && sRef !== ref) {
            try { await supabase.storage.from("materials").remove([sRef]); } catch {}
          }
        }
      }
    }
  }

  revalidateMaterialCaches(materialId);
  return { success: true };
}

// Bulk Archive or Publish Materials
export async function bulkToggleMaterialState(ids: string[], newState: "draft" | "published" | "archived") {
  if (!ids || ids.length === 0) return { error: "No materials selected." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("materials")
    .update({ state: newState })
    .in("id", ids)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidateMaterialCaches();
  return { success: true };
}

// Bulk Soft Delete Materials
export async function bulkDeleteMaterials(ids: string[]) {
  if (!ids || ids.length === 0) return { error: "No materials selected." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("materials")
    .update({ state: "deleted" })
    .in("id", ids)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidateMaterialCaches();
  return { success: true };
}

// Edit Material Metadata (Title, Description, Type, State)
export async function updateMaterialDetails(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const materialId = (formData.get("materialId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const type = (formData.get("type") as string)?.trim();
  const state = (formData.get("state") as "draft" | "published" | "archived") || "published";

  if (!materialId || !title || !type) {
    return { error: "Required fields (title, type) are missing." };
  }

  const { error } = await supabase
    .from("materials")
    .update({
      title,
      description,
      type,
      state,
    })
    .eq("id", materialId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidateMaterialCaches(materialId);
  return { success: true };
}

// Attach a New File to an Existing Material
export async function attachFileToMaterial(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const materialId = formData.get("materialId") as string;
  const file = formData.get("file") as File;

  if (!materialId || !file || file.size === 0) {
    return { error: "Material ID and a valid file are required." };
  }

  const maxFileSize = 100 * 1024 * 1024; // 100MB
  const ext = "." + file.name.split(".").pop()?.toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { error: `File type "${ext}" is not supported. Supported: PDF, PPT, Word, Excel, Code, ZIP, TXT, and Images.` };
  }
  if (file.size > maxFileSize) {
    return { error: "File exceeds 100MB limit." };
  }

  const uniqueId = crypto.randomUUID();
  const storageRef = `${materialId}/${uniqueId}${ext}`;

  // Upload to Storage
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("materials")
    .upload(storageRef, buffer, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });

  if (uploadError) {
    return { error: `Failed to upload file: ${uploadError.message}` };
  }

  // Insert into material_files
  const { error: fileInsertError } = await supabase
    .from("material_files")
    .insert({
      id: crypto.randomUUID(),
      material_id: materialId,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size: file.size,
      version: 1,
      storage_path: storageRef,
      storage_ref: storageRef,
    });

  if (fileInsertError) {
    return { error: `Failed to register file: ${fileInsertError.message}` };
  }

  // If requested to sync attached file across all linked branches
  const linkedIdsRaw = formData.get("linkedMaterialIds") as string;
  let linkedMaterialIds: string[] = [];
  if (linkedIdsRaw) {
    try { linkedMaterialIds = JSON.parse(linkedIdsRaw); } catch {}
  }

  if (linkedMaterialIds && linkedMaterialIds.length > 0) {
    for (const linkedId of linkedMaterialIds) {
      if (linkedId === materialId) continue;
      try {
        await supabase
          .from("material_files")
          .insert({
            id: crypto.randomUUID(),
            material_id: linkedId,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            size: file.size,
            version: 1,
            storage_path: storageRef,
            storage_ref: storageRef,
          });
        revalidateMaterialCaches(linkedId);
      } catch (err) {
        console.warn("Linked material file attach notice:", err);
      }
    }
  }

  revalidateMaterialCaches(materialId);
  return { success: true };
}

// Replace File Version Action
export async function replaceFileVersion(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const materialId = formData.get("materialId") as string;
  const fileId = formData.get("fileId") as string;
  const file = formData.get("file") as File;

  if (!materialId || !fileId || !file || file.size === 0) {
    return { error: "Required fields or file are missing." };
  }

  const maxFileSize = 100 * 1024 * 1024; // 100MB
  const ext = "." + file.name.split(".").pop()?.toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { error: `File type "${ext}" is not supported. Supported: PDF, PPT, Word, Excel, Code, ZIP, TXT, and Images.` };
  }
  if (file.size > maxFileSize) {
    return { error: "File exceeds 100MB limit." };
  }

  // Fetch current version of the file
  const { data: currentFile, error: fileError } = await supabase
    .from("material_files")
    .select("version, file_name")
    .eq("id", fileId)
    .single();

  if (fileError || !currentFile) {
    return { error: "Current file metadata not found." };
  }

  const nextVersion = (currentFile.version || 1) + 1;
  const uniqueId = crypto.randomUUID();
  const storageRef = `${materialId}/${uniqueId}${ext}`;

  // Upload to Storage
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("materials")
    .upload(storageRef, buffer, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });

  if (uploadError) {
    return { error: `Failed to upload new version: ${uploadError.message}` };
  }

  // Insert new version record while preserving the previous metadata and providing storage_path
  const { error: fileInsertError } = await supabase
    .from("material_files")
    .insert({
      id: crypto.randomUUID(),
      material_id: materialId,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size: file.size,
      version: nextVersion,
      storage_path: storageRef,
      storage_ref: storageRef,
    });

  if (fileInsertError) {
    return { error: `Failed to register version ${nextVersion}: ${fileInsertError.message}` };
  }

  // If requested to sync new version across all linked branches
  const linkedIdsRaw = formData.get("linkedMaterialIds") as string;
  let linkedMaterialIds: string[] = [];
  if (linkedIdsRaw) {
    try { linkedMaterialIds = JSON.parse(linkedIdsRaw); } catch {}
  }

  if (linkedMaterialIds && linkedMaterialIds.length > 0) {
    for (const linkedId of linkedMaterialIds) {
      if (linkedId === materialId) continue;
      try {
        await supabase
          .from("material_files")
          .insert({
            id: crypto.randomUUID(),
            material_id: linkedId,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            size: file.size,
            version: nextVersion,
            storage_path: storageRef,
            storage_ref: storageRef,
          });
        revalidateMaterialCaches(linkedId);
      } catch (err) {
        console.warn("Linked material file update notice:", err);
      }
    }
  }

  revalidateMaterialCaches(materialId);
  return { success: true };
}

// Get Signed URL for Faculty Preview/Download
export async function getFacultyFilePreviewUrl(storageRef: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase.storage
    .from("materials")
    .createSignedUrl(storageRef, 600);

  if (error || !data) {
    return { error: error?.message || "Failed to generate preview URL." };
  }

  return { previewUrl: data.signedUrl };
}
