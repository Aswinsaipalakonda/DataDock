"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAuditAction } from "@/utils/audit-logger";

// Register a single user and create their profile
export async function createUserAction(
  email: string,
  name: string,
  role: "student" | "faculty" | "admin",
  branch: string | null,
  semester: number | null,
  section?: string | null,
  designation?: string | null,
  rollNumber?: string | null,
  phone?: string | null
) {
  const cookieStore = await cookies();
  const adminClient = createServerClient(cookieStore);

  // 1. Verify admin permissions
  const { data: { user: adminUser } } = await adminClient.auth.getUser();
  if (!adminUser) return { error: "Unauthorized" };

  const { data: adminProfile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", adminUser.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return { error: "Permission denied." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const formattedRollNumber = rollNumber ? rollNumber.toUpperCase().trim() : null;
  const cleanPhone = phone ? phone.replace(/\D/g, "").slice(0, 10) : null;

  // Validation constraints
  if (role === "student") {
    if (!formattedRollNumber || !/^\d{2}33[0-9A-Z]{6}$/i.test(formattedRollNumber)) {
      return { error: "Please enter a valid 10-digit MVGR roll number (e.g. 23331A4205)." };
    }
  }

  if (role === "faculty") {
    if (!cleanPhone || cleanPhone.length !== 10) {
      return { error: "Contact Mobile Number must be exactly 10 digits." };
    }
  }

  // 2. Check for duplicate roll number or email before creating
  if (role === "student" && formattedRollNumber) {
    const { data: existingRoll } = await adminClient
      .from("users")
      .select("id, name, roll_number, email")
      .or(`roll_number.eq.${formattedRollNumber},email.ilike.${formattedRollNumber}@%`)
      .limit(1);

    if (existingRoll && existingRoll.length > 0) {
      return { error: `the number already exists` };
    }
  }

  const { data: existingEmail } = await adminClient
    .from("users")
    .select("id, name, email")
    .eq("email", normalizedEmail)
    .limit(1);

  if (existingEmail && existingEmail.length > 0) {
    return { error: `An account with email ${normalizedEmail} already exists.` };
  }

  // 3. Register user using admin client
  const defaultPassword = 
    role === "student" && formattedRollNumber 
      ? formattedRollNumber 
      : (role === "faculty" && phone && phone.trim().length >= 4 
          ? `MVGRDE@${phone.trim().slice(-4)}` 
          : "Password@789");

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: defaultPassword,
    user_metadata: {
      name: name.trim(),
      role,
      roll_number: formattedRollNumber,
    },
  });

  if (authError || !authData.user) {
    return { error: `Auth registration failed: ${authError?.message}` };
  }

  // 4. Create Profile in public.users
  const profilePayload: Record<string, unknown> = {
    id: authData.user.id,
    email: normalizedEmail,
    name: name.trim(),
    role,
    status: "active",
    branch: role === "student" 
      ? (branch || (formattedRollNumber?.includes("47") ? "CIC" : (formattedRollNumber?.includes("44") || formattedRollNumber?.includes("05")) ? "CSD" : formattedRollNumber?.includes("42") ? "CSM" : "CIC"))
      : (branch === "ALL" ? null : (branch || null)),
    current_semester: role === "student" ? (semester || 3) : null,
    section: role === "student" ? (section ? section.toUpperCase().trim() : "A") : null,
    designation: role === "faculty" ? (designation ? designation.trim() : "Assistant Professor") : null,
    phone: role === "faculty" || role === "admin" ? (phone ? phone.trim() : null) : null,
    roll_number: role === "student" ? formattedRollNumber : null,
    first_login_pending: false,
  };

  let { data: profileData, error: profileError } = await adminClient
    .from("users")
    .upsert(profilePayload)
    .select()
    .single();

  // Schema resilience retry if optional columns are absent in DB
  if (profileError) {
    delete profilePayload.section;
    delete profilePayload.designation;
    delete profilePayload.roll_number;
    const retry = await adminClient.from("users").upsert(profilePayload).select().single();
    profileData = retry.data;
    profileError = retry.error;
  }

  if (profileError) {
    return { error: `Profile creation failed: ${profileError.message}` };
  }

  await logAuditAction("CREATE_USER", normalizedEmail, null, { name, role, branch: profilePayload.branch, semester: profilePayload.current_semester, section: profilePayload.section, designation: profilePayload.designation, rollNumber: formattedRollNumber });

  revalidatePath("/admin/users");
  revalidatePath("/admin/analytics");
  revalidatePath("/faculty/materials");
  return { success: true, user: profileData };
}

