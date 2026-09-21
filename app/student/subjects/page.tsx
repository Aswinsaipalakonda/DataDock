import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import Link from "next/link";
import { FolderOpen, ArrowRight, BookOpen, Sparkles, Layers, ChevronRight } from "lucide-react";
import { formatSubjectTitle, getBranchFullName } from "@/lib/utils";

interface SubjectItem {
  code: string;
  title: string;
  branch: string;
  semester: number;
  active: boolean;
  materialsCount: number;
  lastUpdatedStr: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentSubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ sem?: string }>;
}) {
  const { user, profile, supabase } = await getCachedUserProfile();
  if (!user) return null;

  const branch = profile?.branch || "CIC";
  const branchFullName = getBranchFullName(branch);
  const maxAllowedSemester = profile?.current_semester || 3;

  const resolvedParams = await searchParams;
  const requestedSem = resolvedParams.sem ? parseInt(resolvedParams.sem, 10) : maxAllowedSemester;
  const selectedSemester = Math.min(Math.max(1, requestedSem), maxAllowedSemester);

  // Generate semester tab numbers constrained up to the student's enrolled semester
  const semNumbers = Array.from({ length: maxAllowedSemester }, (_, i) => i + 1);

  // Fetch subjects from DB scoped to student's branch & selected semester
  const { data: dbSubjects } = await supabase
    .from("subjects")
    .select("code, title, branch, semester, regulation, active")
    .eq("branch", branch)
    .eq("semester", selectedSemester)
    .eq("active", true)
    .order("code");

  // Fetch published materials strictly for the student's branch & selected semester
  const { data: dbMaterials } = await supabase
    .from("materials")
    .select("id, subject, updated_at, created_at")
    .eq("branch", branch)
    .eq("semester", selectedSemester)
    .eq("state", "published");

  const materialsList = dbMaterials || [];

  const rawSubjects = (dbSubjects || []).map((sub: any) => {
    const subjectMaterials = materialsList.filter((m: any) => m.subject === sub.code);
    const count = subjectMaterials.length;
    let updatedStr = "Recent";

    if (count > 0) {
      const latestDate = new Date(
        Math.max(...subjectMaterials.map((m: any) => new Date(m.updated_at || m.created_at).getTime()))
      );
      updatedStr = latestDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    return {
      code: sub.code,
      title: formatSubjectTitle(sub.title),
      branch: sub.branch,
      semester: sub.semester,
      regulation: sub.regulation || "R23",
      active: sub.active ?? true,
      materialsCount: count,
      lastUpdatedStr: updatedStr,
    };
  });

  return (
    <div className="space-y-6 sm:space-y-7 w-full pb-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            <span>Branch {branch} ({branchFullName}) • Semester {selectedSemester} Curriculum</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Enrolled Subjects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Select any registered subject to explore validated lecture notes, lab manuals, and assignments for your branch.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
            {rawSubjects.length} {rawSubjects.length === 1 ? "Active Course" : "Active Courses"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE SEMESTER SELECTOR TABS */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Explore Semester Curriculum (Up to Semester {maxAllowedSemester})
          </span>
          <span className="text-xs text-slate-400 font-normal">
            Viewing: <strong className="text-slate-900 font-semibold">Semester {selectedSemester}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {semNumbers.map((num) => {
            const isSelected = selectedSemester === num;
            return (
              <Link
                key={num}
                href={`/student/subjects?sem=${num}`}
                className={`px-4.5 py-2 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 font-normal"
                }`}
              >
                <span>Semester {num}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Grid of Subjects or Clean Empty State */}
      {rawSubjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rawSubjects.map((sub: any) => (
            <Link
              key={`${sub.code}-${sub.branch}`}
              href={`/student/subjects/${sub.code}`}
              className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {sub.code}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {sub.materialsCount} {sub.materialsCount === 1 ? "Document" : "Documents"}
                  </span>
                </div>

                <h2 className="font-bold text-slate-900 text-base group-hover:text-primary transition-colors leading-snug">
                  {sub.title}
                </h2>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-normal">
                <span>Updated: {sub.lastUpdatedStr}</span>
                <div className="flex items-center gap-1 font-semibold text-primary group-hover:translate-x-1 transition-transform">
                  <span>View Notes</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/90 p-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Subjects Enrolled Yet</h3>
            <p className="text-xs text-slate-500 font-normal max-w-md mx-auto">
              No active curriculum subjects are registered for Branch {branch} Semester {selectedSemester}. Once syllabus courses are provisioned, they will appear here automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
