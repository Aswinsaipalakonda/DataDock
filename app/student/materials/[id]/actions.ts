"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { saveServerActivityEvent } from "@/utils/activity-store";

// Helper to determine student roll number
function extractRollNumber(user: any): string {
  const email = (user?.email || "").toLowerCase();
  if (user?.user_metadata?.roll_number) return user.user_metadata.roll_number.toUpperCase();
  if (email.includes("@")) {
    const prefix = email.split("@")[0].toUpperCase();
    if (/^\d{5}[A-Z0-9]{5}$/i.test(prefix) || prefix.startsWith("23") || prefix.startsWith("24") || prefix.startsWith("25")) {
      return prefix;
    }
  }
  return user?.id ? `STU-${String(user.id).slice(0, 8)}` : "STUDENT";
}

function isFacultyOrAdmin(user: any): boolean {
  const role = (user?.user_metadata?.role as string) || "";
  const email = (user?.email || "").toLowerCase();
  return (
    role === "faculty" ||
    role === "admin" ||
    email.startsWith("faculty") ||
    email.startsWith("testfaculty") ||
    email.startsWith("admin")
  );
}

// Toggle Bookmark Status for a Material
export async function toggleBookmark(materialId: string, currentStatus: boolean) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const cookieVal = cookieStore.get("de_saved_bookmarks")?.value;
  let savedList: string[] = [];
  if (cookieVal) {
    try { savedList = JSON.parse(cookieVal); } catch {}
  } else {
    // Read from DB
    const { data: dbBm } = await supabase
      .from("bookmarks")
      .select("material_id")
      .eq("user_id", user.id);
    if (dbBm && Array.isArray(dbBm)) {
      savedList = dbBm.map((b) => b.material_id);
    }
  }

  if (currentStatus) {
    savedList = savedList.filter((id) => id !== materialId);
    await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("material_id", materialId);
  } else {
    if (!savedList.includes(materialId)) {
      savedList.push(materialId);
    }
    await supabase
      .from("bookmarks")
      .upsert({
        user_id: user.id,
        material_id: materialId,
      }, { onConflict: "user_id,material_id" });
  }

  cookieStore.set("de_saved_bookmarks", JSON.stringify(savedList), { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/student");
  revalidatePath("/student/bookmarks");
  revalidatePath(`/student/materials/${materialId}`);
  return { success: true, count: savedList.length };
}

// Log Material View Event
export async function trackMaterialPageView(materialId: string, materialTitle?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Never log views for faculty or admin members
  if (isFacultyOrAdmin(user)) {
    return { success: true, ignored: true };
  }

  const roll = extractRollNumber(user);
  const email = user.email || `${roll.toLowerCase()}@mvgrce.edu.in`;
  const name = user.user_metadata?.name || `Student ${roll}`;

  // 1. Save directly to server persistent store
  saveServerActivityEvent({
    id: `ev-view-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: "view",
    actor_id: user.id,
    target_id: materialId,
    actor_roll: roll,
    actor_name: name,
    actor_email: email,
    action_detail: "Viewed Material Workspace",
    created_at: new Date().toISOString(),
  });

  // 2. Also try inserting to Supabase activity_events
  try {
    await supabase.from("activity_events").insert({
      type: "view",
      actor_id: user.id,
      target_id: materialId,
      metadata: {
        action: "material_page_view",
        material_title: materialTitle || "Course Study Material",
        roll_number: roll,
        email: email,
        student_name: name,
      },
    });
  } catch {}

  revalidatePath("/admin/analytics");
  revalidatePath("/faculty/materials");
  return { success: true };
}

// Log Download Activity and Get Storage Link
export async function trackDownloadAndGetUrl(fileId: string, materialId: string, storageRef: string, fileName?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const targetFileName = fileName || "Study Document";

  // Only log download activity event if the actor is a student
  if (!isFacultyOrAdmin(user)) {
    const roll = extractRollNumber(user);
    const email = user.email || `${roll.toLowerCase()}@mvgrce.edu.in`;
    const name = user.user_metadata?.name || `Student ${roll}`;

    // 1. Save directly to server persistent store
    saveServerActivityEvent({
      id: `ev-dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: "download",
      actor_id: user.id,
      target_id: materialId,
      actor_roll: roll,
      actor_name: name,
      actor_email: email,
      file_id: fileId,
      file_name: targetFileName,
      action_detail: `Downloaded: ${targetFileName}`,
      created_at: new Date().toISOString(),
    });

    // 2. Also try inserting to Supabase activity_events
    try {
      await supabase.from("activity_events").insert({
        type: "download",
        actor_id: user.id,
        target_id: materialId,
        metadata: {
          file_id: fileId,
          file_name: targetFileName,
          action: "file_download",
          roll_number: roll,
          email: email,
          student_name: name,
        },
      });
    } catch {}

    revalidatePath("/admin/analytics");
    revalidatePath("/faculty/materials");
  }

  // If storageRef is mock "#", provide fallback
  if (!storageRef || storageRef === "#") {
    return { error: "No physical file attached to this reference." };
  }

  // Get signed URL or API route for the protected file
  const downloadUrl = `/api/materials/file/${storageRef}?download=1&filename=${encodeURIComponent(targetFileName)}`;
  return { downloadUrl };
}

// Log Preview Activity and Get Storage Link for In-Browser Viewing
export async function trackPreviewAndGetUrl(fileId: string, materialId: string, storageRef: string, fileName?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const targetFileName = fileName || "Study Document";

  // Only log preview activity event if the actor is a student
  if (!isFacultyOrAdmin(user)) {
    const roll = extractRollNumber(user);
    const email = user.email || `${roll.toLowerCase()}@mvgrce.edu.in`;
    const name = user.user_metadata?.name || `Student ${roll}`;

    // 1. Save directly to server persistent store
    saveServerActivityEvent({
      id: `ev-prev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: "view",
      actor_id: user.id,
      target_id: materialId,
      actor_roll: roll,
      actor_name: name,
      actor_email: email,
      file_id: fileId,
      file_name: targetFileName,
      action_detail: `Previewed: ${targetFileName}`,
      created_at: new Date().toISOString(),
    });

    // 2. Also try inserting to Supabase activity_events
    try {
      await supabase.from("activity_events").insert({
        type: "view",
        actor_id: user.id,
        target_id: materialId,
        metadata: {
          file_id: fileId,
          file_name: targetFileName,
          action: "file_preview",
          mode: "preview_modal",
          roll_number: roll,
          email: email,
          student_name: name,
        },
      });
    } catch {}

    revalidatePath("/admin/analytics");
    revalidatePath("/faculty/materials");
  }

  if (!storageRef || storageRef === "#") {
    return { error: "No physical file attached to this reference." };
  }

  const previewUrl = `/api/materials/file/${storageRef}?filename=${encodeURIComponent(targetFileName)}`;
  return { previewUrl };
}
