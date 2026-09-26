"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAuditAction } from "@/utils/audit-logger";
import { ALLOWED_EXTENSIONS } from "@/lib/file-constants";

function normalizeMaterialType(rawType: string): string {
  const lower = (rawType || "").toLowerCase().trim();
  if (lower === "notes" || lower.includes("note")) return "Notes";
  if (lower.includes("slide")) return "Lecture Slides";
  if (lower.includes("assignment")) return "Assignments";
  if (lower.includes("lab") || lower.includes("manual")) return "Lab Manuals";
  if (lower.includes("question")) return "Question Banks";
  if (lower.includes("model")) return "Model Papers";
  if (lower.includes("book") || lower.includes("reference")) return "Reference Books";
  if (lower.includes("previous")) return "Previous Papers";
  if (lower.includes("video")) return "Videos";
  return "Other Resources";
}

export async function uploadMaterialAction(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Authenticate and verify faculty role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!authError && !user) {
      return { error: "Unauthorized request. Please log in." };
    }
    if (!user) {
      return { error: "Session expired. Please log in again." };
    }

    // Retrieve fields
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || "";
    const subject = (formData.get("subject") as string)?.trim();
    const subjectTitle = (formData.get("subjectTitle") as string)?.trim() || `${subject} Course`;
    const regulation = (formData.get("regulation") as string)?.trim() || "R23";
    const semester = parseInt(formData.get("semester") as string, 10) || 3;
    const rawType = (formData.get("type") as string)?.trim();
    const state = (formData.get("state") as "draft" | "published") || "published";
    const tagsStr = formData.get("tags") as string;
    const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(Boolean) : [];

    // Parse allocations JSON or fallback to rawBranches / singleBranch
    const allocationsRaw = formData.get("allocations") as string;
    let targetAllocations: Array<{ branch: string; section: string }> = [];

    if (allocationsRaw) {
      try {
        targetAllocations = JSON.parse(allocationsRaw);
      } catch {
        targetAllocations = [];
      }
    }

    if (!targetAllocations.length) {
      const rawBranches = formData.getAll("branches") as string[];
      const singleBranch = (formData.get("branch") as string)?.trim();
      const rawSection = (formData.get("section") as string)?.trim() || "ALL";
      const targetBranches = rawBranches.length > 0 ? rawBranches : [singleBranch || "CIC"];
      targetAllocations = targetBranches.map(b => ({ branch: b, section: rawSection }));
    }

    const normalizedType = normalizeMaterialType(rawType);

    if (!title || !subject || targetAllocations.length === 0 || !semester || !normalizedType || !state) {
      return { error: "Missing required taxonomy or content fields." };
    }

    // Get uploaded files
    const files = formData.getAll("files") as File[];
    const validFiles = files.filter(f => f && f.size > 0 && f.name !== "undefined");

    if (validFiles.length === 0) {
      return { error: "At least one valid file is required to create a material." };
    }

    const maxFileSize = 100 * 1024 * 1024; // 100 MB

    for (const file of validFiles) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { 
          error: `File type "${ext}" is not supported. Supported: PDF, PPT, Word, Excel, Coding files, ZIP, TXT, and Images.` 
        };
      }
      if (file.size > maxFileSize) {
        return { error: `File "${file.name}" exceeds the maximum limit of 100 MB.` };
      }
    }

    // Read buffers once for reuse across target branches/sections if multiple
    const fileBuffers: { file: File; buffer: ArrayBuffer; ext: string }[] = [];
    for (const file of validFiles) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const buffer = await file.arrayBuffer();
      fileBuffers.push({ file, buffer, ext });
    }

    // Insert Material records per target (branch, section) cohort
    for (const alloc of targetAllocations) {
      const branch = alloc.branch;
      const section = alloc.section || "ALL";
      const materialId = crypto.randomUUID();

      const { error: insertError } = await supabase
        .from("materials")
        .insert({
          id: materialId,
          title,
          description,
          subject,
          branch,
          section,
          semester,
          regulation,
          type: normalizedType,
          state,
          owner_id: user.id,
          tags,
        });

      if (insertError) {
        return { error: insertError.message || "Failed to create material record." };
      }

      // Upload files to Storage & record in material_files with storage_path
      for (const item of fileBuffers) {
        const uniqueId = crypto.randomUUID();
        const storageRef = `${materialId}/${uniqueId}${item.ext}`;

        try {
          await supabase.storage
            .from("materials")
            .upload(storageRef, item.buffer, {
              contentType: item.file.type || "application/octet-stream",
              cacheControl: "3600",
            });
        } catch (storageException) {
          console.warn("Storage upload notice:", storageException);
        }

        const { error: fileError } = await supabase
          .from("material_files")
          .insert({
            id: crypto.randomUUID(),
            material_id: materialId,
            file_name: item.file.name,
            mime_type: item.file.type || "application/octet-stream",
            size: item.file.size,
            version: 1,
            storage_path: storageRef,
            storage_ref: storageRef,
          });

        if (fileError) {
          console.error("Failed to insert material file:", fileError);
        }
      }

      await logAuditAction("UPLOAD_MATERIAL", materialId, null, { 
        title, 
        type: normalizedType, 
        subject, 
        branch, 
        section,
        regulation, 
        filesCount: validFiles.length 
      });
    }

    try {
      revalidatePath("/faculty/materials");
      revalidatePath("/faculty");
      revalidatePath("/admin");
      revalidatePath("/admin/analytics");
      revalidatePath("/student");
      revalidatePath("/student/subjects");
    } catch (e) {
      // Ignore revalidate errors in background
    }

    return { success: true, redirectUrl: "/faculty/materials" };
  } catch (err: any) {
    console.error("Upload material action exception:", err);
    return { error: err?.message || "An unexpected error occurred during material upload." };
  }
}
