"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAuditAction } from "@/utils/audit-logger";

// Create a new regulation (e.g. R23, R24, A2)
export async function createRegulationAction(code: string, name: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const formattedCode = code.toUpperCase().trim();
  const formattedName = name.trim() || `${formattedCode} Autonomous Regulation`;

  const { error } = await supabase
    .from("regulations")
    .insert({
      code: formattedCode,
      name: formattedName,
      active: true
    });

  if (error) return { error: error.message };

  await logAuditAction("CREATE_REGULATION", formattedCode, null, { name: formattedName });

  revalidatePath("/admin/taxonomy");
  revalidatePath("/faculty/upload");
  return { success: true };
}

// Update an existing regulation
export async function updateRegulationAction(
  originalCode: string,
  updates: {
    code: string;
    name: string;
    active?: boolean;
  }
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const formattedCode = updates.code.toUpperCase().trim();
  const formattedName = updates.name.trim();

  // If code changed, check if new code already exists
  if (formattedCode !== originalCode) {
    const { data: existing } = await supabase
      .from("regulations")
      .select("code")
      .eq("code", formattedCode)
      .maybeSingle();

    if (existing) {
      return { error: `Regulation code "${formattedCode}" already exists.` };
    }
  }

  const { error } = await supabase
    .from("regulations")
    .update({
      code: formattedCode,
      name: formattedName,
      ...(updates.active !== undefined ? { active: updates.active } : {}),
    })
    .eq("code", originalCode);

  if (error) return { error: error.message };

  await logAuditAction("UPDATE_REGULATION", formattedCode, { originalCode }, updates);

  revalidatePath("/admin/taxonomy");
  revalidatePath("/faculty/upload");
  return { success: true };
}

// Toggle regulation active status
export async function toggleRegulationActiveAction(code: string, currentActive: boolean) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const { error } = await supabase
    .from("regulations")
    .update({ active: !currentActive })
    .eq("code", code);

  if (error) return { error: error.message };

  await logAuditAction("TOGGLE_REGULATION_STATUS", code, { active: currentActive }, { active: !currentActive });

  revalidatePath("/admin/taxonomy");
  revalidatePath("/faculty/upload");
  return { success: true };
}

// Delete a regulation (with mapped subjects safety check)
export async function deleteRegulationAction(code: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  // Safety check: verify no mapped subjects
  const { count } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true })
    .eq("regulation", code);

  if (count && count > 0) {
    return { 
      error: `Cannot delete regulation "${code}" because ${count} curriculum subject(s) are currently mapped to it. Reassign or delete those subjects first.` 
    };
  }

  const { error } = await supabase
    .from("regulations")
    .delete()
    .eq("code", code);

  if (error) return { error: error.message };

  await logAuditAction("DELETE_REGULATION", code, null, null);

  revalidatePath("/admin/taxonomy");
  revalidatePath("/faculty/upload");
  return { success: true };
}

// Create a new subject (Supports single branch or multiple branches simultaneously, with regulation)
export async function createSubjectAction(
  code: string,
  title: string,
  branches: string[] | string,
  semester: number,
  regulation: string = "R23"
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const branchList = (Array.isArray(branches) ? branches : [branches]).filter(Boolean);
  if (branchList.length === 0) {
    return { error: "Please select at least one branch for this subject." };
  }

  const formattedCode = code.toUpperCase().trim();
  const formattedTitle = title.trim();
  const formattedRegulation = (regulation || "R23").toUpperCase().trim();

  // Ensure regulation exists in regulations table
  await supabase
    .from("regulations")
    .upsert({
      code: formattedRegulation,
      name: `${formattedRegulation} Autonomous Regulation`,
      active: true
    }, { onConflict: "code" });

  const insertPayloads = branchList.map((branch) => ({
    code: formattedCode,
    title: formattedTitle,
    branch,
    semester,
    regulation: formattedRegulation,
    active: true
  }));

  // Perform multi-row insert/upsert
  let lastError: string | null = null;
  for (const item of insertPayloads) {
    const { error } = await supabase
      .from("subjects")
      .upsert(item, { onConflict: "code,branch,regulation" });

    if (error) {
      // Fallback try simple insert
      const retry = await supabase.from("subjects").insert(item);
      if (retry.error) {
        lastError = retry.error.message;
      }
    }
  }

  if (lastError && insertPayloads.length === 1) {
    return { error: lastError };
  }

  await logAuditAction("CREATE_SUBJECT", formattedCode, null, { 
    title: formattedTitle, 
    branches: branchList, 
    semester,
    regulation: formattedRegulation,
    count: branchList.length 
  });

  revalidatePath("/admin/taxonomy");
  revalidatePath("/student/subjects");
  revalidatePath("/faculty/upload");
  revalidatePath("/faculty/materials");
  return { success: true };
}

