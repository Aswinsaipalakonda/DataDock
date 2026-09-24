import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MaterialsList, { SubjectItem } from "./materials-list";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getServerActivityEvents } from "@/utils/activity-store";
import { resolveBranchCode } from "@/lib/utils";

interface FileItem {
  id: string;
  file_name: string;
  size: number;
  mime_type: string;
  version: number;
  storage_ref: string;
}

export interface StudentEngagementLog {
  id: string;
  studentName: string;
  rollNumber: string;
  email: string;
  branch: string;
  semester: number;
  section: string;
  action: "view" | "download";
  fileName?: string;
  actionDetail?: string;
  timestamp: string;
}

interface RawMaterial {
  id: string;
  title: string;
  type: string;
  state: string;
  created_at: string;
  subject: string;
  branch?: string;
  semester?: number;
  views?: number;
  downloads?: number;
  engagementLogs?: StudentEngagementLog[];
  material_files: FileItem[];
}

const DEFAULT_SUBJECTS: SubjectItem[] = [];

const FALLBACK_FACULTY_INVENTORY: RawMaterial[] = [];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FacultyMaterialsPage() {
  const cookieStore = await cookies();
  const { user, supabase } = await getCachedUserProfile();
  if (!user) redirect("/login");

  // Fetch materials, activity events, subjects, and student users in parallel
  const [materialsRes, eventsRes, usersRes, subjectsRes] = await Promise.all([
    supabase
      .from("materials")
      .select(`
        id,
        title,
        type,
        state,
        branch,
        semester,
        created_at,
        subject,
        material_files (
          id,
          file_name,
          size,
          mime_type,
          version,
          storage_ref
        )
      `)
      .eq("owner_id", user.id)
      .neq("state", "deleted")
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select(`
        id,
        type,
        target_id,
        actor_id,
        metadata,
        created_at,
        users:actor_id (
          id,
          name,
          email,
          role,
          branch,
          current_semester,
          section,
          roll_number
        )
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, name, email, role, branch, current_semester, section, roll_number"),
    supabase
      .from("subjects")
      .select("code, title, branch, semester, description")
      .eq("active", true)
      .order("code"),
  ]);

  const rawMaterials = (materialsRes.data as unknown as RawMaterial[]) || [];
  const dbEvents = (eventsRes.data as unknown as any[]) || [];
  const dbUsers = (usersRes.data as unknown as Record<string, unknown>[]) || [];
  const dbSubjects = (subjectsRes.data as unknown as SubjectItem[]) || [];

  // 1. Read from persistent server-side activity store
  const serverEvents = getServerActivityEvents();

  // 2. Read from cookie backup
  let cookieEvents: any[] = [];
  try {
    const rawCookie = cookieStore.get("de_live_activity_events")?.value;
    if (rawCookie) {
      cookieEvents = JSON.parse(rawCookie);
    }
  } catch {}

  const allRawEvents = [...serverEvents, ...cookieEvents, ...dbEvents];
  const eventsMap = new Map<string, any>();
  allRawEvents.forEach((ev) => {
    const actorKey = ev.actor_roll || ev.metadata?.roll_number || ev.users?.roll_number || (ev.actor_email ? ev.actor_email.split('@')[0].toUpperCase() : '') || ev.actor_id;
    const targetId = ev.target_id || ev.targetId;
    const timeBucket = Math.floor(new Date(ev.created_at || ev.timestamp || 0).getTime() / (30 * 60 * 1000));
    const filePart = ev.file_name || ev.metadata?.file_name || "main";
    const key = `${ev.type}-${targetId}-${actorKey}-${filePart}-${timeBucket}`;
    if (!eventsMap.has(key)) {
      eventsMap.set(key, ev);
    }
  });
  const events = Array.from(eventsMap.values());
  events.sort((a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime());

  const userMap = new Map<string, any>();
  dbUsers.forEach((u) => {
    if (u.id) userMap.set(String(u.id), u);
    if (u.email) userMap.set(String(u.email).toLowerCase(), u);
    if (u.roll_number) userMap.set(String(u.roll_number).toUpperCase(), u);
  });

  const activeList = rawMaterials.length > 0 ? rawMaterials : FALLBACK_FACULTY_INVENTORY;

  // Compute real engagement analytics for each material
  const materials = activeList.map(m => {
    const matEvents = events.filter((e) => (e.target_id || e.targetId) === m.id);

    // Only count genuine student events (exclude faculty self-visits and admin visits)
    const validStudentEvents = matEvents.filter((ev) => {
      const userProfile = 
        (ev.users as Record<string, unknown>) || 
        (ev.actor_id ? userMap.get(String(ev.actor_id)) : null) ||
        (ev.actor_email ? userMap.get(String(ev.actor_email).toLowerCase()) : null);

      const userRole = (userProfile?.role as string) || "";
      if (userRole === "faculty" || userRole === "admin") return false;

      const email = ((userProfile?.email as string) || ev.actor_email || ev.metadata?.email || "").toLowerCase();
      if (email.startsWith("faculty") || email.startsWith("testfaculty") || email.startsWith("admin")) return false;

      const roll = ((userProfile?.roll_number as string) || ev.actor_roll || ev.metadata?.roll_number || "").toUpperCase();
      if (roll.startsWith("FACULTY") || roll.startsWith("TESTFACULTY") || roll.startsWith("ADMIN")) return false;

      return true;
    });

    // Count distinct students who viewed this material (strictly 1 count per student)
    const uniqueStudentViewers = new Set(
      validStudentEvents
        .filter((e) => e.type === "view")
        .map((ev) => {
          const userProfile = 
            (ev.users as Record<string, unknown>) || 
            (ev.actor_id ? userMap.get(String(ev.actor_id)) : null) ||
            (ev.actor_email ? userMap.get(String(ev.actor_email).toLowerCase()) : null);
          const userEmail = (userProfile?.email as string) || ev.actor_email || ev.metadata?.email || "";
          return (
            (userProfile?.roll_number as string) || 
            ev.actor_roll || 
            ev.metadata?.roll_number || 
            (userEmail.includes("@") ? userEmail.split("@")[0].toUpperCase() : "") ||
            ev.actor_id
          );
        })
        .filter(Boolean)
    );

    // Count distinct students who downloaded this material (strictly 1 count per student)
    const uniqueStudentDownloaders = new Set(
      validStudentEvents
        .filter((e) => e.type === "download")
        .map((ev) => {
          const userProfile = 
            (ev.users as Record<string, unknown>) || 
            (ev.actor_id ? userMap.get(String(ev.actor_id)) : null) ||
            (ev.actor_email ? userMap.get(String(ev.actor_email).toLowerCase()) : null);
          const userEmail = (userProfile?.email as string) || ev.actor_email || ev.metadata?.email || "";
          return (
            (userProfile?.roll_number as string) || 
            ev.actor_roll || 
            ev.metadata?.roll_number || 
            (userEmail.includes("@") ? userEmail.split("@")[0].toUpperCase() : "") ||
            ev.actor_id
          );
        })
        .filter(Boolean)
    );

    const views = uniqueStudentViewers.size;
    const downloads = uniqueStudentDownloaders.size;

    // Deduplicate valid student events by (roll, action, file) keeping latest event
    const distinctEventsMap = new Map<string, any>();
    validStudentEvents.forEach((ev) => {
      const userProfile = 
        (ev.users as Record<string, unknown>) || 
        (ev.actor_id ? userMap.get(String(ev.actor_id)) : null) ||
        (ev.actor_email ? userMap.get(String(ev.actor_email).toLowerCase()) : null);

      const userEmail = ((userProfile?.email as string) || ev.actor_email || ev.metadata?.email || "").toLowerCase();
      const roll = (userProfile?.roll_number as string) || ev.actor_roll || ev.metadata?.roll_number || (userEmail.includes("@") ? userEmail.split("@")[0].toUpperCase() : "");
      if (!roll) return;

      const fileName = ev.file_name || ev.metadata?.file_name || "material_workspace";
      const key = `${roll.toUpperCase()}__${ev.type}__${fileName}`;

      if (!distinctEventsMap.has(key)) {
        distinctEventsMap.set(key, ev);
      }
    });

    const distinctEvents = Array.from(distinctEventsMap.values());

    const engagementLogs: StudentEngagementLog[] = distinctEvents.map((ev, idx) => {
      const userProfile = 
        (ev.users as Record<string, unknown>) || 
        (ev.actor_id ? userMap.get(String(ev.actor_id)) : null) ||
        (ev.actor_email ? userMap.get(String(ev.actor_email).toLowerCase()) : null);

      const userEmail = (userProfile?.email as string) || ev.actor_email || ev.metadata?.email || "";
      const roll = 
        (userProfile?.roll_number as string) || 
        ev.actor_roll || 
        ev.metadata?.roll_number || 
        (userEmail.includes("@") ? userEmail.split("@")[0].toUpperCase() : "");

      const studentName = 
        (userProfile?.name as string) || 
        ev.actor_name || 
        ev.metadata?.student_name || 
        (roll ? `Student (${roll})` : "Enrolled Student");

      let actionDetail = ev.action_detail || "Viewed Material Workspace";
      let fileName = ev.file_name || ev.metadata?.file_name;

      // Fallback: extract fileName from action_detail (server events store it as "Previewed: filename.ext")
      if (!fileName && ev.action_detail) {
        const detailMatch = ev.action_detail.match(/(?:Previewed|Downloaded|Viewed):\s*(.+)/i);
        if (detailMatch && detailMatch[1]) {
          fileName = detailMatch[1].trim();
        }
      }

      if (ev.type === "download") {
        actionDetail = fileName ? `Downloaded: ${fileName}` : "Downloaded Study File";
      } else if (ev.metadata?.action === "file_preview" || ev.action_detail?.includes("Preview")) {
        actionDetail = fileName ? `Previewed: ${fileName}` : "Previewed Study Document";
      }

      return {
        id: ev.id || `${m.id}-log-${idx}`,
        studentName: studentName,
        rollNumber: roll,
        email: userEmail || `${roll.toLowerCase()}@mvgrce.edu.in`,
        branch: (userProfile?.branch as string) || m.branch || "CIC",
        semester: (userProfile?.current_semester as number) || m.semester || 3,
        section: (userProfile?.section as string) || (parseInt(roll.slice(-2), 10) <= 36 ? "A" : "B"),
        action: ev.type === "download" ? "download" : "view",
        fileName: fileName,
        actionDetail: actionDetail,
        timestamp: ev.created_at || new Date().toISOString(),
      };
    });

    return {
      ...m,
      views: views,
      downloads: downloads,
      engagementLogs: engagementLogs,
      branch: m.branch || "CIC",
      semester: m.semester || 3,
      state: m.state as "draft" | "published" | "archived" | "deleted",
    };
  });

  // Only include subjects that have at least one uploaded material by this faculty
  const uploadedSubjectCodes = new Set(
    materials.map((m) => (m.subject || "").toUpperCase()).filter(Boolean)
  );

  const subjectsMap = new Map<string, SubjectItem>();

  // 1. Add DB subjects that match this faculty's uploaded materials
  dbSubjects.forEach((s) => {
    if (uploadedSubjectCodes.has(s.code.toUpperCase())) {
      subjectsMap.set(s.code.toUpperCase(), s);
    }
  });

  // 2. Ensure every material's subject code exists in subjects map (even if custom or unseeded)
  materials.forEach((m) => {
    const codeUpper = (m.subject || "").toUpperCase();
    if (codeUpper && !subjectsMap.has(codeUpper)) {
      const dbMatch = dbSubjects.find((s) => s.code.toUpperCase() === codeUpper);
      subjectsMap.set(codeUpper, {
        code: m.subject,
        title: dbMatch?.title || m.subject,
        branch: m.branch || dbMatch?.branch || "CIC",
        semester: m.semester || dbMatch?.semester || 3,
      });
    }
  });

  const subjects = Array.from(subjectsMap.values());

  // Strictly filter dbUsers to ONLY genuine students
  const studentUsers = dbUsers.filter((u) => {
    const role = String(u.role || "").toLowerCase();
    const email = String(u.email || "").toLowerCase();
    if (role === "admin" || role === "faculty") return false;
    if (email.startsWith("faculty") || email.startsWith("testfaculty") || email.startsWith("admin")) return false;
    return true;
  });

  const students = studentUsers.map((u) => {
    const email = String(u.email || "");
    const rawRoll = (u.roll_number as string) || (email.includes("@") ? email.split("@")[0].toUpperCase() : "");
    const roll = rawRoll.toUpperCase();
    const branch = resolveBranchCode(u.branch as string, roll);
    const current_semester = typeof u.current_semester === "number" ? u.current_semester : 3;
    const section = (u.section as string) || (parseInt(roll.slice(-2), 10) <= 36 ? "A" : "B");

    return {
      id: String(u.id || roll),
      name: String(u.name || (roll ? `Student (${roll})` : "Enrolled Student")),
      email: email || `${roll.toLowerCase()}@mvgrce.edu.in`,
      role: "student",
      branch,
      current_semester,
      section,
      roll_number: roll,
    };
  });

  return (
    <div className="space-y-6 sm:space-y-7 w-full max-w-6xl pb-10">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link 
            href="/faculty" 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        <Link
          href="/faculty/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs sm:text-sm transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Upload New Material</span>
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Your Course Materials Portfolio</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-normal">
          Select an assigned subject to inspect and manage syllabus documents, lecture notes, and student engagement.
        </p>
      </header>

      <MaterialsList initialMaterials={materials} subjects={subjects} students={students} />
    </div>
  );
}