// Update an existing user
export async function updateUserAction(
  userId: string,
  updates: {
    name: string;
    role: "student" | "faculty" | "admin";
    branch: string | null;
    semester: number | null;
    section: string | null;
    designation: string | null;
    phone?: string | null;
    rollNumber?: string | null;
    status: "active" | "deactivated";
  }
) {
  const cookieStore = await cookies();
  const adminClient = createServerClient(cookieStore);

  const { data: { user: adminUser } } = await adminClient.auth.getUser();
  if (!adminUser) return { error: "Unauthorized" };

  const { data: adminProfile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", adminUser.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return { error: "Permission denied." };
  }

  const isStudent = updates.role === "student";
  const isFaculty = updates.role === "faculty";

  let formattedRollNumber: string | null = null;
  if (isStudent && updates.rollNumber) {
    formattedRollNumber = updates.rollNumber.toUpperCase().trim();
    if (!/^\d{2}33[0-9A-Z]{6}$/.test(formattedRollNumber)) {
      return { error: `Invalid Roll Number format "${formattedRollNumber}". Must be 10 characters matching college standard (e.g., 23331A4745).` };
    }
  }

  let sanitizedPhone: string | null = null;
  if (updates.phone !== undefined && updates.phone !== null && updates.phone.trim() !== "") {
    sanitizedPhone = updates.phone.replace(/\D/g, "").trim();
    if (sanitizedPhone.length !== 10) {
      return { error: `Mobile number must be exactly 10 digits (received ${sanitizedPhone.length} digits).` };
    }
  }

  const updatePayload: Record<string, unknown> = {
    name: updates.name.trim(),
    role: updates.role,
    status: updates.status,
    branch: isStudent ? (updates.branch || null) : (updates.branch || null),
    current_semester: isStudent ? (updates.semester || null) : null,
    section: isStudent ? (updates.section ? updates.section.toUpperCase().trim() : "A") : null,
    designation: isFaculty ? (updates.designation ? updates.designation.trim() : "Assistant Professor") : null,
    phone: updates.phone !== undefined ? sanitizedPhone : undefined,
    roll_number: isStudent ? formattedRollNumber : null,
  };

  // Remove undefined properties
  Object.keys(updatePayload).forEach((k) => updatePayload[k] === undefined && delete updatePayload[k]);

  let { data: profileData, error: updateError } = await adminClient
    .from("users")
    .update(updatePayload)
    .eq("id", userId)
    .select()
    .single();

  if (updateError) {
    delete updatePayload.section;
    delete updatePayload.designation;
    delete updatePayload.roll_number;
    const retry = await adminClient.from("users").update(updatePayload).eq("id", userId).select().single();
    profileData = retry.data;
    updateError = retry.error;
  }

  if (updateError) {
    return { error: `Update failed: ${updateError.message}` };
  }

  await logAuditAction("UPDATE_USER", userId, null, updates);

  revalidatePath("/admin/users");
  revalidatePath("/admin/analytics");
  revalidatePath("/faculty/materials");
  return { success: true, user: profileData };
}

import { createAdminClient } from "@/utils/supabase/admin";