// Update an existing subject
export async function updateSubjectAction(
  originalCode: string,
  originalBranch: string,
  originalRegulation: string,
  updates: {
    code: string;
    title: string;
    branches?: string[];
    branch?: string;
    semester: number;
    regulation?: string;
    active: boolean;
    originalBranches?: string[];
  }
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const formattedCode = updates.code.toUpperCase().trim();
  const formattedTitle = updates.title.trim();
  const formattedRegulation = (updates.regulation || originalRegulation || "R23").toUpperCase().trim();
  const branchList = updates.branches && updates.branches.length > 0 
    ? updates.branches 
    : [updates.branch || originalBranch];

  // If single branch unchanged and code/regulation unchanged
  if (
    branchList.length === 1 && 
    branchList[0] === originalBranch && 
    originalCode === formattedCode &&
    originalRegulation === formattedRegulation
  ) {
    const { error } = await supabase
      .from("subjects")
      .update({
        code: formattedCode,
        title: formattedTitle,
        branch: branchList[0],
        semester: updates.semester,
        regulation: formattedRegulation,
        active: updates.active,
      })
      .eq("code", originalCode)
      .eq("branch", originalBranch)
      .eq("regulation", originalRegulation);

    if (error) return { error: error.message };
  } else {
    // Delete old records across original branches
    const oldBranches = updates.originalBranches && updates.originalBranches.length > 0
      ? updates.originalBranches
      : [originalBranch];

    for (const ob of oldBranches) {
      await supabase
        .from("subjects")
        .delete()
        .eq("code", originalCode)
        .eq("branch", ob)
        .eq("regulation", originalRegulation || "R23");
    }

    // Upsert new branch records
    for (const b of branchList) {
      await supabase.from("subjects").upsert({
        code: formattedCode,
        title: formattedTitle,
        branch: b,
        semester: updates.semester,
        regulation: formattedRegulation,
        active: updates.active,
      }, { onConflict: "code,branch,regulation" });
    }
  }

  await logAuditAction("UPDATE_SUBJECT", formattedCode, { originalCode, originalBranch, originalRegulation }, updates);

  revalidatePath("/admin/taxonomy");
  revalidatePath("/student/subjects");
  revalidatePath("/faculty/upload");
  revalidatePath("/faculty/materials");
  return { success: true };
}

// Delete a subject (single branch)
export async function deleteSubjectAction(code: string, branch: string, regulation: string = "R23") {
  return deleteSubjectGroupAction(code, [branch], regulation);
}

// Delete a subject across multiple branches (Grouped)
export async function deleteSubjectGroupAction(code: string, branches: string[], regulation: string = "R23") {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  for (const b of branches) {
    await supabase
      .from("subjects")
      .delete()
      .eq("code", code)
      .eq("branch", b)
      .eq("regulation", regulation);
  }

  await logAuditAction("DELETE_SUBJECT_GROUP", code, { branches, regulation }, null);

  revalidatePath("/admin/taxonomy");
  revalidatePath("/student/subjects");
  revalidatePath("/faculty/upload");
  revalidatePath("/faculty/materials");
  return { success: true };
}

// Toggle subject active status (single branch)
export async function toggleSubjectActiveAction(code: string, branch: string, regulation: string, currentActive: boolean) {
  return toggleSubjectGroupActiveAction(code, [branch], regulation, currentActive);
}

