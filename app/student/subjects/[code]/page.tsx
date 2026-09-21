import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveExamLockout } from "@/utils/exam-lockout";
import SubjectMaterialsView from "./subject-materials-view";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ q?: string; type?: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubjectDetailPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const code = params.code;
  const query = (searchParams.q || "").trim();
  const selectedType = (searchParams.type || "").trim();

  const { user, profile, supabase } = await getCachedUserProfile();
  if (!user) return null;

  const studentBranch = profile?.branch || "CIC";

  // Fetch subject matching this course code and student's branch
  const { data: dbSubject } = await supabase
    .from("subjects")
    .select("*")
    .eq("code", code)
    .eq("branch", studentBranch)
    .maybeSingle();

  const { data: dbAnySubject } = dbSubject ? { data: dbSubject } : await supabase
    .from("subjects")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  const subject = dbSubject || dbAnySubject;

  if (!subject) {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-4">
        <Link 
          href="/student/subjects" 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs transition-all shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Subjects</span>
        </Link>
        <div role="alert" className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs text-center space-y-2">
          <p className="text-sm font-bold text-slate-900">Subject Not Found</p>
          <p className="text-xs text-slate-500 font-normal">No curriculum course found for code &quot;{code}&quot;.</p>
        </div>
      </div>
    );
  }

  // Check if subject's semester and subject code is in active Exam Lockout
  const examLockout = await getActiveExamLockout(subject.semester || 3, studentBranch, code);

  // Build Materials query from DB - strictly scoped to this subject and student's branch/section!
  // Crucial: fetch material_files so students can see and interact with all attached documents
  const { data: dbMaterials } = await supabase
    .from("materials")
    .select(`
      id, 
      title, 
      type, 
      created_at, 
      tags,
      branch,
      subject,
      material_files (
        id,
        file_name,
        size,
        mime_type,
        storage_ref,
        version
      ),
      users:owner (
        name
      )
    `)
    .eq("subject", code)
    .eq("branch", studentBranch)
    .eq("state", "published")
    .order("created_at", { ascending: false });

  const materials = (dbMaterials || []) as any[];

  return (
    <SubjectMaterialsView
      subject={subject}
      materials={materials}
      studentBranch={studentBranch}
      initialType={selectedType || "All"}
      initialQuery={query}
      examLockout={examLockout}
    />
  );
}
