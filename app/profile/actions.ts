"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditAction } from "@/utils/audit-logger";

export async function updatePasswordAction(password: string) {
  if (!password || password.trim().length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized session. Please log in again." };
  }

  // Prevent setting password equal to email username
  const emailPrefix = user.email ? user.email.split("@")[0].toLowerCase() : "";
  if (emailPrefix && password.toLowerCase() === emailPrefix) {
    return { error: "For security reasons, your new password cannot match your email prefix or roll number." };
  }

  // Update password in Supabase Auth
  const { error: updateError } = await supabase.auth.updateUser({
    password: password.trim(),
  });

  if (updateError) {
    return { error: updateError.message || "Failed to update password. Please try again." };
  }

  // Clear first_login_pending flag in public.users
  await supabase
    .from("users")
    .update({ 
      first_login_pending: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id);

  // Record Security Audit Log
  await logAuditAction("USER_UPDATE_PASSWORD", user.email || user.id, { userId: user.id }, {
    updated_at: new Date().toISOString(),
    action: "SELF_PASSWORD_CHANGE"
  });

  revalidatePath("/student/profile");
  revalidatePath("/faculty/profile");
  revalidatePath("/admin/profile");
  revalidatePath("/profile");

  return { success: true, message: "Password updated successfully!" };
}

export async function signOutUserAction() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  try {
    await supabase.auth.signOut();
  } catch {}
  cookieStore.set("de_token", "", { maxAge: 0, path: "/", expires: new Date(0) });
  cookieStore.delete("de_token");
  cookieStore.set("__Secure-session", "", { maxAge: 0, path: "/", expires: new Date(0) });
  cookieStore.delete("__Secure-session");
  cookieStore.set("__Host-session", "", { maxAge: 0, path: "/", expires: new Date(0) });
  cookieStore.delete("__Host-session");
  redirect("/login");
}