// Toggle subject active status across multiple branches (Grouped)
export async function toggleSubjectGroupActiveAction(code: string, branches: string[], regulation: string, currentActive: boolean) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  for (const b of branches) {
    await supabase
      .from("subjects")
      .update({ active: !currentActive })
      .eq("code", code)
      .eq("branch", b)
      .eq("regulation", regulation || "R23");
  }

  await logAuditAction("TOGGLE_SUBJECT_GROUP_STATUS", code, { active: currentActive, branches, regulation }, { active: !currentActive, branches, regulation });

  revalidatePath("/admin/taxonomy");
  revalidatePath("/student/subjects");
  revalidatePath("/faculty/upload");
  revalidatePath("/faculty/materials");
  return { success: true };
}

// Create a new branch
export async function createBranchAction(code: string, name: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("branches")
    .insert({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      active: true
    });

  if (error) return { error: error.message };

  await logAuditAction("CREATE_BRANCH", code, null, { name });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

// Update an existing branch
export async function updateBranchAction(
  originalCode: string,
  updates: {
    code: string;
    name: string;
    active?: boolean;
  }
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const formattedCode = updates.code.toUpperCase().trim();
  const formattedName = updates.name.trim();

  // If code changed, check if new code exists
  if (formattedCode !== originalCode) {
    const { data: existing } = await supabase
      .from("branches")
      .select("code")
      .eq("code", formattedCode)
      .maybeSingle();

    if (existing) {
      return { error: `Branch code "${formattedCode}" already exists.` };
    }
  }

  const { error } = await supabase
    .from("branches")
    .update({
      code: formattedCode,
      name: formattedName,
      ...(updates.active !== undefined ? { active: updates.active } : {}),
    })
    .eq("code", originalCode);

  if (error) return { error: error.message };

  // If code changed, also update subjects with this branch
  if (formattedCode !== originalCode) {
    await supabase
      .from("subjects")
      .update({ branch: formattedCode })
      .eq("branch", originalCode);
  }

  await logAuditAction("UPDATE_BRANCH", formattedCode, { originalCode }, updates);

  revalidatePath("/admin/taxonomy");
  revalidatePath("/faculty/upload");
  return { success: true };
}

// Toggle branch active status
export async function toggleBranchActiveAction(code: string, currentActive: boolean) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const { error } = await supabase
    .from("branches")
    .update({ active: !currentActive })
    .eq("code", code);

  if (error) return { error: error.message };

  await logAuditAction("TOGGLE_BRANCH_STATUS", code, { active: currentActive }, { active: !currentActive });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

// Delete a branch (with mapped subjects safety check)
export async function deleteBranchAction(code: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  // Safety check: verify no mapped subjects
  const { count } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true })
    .eq("branch", code);

  if (count && count > 0) {
    return { 
      error: `Cannot delete branch "${code}" because ${count} curriculum subject(s) are currently mapped to it. Reassign or delete those subjects first.` 
    };
  }

  const { error } = await supabase
    .from("branches")
    .delete()
    .eq("code", code);

  if (error) return { error: error.message };

  await logAuditAction("DELETE_BRANCH", code, null, null);

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

// Update an existing semester
export async function updateSemesterAction(
  number: number,
  updates: {
    name: string;
    active?: boolean;
  }
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const formattedName = updates.name.trim() || `Semester ${number}`;

  const { error } = await supabase
    .from("semesters")
    .upsert({
      number,
      name: formattedName,
      ...(updates.active !== undefined ? { active: updates.active } : {}),
    }, { onConflict: "number" });

  if (error) return { error: error.message };

  await logAuditAction("UPDATE_SEMESTER", `Sem ${number}`, null, updates);

  revalidatePath("/admin/taxonomy");
  revalidatePath("/student/subjects");
  revalidatePath("/faculty/upload");
  return { success: true };
}

// Toggle semester active status
export async function toggleSemesterActiveAction(number: number, currentActive: boolean) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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

  const { error } = await supabase
    .from("semesters")
    .upsert({
      number,
      name: `Semester ${number}`,
      active: !currentActive,
    }, { onConflict: "number" });

  if (error) return { error: error.message };

  await logAuditAction("TOGGLE_SEMESTER_STATUS", `Sem ${number}`, { active: currentActive }, { active: !currentActive });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

