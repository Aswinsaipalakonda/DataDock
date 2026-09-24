"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function changePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Both password fields are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Validate session exists
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Unauthorized request. Please log in again." };
  }

  // Derive registration number to prevent password matching it
  const regNo = (user.email || "").split("@")[0].toUpperCase();
  const ROLL_PATTERN_REGEX = /(^|[^0-9A-Z])\d{4}[A-Z]\d{4}([^0-9A-Z]|$)/i;

  if (ROLL_PATTERN_REGEX.test(password) || password.toUpperCase() === regNo) {
    return {
      error: "New password cannot be a college registration number or match the default roll number pattern.",
    };
  }

  // Run server-side validations
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
    return { error: "Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols." };
  }

  // Update password in Supabase Auth
  const { error: updateError } = await supabase.auth.updateUser({
    password: password,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  // Update public users profile status
  const { error: profileError } = await supabase
    .from("users")
    .update({ first_login_pending: false })
    .eq("id", user.id);

  if (profileError) {
    return { error: "Password changed in auth system, but failed to update profile status. Please contact support." };
  }

  // Redirect to portal root
  redirect("/");
}
