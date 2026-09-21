import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  Users, 
  BookOpen, 
  HardDrive, 
  Activity, 
  ArrowRight,
  UserCheck,
  Megaphone,
  ShieldAlert,
  BarChart3,
  Layers,
  Sparkles,
  ChevronRight,
  Calendar,
  Inbox
} from "lucide-react";

interface ActivityEvent {
  id: string;
  created_at: string;
  action: string;
  friendlyTitle: string;
  objectId: string;
  badge: { bg: string; label: string };
  performer: string;
}

function getActionBadge(action: string) {
  const act = (action || "").toLowerCase();
  if (act.includes("create") || act.includes("register") || act.includes("batch")) {
    return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Created" };
  }
  if (act.includes("delete") || act.includes("remove")) {
    return { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Removed" };
  }
  if (act.includes("login") || act.includes("auth") || act.includes("password") || act.includes("reset")) {
    return { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Security" };
  }
  if (act.includes("upload") || act.includes("material") || act.includes("subject")) {
    return { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Curriculum" };
  }
  return { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Updated" };
}

function formatActionTitle(action: string) {
  return (action || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const { user, supabase } = await getCachedUserProfile();
  if (!user) redirect("/login");

  // Run aggregate queries
  const [
    studentsRes,
    facultyRes,
    materialsRes,
    eventsRes,
    branchesRes,
    inquiriesRes
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "faculty"),
    supabase.from("materials").select("id", { count: "exact", head: true }).neq("state", "deleted"),
    supabase.from("audit_logs").select(`
      id,
      action,
      object_id,
      before_summary,
      after_summary,
      created_at,
      users:actor_id (
        name,
        email,
        role
      )
    `).order("created_at", { ascending: false }).limit(6),
    supabase.from("branches").select("code", { count: "exact", head: true }),
    supabase.from("support_inquiries").select("id, status")
  ]);

  const rawStudents = studentsRes.count ?? 0;
  const rawFaculty = facultyRes.count ?? 0;
  const rawMaterials = materialsRes.count ?? 0;
  const rawBranches = branchesRes.count ?? 0;
  const totalInquiries = inquiriesRes.data?.length || 0;
  const pendingInquiries = (inquiriesRes.data as Array<{ status: string }> | null)?.filter((i) => i.status === "pending").length || 0;

  const totalStudents = rawStudents;
  const totalFaculty = rawFaculty;
  const totalMaterials = rawMaterials;
  const totalBranches = rawBranches;

  const rawEvents: ActivityEvent[] = ((eventsRes.data || []) as Record<string, unknown>[]).map((ev: any) => {
    const userObj = ev.users as { email?: string; name?: string; role?: string } | null;
    const action = String(ev.action || "SYSTEM_EVENT");
    const objectId = String(ev.object_id || "");
    const badge = getActionBadge(action);
    const friendlyTitle = formatActionTitle(action);

    return {
      id: String(ev.id || ""),
      created_at: String(ev.created_at || ""),
      action,
      friendlyTitle,
      badge,
      objectId,
      performer: userObj?.name || userObj?.email || "System Administrator",
    };
  });

  const events = rawEvents;

  return (
    <div className="space-y-6 sm:space-y-7 w-full pb-6">
      {/* ========================================================================= */}
      {/* EXECUTIVE WELCOME HERO CARD */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-[0_4px_25px_-4px_rgba(11,31,59,0.05)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Department Administration Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Academic Operations Command
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
              Real-time monitoring of student cohorts, faculty syllabus repositories, and departmental cloud infrastructure.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-all shadow-xs"
            >
              <Users className="h-4 w-4" />
              <span>Manage Users</span>
            </Link>
            <Link
              href="/admin/taxonomy"
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium transition-all"
            >
              <Layers className="h-4 w-4 text-slate-600" />
              <span>Taxonomy</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* METRICS TILES: 2-COLUMNS ON MOBILE / 4-COLUMNS ON DESKTOP */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {/* Card 1: Active Students */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{totalStudents}</span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5 block">Active Learners</span>
          </div>
        </div>

        {/* Card 2: Registered Faculty */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{totalFaculty}</span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5 block">Educators & Ranks</span>
          </div>
        </div>

        {/* Card 3: Curriculum Resources */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <BookOpen className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{totalMaterials}</span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5 block">
              {totalMaterials === 1 ? "Learning Unit" : "Learning Units"}
            </span>
          </div>
        </div>

        {/* Card 4: Academic Branches */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branches</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Layers className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {totalBranches} {totalBranches === 1 ? "Branch" : "Branches"}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5 block">
              Department Curricula
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2-COLUMN PANELS: RECENT SYSTEM ACTIVITY & QUICK ACCESS DIRECTORY */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Activity Audit */}
        <section className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Activity className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Recent Activity Logs</h2>
            </div>
            <Link
              href="/admin/logs"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <span>View All Logs</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {events.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {events.map((ev) => (
                <div key={ev.id} className="py-3.5 flex items-start justify-between gap-3 group">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ev.badge.bg}`}>
                        {ev.badge.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {ev.friendlyTitle}
                      </span>
                      {ev.objectId && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600 truncate max-w-[180px]">
                          {ev.objectId}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal block truncate">
                      By {ev.performer}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal shrink-0">
                    {new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Activity className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500 font-normal">No recent administrative events logged.</p>
            </div>
          )}
        </section>

        {/* Right Column: Quick Operations Navigation */}
        <section className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quick Operations
          </h2>

          <div className="space-y-2">
            {[
              { title: "User Management & Roster", href: "/admin/users", desc: "Manage students, faculty & sections", icon: Users },
              { 
                title: "Helpdesk Inquiries", 
                href: "/admin/inquiries", 
                desc: pendingInquiries > 0 ? `${pendingInquiries} pending message${pendingInquiries > 1 ? "s" : ""}` : "All contact queries resolved", 
                icon: Inbox 
              },
              { title: "Curriculum Taxonomy", href: "/admin/taxonomy", desc: "Subjects & branch specializations", icon: Layers },
              { title: "Announcements & Broadcast", href: "/admin/announcements", desc: "Push departmental notices", icon: Megaphone },
              { title: "System Audit Logs", href: "/admin/logs", desc: "Inspect security events", icon: ShieldAlert },
              { title: "Usage & Storage Analytics", href: "/admin/analytics", desc: "Monitor repository downloads", icon: BarChart3 },
            ].map((op) => {
              const Icon = op.icon;
              return (
                <Link
                  key={op.href}
                  href={op.href}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/80 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 group-hover:text-slate-900 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {op.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                        {op.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
