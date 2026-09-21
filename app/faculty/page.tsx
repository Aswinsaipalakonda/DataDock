import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  FileText, 
  Eye, 
  Download, 
  BookOpen,
  Upload,
  Plus,
  ChevronRight,
  Megaphone,
  AlertCircle
} from "lucide-react";

import { getServerActivityEvents } from "@/utils/activity-store";

interface MaterialFileItem {
  size: number;
}

interface MaterialWithFiles {
  id: string;
  title: string;
  type: string;
  state: string;
  created_at: string;
  subject?: string;
  views?: number;
  downloads?: number;
  material_files: MaterialFileItem[];
}

const FALLBACK_FACULTY_MATERIALS: MaterialWithFiles[] = [];

const FALLBACK_FACULTY_ANNOUNCEMENTS: any[] = [];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FacultyDashboardPage() {
  const cookieStore = await cookies();
  const { user, profile, supabase } = await getCachedUserProfile();
  if (!user) redirect("/login");

  const rawFacultyName = profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || "Faculty";
  const facultyName = rawFacultyName.includes("@")
    ? rawFacultyName.split("@")[0].replace(/([a-zA-Z]+)(\d+)/, "$1 $2").replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : rawFacultyName;

  // Fetch all materials owned by this faculty user
  const { data: materialsData } = await supabase
    .from("materials")
    .select("id, title, type, state, created_at, subject, material_files(size)")
    .eq("owner_id", user.id)
    .neq("state", "deleted")
    .order("created_at", { ascending: false });

  const rawMaterials = (materialsData as unknown as MaterialWithFiles[]) || [];

  // Fetch all activity events across persistent server-store, cookies, and Supabase database
  const serverEvents = getServerActivityEvents();
  let cookieEvents: any[] = [];
  try {
    const rawCookie = cookieStore.get("de_live_activity_events")?.value;
    if (rawCookie) cookieEvents = JSON.parse(rawCookie);
  } catch {}

  const { data: dbEventsData } = await supabase
    .from("activity_events")
    .select("id, type, target_id, actor_id, metadata, created_at");

  const dbEvents = (dbEventsData as unknown as any[]) || [];
  const allEvents = [...serverEvents, ...cookieEvents, ...dbEvents];

  // Map events to deduplicate
  const eventsMap = new Map<string, any>();
  allEvents.forEach((ev) => {
    const key = ev.id || `${ev.type}-${ev.target_id || ev.targetId}-${ev.actor_roll || ev.actor_id}-${ev.file_name || "page"}-${ev.created_at}`;
    if (!eventsMap.has(key)) {
      eventsMap.set(key, ev);
    }
  });
  const events = Array.from(eventsMap.values());

  const facultyMaterialIds = new Set(rawMaterials.map((m) => m.id));

  // Attach dynamic real-time metrics to each material
  const materialsWithMetrics = rawMaterials.map((m) => {
    const matEvents = events.filter((e) => (e.target_id || e.targetId) === m.id);
    const viewCount = matEvents.filter((e) => e.type === "view").length;
    const downloadCount = matEvents.filter((e) => e.type === "download").length;

    return {
      ...m,
      views: viewCount,
      downloads: downloadCount,
    };
  });

  const materials = materialsWithMetrics;
  const totalUploads = rawMaterials.length;

  // Derive distinct subjects handled from materials
  const distinctSubjects = new Set<string>();
  rawMaterials.forEach((m) => {
    if (m.subject) distinctSubjects.add(m.subject.toUpperCase().trim());
  });
  const totalSubjectsCount = distinctSubjects.size;

  // Total views and downloads across all materials owned by this faculty
  const facultyEvents = events.filter((e) => facultyMaterialIds.has(e.target_id || e.targetId));
  const totalViews = facultyEvents.filter((e) => e.type === "view").length;
  const totalDownloads = facultyEvents.filter((e) => e.type === "download").length;

  return (
    <div className="space-y-6 sm:space-y-7 w-full max-w-7xl pb-8">
      {/* ========================================================================= */}
      {/* EXECUTIVE FACULTY WELCOME HERO CARD */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {facultyName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
              Publish lecture notes, lab manuals, and assignments for your students while monitoring engagement analytics.
            </p>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            <Link
              href="/faculty/upload"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Material</span>
            </Link>

            <Link
              href="/faculty/materials"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              <FileText className="h-4 w-4 text-slate-600" />
              <span>My Materials ({totalUploads})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* METRIC TILES: 2-COLUMNS ON MOBILE / 4-COLUMNS ON DESKTOP */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {/* Card 1: Total Uploads */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Upload className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{totalUploads} Files</span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5 block">Published Syllabus Notes</span>
          </div>
        </div>

        {/* Card 2: Student Views */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Views</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Eye className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{totalViews}</span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5 block">Unique Student Readers</span>
          </div>
        </div>

        {/* Card 3: File Downloads */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Downloads</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Download className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{totalDownloads}</span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5 block">Unique Student Downloads</span>
          </div>
        </div>

        {/* Card 4: Assigned Course Subjects (Replaces Technical Storage) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Subjects</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <BookOpen className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {totalSubjectsCount} Subjects
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5 block">
              Curriculum Course Portfolios
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2-COLUMN MAIN CONTENT DIRECTORY */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Your Uploaded Learning Materials */}
        <section className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Your Uploaded Course Materials
              </h2>
            </div>
            <Link
              href="/faculty/materials"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <span>Manage All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {materials.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {materials.map((mat) => {
                const isPublished = mat.state === "published";
                return (
                  <div
                    key={mat.id}
                    className="py-4 p-3 rounded-2xl hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
                          {mat.type}
                        </span>
                        {mat.subject && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600">
                            {mat.subject}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPublished
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isPublished ? "Published" : "Draft"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {mat.title}
                      </h3>

                      <div className="text-xs text-slate-500 font-normal flex items-center gap-3 flex-wrap">
                        <span>{new Date(mat.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <span>{mat.views ?? 0} views</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5 text-slate-400" />
                          <span>{mat.downloads ?? 0} downloads</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <Link
                        href="/faculty/materials"
                        className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-2xs"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">No Course Materials Uploaded Yet</p>
                <p className="text-xs text-slate-500 font-normal max-w-sm mx-auto">
                  You haven&apos;t published any study materials. Click below to upload lecture notes or lab manuals.
                </p>
              </div>
              <Link
                href="/faculty/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary/95 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Upload First Material</span>
              </Link>
            </div>
          )}
        </section>

        {/* Right Column (4 cols): Quick Tools & Department Notices */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Upload Launcher Card */}
          <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Upload className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Upload Center</h2>
            </div>

            <p className="text-xs text-slate-600 font-normal leading-relaxed">
              Upload PDF lecture notes, lab manuals, presentations, or assignments for student distribution.
            </p>

            <Link
              href="/faculty/upload"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Upload</span>
            </Link>
          </section>

          {/* Department Notices Card */}
          <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Megaphone className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Faculty Circulars</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                Active
              </span>
            </div>

            <div className="space-y-3">
              {FALLBACK_FACULTY_ANNOUNCEMENTS.map((ann) => {
                const isImportant = ann.priority === "important";
                return (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
                      isImportant
                        ? "bg-red-50/40 border-red-200"
                        : "bg-slate-50/60 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {isImportant ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <AlertCircle className="h-3 w-3 text-red-600" />
                          Important Notice
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Circular
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {ann.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-normal leading-relaxed line-clamp-3">
                      {ann.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