// Reset User Password by Admin Action
export async function adminResetUserPassword(userId: string, email: string) {
  const cookieStore = await cookies();
  const adminClient = createServerClient(cookieStore);

  const { data: { user: adminUser } } = await adminClient.auth.getUser();
  if (!adminUser) return { error: "Unauthorized" };

  const { data: adminProfile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", adminUser.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return { error: "Permission denied. Only System Administrators can reset user passwords." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find user to determine role and appropriate default password
  const { data: targetUser } = await adminClient
    .from("users")
    .select("role, roll_number, phone, email")
    .or(`id.eq.${userId},email.eq.${normalizedEmail}`)
    .single();

  const targetPhoneDigits = targetUser?.phone ? targetUser.phone.replace(/\D/g, '') : '';
  const targetRoll = (targetUser?.roll_number || (targetUser?.email?.includes('@') ? targetUser.email.split('@')[0] : '')).toUpperCase().trim();

  const defaultPassword = 
    targetUser?.role === "student" && targetRoll
      ? targetRoll
      : targetUser?.role === "faculty" && targetPhoneDigits.length >= 4
      ? `MVGRDE@${targetPhoneDigits.slice(-4)}`
      : "Password@789";

  // 1. Reset password via admin client
  const { client: adminAuthClient } = createAdminClient();
  await adminAuthClient.auth.admin.updateUserById(userId, {
    password: defaultPassword,
  });
  const authUpdated = true;

  // 3. Update public.users record
  await adminClient
    .from("users")
    .update({ 
      first_login_pending: true,
      status: "active",
      updated_at: new Date().toISOString()
    })
    .or(`id.eq.${userId},email.eq.${normalizedEmail}`);

  // 4. Record Security Audit Log
  await logAuditAction("ADMIN_RESET_PASSWORD", email, { userId }, {
    new_default_password: defaultPassword,
    reset_by: adminUser.email,
    auth_credentials_synced: authUpdated,
    timestamp: new Date().toISOString()
  });

  revalidatePath("/admin/users");
  return { 
    success: true, 
    defaultPassword,
    message: `Password for ${email} has been reset to "${defaultPassword}".`
  };
}

// Delete user profile
export async function deleteUserAction(userId: string, email: string) {
  const cookieStore = await cookies();
  const adminClient = createServerClient(cookieStore);

  const { data: { user: adminUser } } = await adminClient.auth.getUser();
  if (!adminUser) return { error: "Unauthorized" };

  const { data: adminProfile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", adminUser.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return { error: "Permission denied." };
  }

  if (userId === adminUser.id) {
    return { error: "Cannot delete your own administrator account." };
  }

  const { error: deleteError } = await adminClient
    .from("users")
    .delete()
    .eq("id", userId);

  if (deleteError) {
    return { error: `Delete failed: ${deleteError.message}` };
  }

  // Also remove from auth.users if service key is present
  const { client: adminAuthClient, hasServiceKey } = createAdminClient();
  if (hasServiceKey) {
    try {
      await adminAuthClient.auth.admin.deleteUser(userId);
    } catch (authDelErr) {
      console.warn("Auth user deletion warning:", authDelErr);
    }
  }

  await logAuditAction("DELETE_USER", email, { id: userId }, null);

  revalidatePath("/admin/users");
  return { success: true };
}

// Batch Create Users (from CSV Roster)
export async function batchCreateUsersAction(
  usersList: {
    email: string;
    name: string;
    role: "student" | "faculty" | "admin";
    branch: string | null;
    semester: number | null;
    section?: string | null;
    designation?: string | null;
    phone?: string | null;
    rollNumber?: string | null;
  }[]
) {
  const cookieStore = await cookies();
  const adminClient = createServerClient(cookieStore);

  const { data: { user } } = await adminClient.auth.getUser();
  if (!user) {
    return { successCount: 0, failCount: usersList.length, errors: ["Unauthorized: please log in."], error: "Unauthorized" };
  }

  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { successCount: 0, failCount: usersList.length, errors: ["Permission denied. Admin privileges required."], error: "Permission denied." };
  }

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const item of usersList) {
    try {
      const defaultPassword = item.role === "student" && item.rollNumber 
        ? item.rollNumber.toUpperCase().trim() 
        : (item.role === "faculty" && item.phone && item.phone.trim().length >= 4 
            ? `MVGRDE@${item.phone.trim().slice(-4)}` 
            : "Password@789");

      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email: item.email.trim().toLowerCase(),
        password: defaultPassword,
        user_metadata: {
          name: item.name.trim(),
          role: item.role,
          phone: item.phone ? item.phone.trim() : null,
          designation: item.designation ? item.designation.trim() : null,
        },
      });

      let userId = authData?.user?.id;

      if (authErr || !userId) {
        const { data: existingUser } = await adminClient
          .from("users")
          .select("id")
          .eq("email", item.email.trim().toLowerCase())
          .single();

        if (existingUser) {
          userId = existingUser.id;
        } else {
          failCount++;
          errors.push(`${item.email}: ${authErr?.message || "Sign up failed"}`);
          continue;
        }
      }

      const isStudent = item.role === "student";
      const isFaculty = item.role === "faculty";
      const formattedRoll = isStudent && item.rollNumber ? item.rollNumber.toUpperCase().trim() : null;

      let studentBranch = item.branch ? item.branch.trim().toUpperCase() : null;
      if (studentBranch === "ICB") studentBranch = "CIC";
      if (!studentBranch && formattedRoll) {
        if (formattedRoll.includes("47")) studentBranch = "CIC";
        else if (formattedRoll.includes("44") || formattedRoll.includes("05")) studentBranch = "CSD";
        else if (formattedRoll.includes("42")) studentBranch = "CSM";
        else studentBranch = "CIC";
      }

      const academicYear = isStudent && formattedRoll && formattedRoll.length >= 2
        ? parseInt("20" + formattedRoll.slice(0, 2), 10)
        : null;

      const rowPayload: Record<string, unknown> = {
        id: userId,
        email: item.email.trim().toLowerCase(),
        name: item.name.trim(),
        role: item.role,
        status: "active",
        branch: isStudent ? (studentBranch || "CIC") : (item.branch === "ICB" ? "CIC" : item.branch || null),
        academic_year: academicYear,
        current_semester: isStudent ? (item.semester || 1) : null,
        section: isStudent ? (item.section ? item.section.toUpperCase().trim() : "A") : null,
        designation: isFaculty ? (item.designation ? item.designation.trim() : "Assistant Professor") : null,
        phone: item.phone ? item.phone.trim() : null,
        roll_number: formattedRoll,
        first_login_pending: false,
      };

      let { error: profileError } = await adminClient.from("users").upsert(rowPayload);

      if (profileError) {
        delete rowPayload.academic_year;
        delete rowPayload.section;
        delete rowPayload.designation;
        delete rowPayload.roll_number;
        const retry = await adminClient.from("users").upsert(rowPayload);
        profileError = retry.error;
      }

      if (profileError) {
        failCount++;
        errors.push(`${item.email}: Profile insert - ${profileError.message}`);
      } else {
        successCount++;
      }
    } catch (err: unknown) {
      failCount++;
      errors.push(`${item.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  await logAuditAction("BATCH_CREATE_USERS", "csv_import", null, { successCount, failCount });

  revalidatePath("/admin/users");
  return { successCount, failCount, errors };
}

// Reset User Status / Lock account
export async function toggleUserStatus(userId: string, currentStatus: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Permission denied." };
  }

  const nextStatus = currentStatus === "active" ? "deactivated" : "active";

  const { error } = await supabase
    .from("users")
    .update({ status: nextStatus })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logAuditAction("TOGGLE_USER_STATUS", userId, { status: currentStatus }, { status: nextStatus });

  revalidatePath("/admin/users");
  return { success: true };
}

// Bulk promote students to next semester (e.g., promote all Sem 3 in CIC -> Sem 4)
export async function bulkPromoteStudentsSemesterAction(
  fromSemester: number,
  toSemester: number,
  branchFilter?: string
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Permission denied." };
  }

  let query = supabase
    .from("users")
    .update({ current_semester: toSemester })
    .eq("role", "student")
    .eq("current_semester", fromSemester);

  if (branchFilter && branchFilter !== "ALL") {
    query = query.eq("branch", branchFilter);
  }

  const { error } = await query;
  if (error) return { error: error.message };

  await logAuditAction("BULK_PROMOTE_SEMESTER", `Sem ${fromSemester} -> Sem ${toSemester}`, null, {
    fromSemester,
    toSemester,
    branchFilter: branchFilter || "ALL",
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/analytics");
  revalidatePath("/student");
  revalidatePath("/student/subjects");
  return { success: true };
}

// Bulk permanently delete students (Academic Year-End Cleanup)
export async function bulkDeleteStudentsAction(
  userIds: string[],
  semester: number,
  branch?: string
) {
  if (!userIds || userIds.length === 0) {
    return { error: "No students selected for deletion." };
  }

  const cookieStore = await cookies();
  const adminClient = createServerClient(cookieStore);

  const { data: { user: adminUser } } = await adminClient.auth.getUser();
  if (!adminUser) return { error: "Unauthorized" };

  const { data: adminProfile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", adminUser.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return { error: "Permission denied." };
  }

  // Never allow deleting the administrator
  const sanitizedUserIds = userIds.filter((id) => id !== adminUser.id);
  if (sanitizedUserIds.length === 0) {
    return { error: "Cannot delete administrator accounts." };
  }

  // 1. Delete user profiles from users table in batches
  const CHUNK_SIZE = 50;
  for (let i = 0; i < sanitizedUserIds.length; i += CHUNK_SIZE) {
    const chunk = sanitizedUserIds.slice(i, i + CHUNK_SIZE);
    const { error: dbDeleteError } = await adminClient
      .from("users")
      .delete()
      .in("id", chunk);

    if (dbDeleteError) {
      console.error("Batch delete users error:", dbDeleteError);
      return { error: `Batch delete failed: ${dbDeleteError.message}` };
    }
  }

  // 2. Delete authentication records so portal access is permanently revoked
  const { client: adminAuthClient, hasServiceKey } = createAdminClient();
  if (hasServiceKey) {
    await Promise.allSettled(
      sanitizedUserIds.map((id) => adminAuthClient.auth.admin.deleteUser(id))
    );
  }

  await logAuditAction(
    "YEAR_END_COHORT_BULK_DELETE",
    `Sem ${semester} (${branch || "ALL"})`,
    null,
    {
      deletedCount: sanitizedUserIds.length,
      semester,
      branch: branch || "ALL",
      deletedIds: sanitizedUserIds,
    }
  );

  revalidatePath("/admin/users");
  revalidatePath("/admin/analytics");
  revalidatePath("/student");
  revalidatePath("/student/subjects");

  return { success: true, count: sanitizedUserIds.length };
}

