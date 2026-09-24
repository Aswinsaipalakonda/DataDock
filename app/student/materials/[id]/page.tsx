import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { 
  FileText, 
  ArrowLeft, 
  Layers,
  Sparkles,
  Clock
} from "lucide-react";
import BookmarkButton from "./bookmark-button";
import FileList from "./file-list";
import { getActiveExamLockout } from "@/utils/exam-lockout";
import MaterialViewTracker from "@/components/material-view-tracker";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface MaterialFileItem {
  id: string;
  file_name: string;
  size: number;
  mime_type: string;
  storage_ref: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MaterialDetailsPage(props: PageProps) {
  const params = await props.params;
  const id = params.id;

  const cookieStore = await cookies();
  const { user, profile, supabase } = await getCachedUserProfile();
  if (!user) return null;

  const userRole = profile?.role || user.user_metadata?.role || "student";
  const isFaculty = userRole === "faculty";
  const isAdmin = userRole === "admin";

  // Query database for material details
  const { data: dbMaterial } = await supabase
    .from("materials")
    .select(`
      id,
      title,
      description,
      type,
      created_at,
      subject,
      branch,
      semester,
      state,
      users (name),
      subjects (title, code),
      material_files (id, file_name, size, mime_type, storage_ref)
    `)
    .eq("id", id)
    .maybeSingle();

  const material = dbMaterial;

  const returnUrl = isFaculty 
    ? "/faculty" 
    : isAdmin 
    ? "/admin/analytics" 
    : material?.subject 
    ? `/student/subjects/${material.subject}` 
    : "/student/subjects";

  const returnLabel = isFaculty 
    ? "Return to Faculty Dashboard" 
    : isAdmin 
    ? "Return to Analytics" 
    : material?.subject 
    ? `← Back to ${material.subject}` 
    : "← Back to Subjects";

  if (!material || material.state === "deleted" || (!isFaculty && !isAdmin && material.state !== "published")) {
    return (
      <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-4">
        <Link 
          href={returnUrl} 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs transition-all shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{returnLabel}</span>
        </Link>
        <div role="alert" className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs text-center space-y-2">
          <p className="text-sm font-bold text-slate-900">Material Document Not Found</p>
          <p className="text-xs text-slate-500 font-normal">The requested study file may have been archived or rescheduled.</p>
        </div>
      </div>
    );
  }

  // Check if material is locked for student under active Exam Mode
  if (userRole === "student" && material.semester) {
    const examLockout = await getActiveExamLockout(material.semester, material.branch, material.subject);
    if (examLockout.isLocked) {
      return (
        <div className="p-8 max-w-xl mx-auto space-y-4">
          <Link 
            href={returnUrl} 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs transition-all shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{returnLabel}</span>
          </Link>
          <div role="alert" className="p-7 bg-amber-50 border border-amber-200 rounded-3xl shadow-xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-amber-950">
              {examLockout.examTitle || "Examination Lockout Active"}
            </h2>
            <p className="text-xs text-amber-900/90 leading-relaxed font-normal">
              {examLockout.message || "This study document is temporarily locked during the scheduled examination period. Access will resume automatically after the exam session concludes."}
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800">
              Session Hours: {examLockout.startTimeText} – {examLockout.endTimeText}
            </span>
          </div>
        </div>
      );
    }
  }

  // Check if bookmarked
  const cookieVal = cookieStore.get("de_saved_bookmarks")?.value;
  let savedBookmarkIds: string[] | null = null;
  if (cookieVal) {
    try { savedBookmarkIds = JSON.parse(cookieVal); } catch {}
  }

  const { data: bookmark } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("material_id", id)
    .maybeSingle();

  const isBookmarked = savedBookmarkIds !== null
    ? savedBookmarkIds.includes(id)
    : !!bookmark;

  const facultyUser = Array.isArray(material.users) ? material.users[0] : (material.users as { name?: string } | null);
  const facultyName = facultyUser?.name || "Faculty Member";

  const subjectItem = Array.isArray(material.subjects) ? material.subjects[0] : (material.subjects as { title?: string; code?: string } | null);
  const subjectCode = subjectItem?.code || material.subject || "Subject";
  const subjectTitle = subjectItem?.title || "Department Subject";
  const files: MaterialFileItem[] = (material.material_files as unknown as MaterialFileItem[]) || [];

  return (
    <div className="space-y-6 sm:space-y-7 w-full pb-10">
      <MaterialViewTracker 
        materialId={material.id} 
        materialTitle={material.title} 
        userRole={userRole} 
      />

      {/* Navigation Breadcrumb */}
      <div>
        <Link 
          href={returnUrl} 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{returnLabel}</span>
        </Link>
      </div>

      {/* Main Material Card */}
      <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-5 sm:space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-5 border-b border-slate-100 pb-5 sm:pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
                {material.type}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                {subjectCode}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                Sem {material.semester || 3}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {material.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-normal flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span>{subjectTitle}</span>
              <span>•</span>
              <span>Uploaded by {facultyName}</span>
              <span>•</span>
              <span>{new Date(material.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
            <BookmarkButton materialId={id} initialBookmarked={isBookmarked} />
          </div>
        </div>

        {/* Material Description / Syllabus Abstract */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Material Overview & Learning Objectives
          </h2>
          <p className="text-sm text-slate-700 font-normal leading-relaxed">
            {material.description || "Official study and reference materials prepared in accordance with the Department of Data Engineering syllabus curriculum guidelines."}
          </p>
        </div>

        {/* Attached Resource Files */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            <span>Verified Study Files ({files.length})</span>
          </h2>

          <FileList materialId={id} files={files} />
        </div>
      </div>
    </div>
  );
}
