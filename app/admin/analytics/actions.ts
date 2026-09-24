"use server";

import { logAuditAction } from "@/utils/audit-logger";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

function revalidateAllCaches(materialId?: string) {
  revalidatePath("/admin/analytics");
  revalidatePath("/admin");
  revalidatePath("/faculty/materials");
  revalidatePath("/faculty");
  revalidatePath("/student");
  revalidatePath("/student/subjects");
  if (materialId) {
    revalidatePath(`/student/materials/${materialId}`);
  }
}

export async function logExportEvent(reportType: string, recordCount: number) {
  await logAuditAction(
    `export_${reportType}`,
    `export_${reportType}_${Date.now()}`,
    null,
    { reportType, recordCount, exported_at: new Date().toISOString() }
  );

  return { success: true };
}

// Admin: Delete Material (soft delete, supporting linked branches)
export async function adminDeleteMaterial(materialId: string, linkedIds?: string[]) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") {
    return { error: "Unauthorized. Admin privileges required." };
  }

  const idsToDelete = linkedIds && linkedIds.length > 0 ? linkedIds : [materialId];

  for (const id of idsToDelete) {
    // Get material details for audit log
    const { data: mat } = await supabase
      .from("materials")
      .select("id, title, subject, branch, semester")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("materials")
      .update({ state: "deleted" })
      .eq("id", id);

    if (error) return { error: error.message };

    await logAuditAction(
      "ADMIN_DELETE_MATERIAL",
      id,
      user.id,
      {
        material_id: id,
        material_title: mat?.title,
        subject: mat?.subject,
        deleted_by_admin: user.email,
      }
    );

    revalidateAllCaches(id);
  }

  return { success: true };
}

// Admin: Delete a Mistakenly Uploaded File inside a Material
export async function adminDeleteMaterialFile(materialId: string, fileId: string, storageRef?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") {
    return { error: "Unauthorized. Admin privileges required." };
  }

  const { data: fileRecord } = await supabase
    .from("material_files")
    .select("id, file_name, storage_ref, storage_path, material_id")
    .eq("id", fileId)
    .single();

  if (!fileRecord) {
    return { error: "File record not found." };
  }

  // Delete from database
  await supabase
    .from("material_files")
    .delete()
    .eq("id", fileId);

  // Physically remove from storage
  const ref = storageRef || fileRecord.storage_path || fileRecord.storage_ref;
  if (ref) {
    try {
      await supabase.storage.from("materials").remove([ref]);
    } catch (e) {
      console.warn("Storage removal notice:", e);
    }
  }

  await logAuditAction(
    "ADMIN_DELETE_MATERIAL_FILE",
    fileId,
    user.id,
    {
      material_id: materialId,
      file_id: fileId,
      file_name: fileRecord.file_name,
      deleted_by_admin: user.email,
    }
  );

  revalidateAllCaches(materialId);
  return { success: true };
}



