import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AnalyticsClient from "./analytics-client";
import { getServerActivityEvents } from "@/utils/activity-store";
import { resolveBranchCode } from "@/lib/utils";

interface MaterialFileItem {
  id: string;
  file_name: string;
  size?: number;
}

interface MaterialItem {
  id: string;
  title: string;
  type: string;
  subject?: string;
  branch: string;
  semester: number;
  owner_id?: string;
  created_at: string;
  material_files?: MaterialFileItem[];
  users: {
    name: string;
    email: string;
  } | null;
}

interface ActivityEvent {
  id?: string;
  type: string;
  target_id: string;
  actor_id?: string;
  actor_email?: string;
  actor_roll?: string;
  created_at?: string;
  metadata?: {
    file_id?: string;
    file_name?: string;
    action?: string;
    mode?: string;
    material_title?: string;
    roll_number?: string;
    email?: string;
    student_name?: string;
  };
  users?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    branch?: string;
    current_semester?: number;
    section?: string;
    roll_number?: string;
  } | null;
}

interface BranchItem {
  code: string;
  name: string;
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAnalyticsPage() {
  const cookieStore = await cookies();
  const { user, supabase } = await getCachedUserProfile();
  if (!user) redirect("/login");

  // Fetch materials, activity events, users, and branches in parallel
  const [materialsRes, eventsRes, usersRes, branchesRes] = await Promise.all([
    supabase
      .from("materials")
      .select(`
        id,
        title,
        type,
        subject,
        branch,
        semester,
        owner_id,
        created_at,
        users:owner_id (
          name,
          email
        ),
        material_files (
          id,
          file_name,
          size,
          mime_type,
          version,
          storage_ref
        )
      `)
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
      .from("branches")
      .select("code, name")
      .eq("active", true),
  ]);

  if (materialsRes.error) {
    return (
      <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-semibold text-xs">
        Failed to fetch repository analytics: {materialsRes.error.message}
      </div>
    );
  }

  const dbMaterials = (materialsRes.data as unknown as MaterialItem[]) || [];
  const dbEvents = (eventsRes.data as unknown as ActivityEvent[]) || [];
  const dbUsers = (usersRes.data as unknown as Record<string, unknown>[]) || [];
  const branches = (branchesRes.data as unknown as BranchItem[]) || [
    { code: "CIC", name: "Cyber Security & IoT" },
    { code: "CSD", name: "Data Science" },
    { code: "CSM", name: "AI & Machine Learning" },
  ];

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

  // Merge and normalize all activity events
  const allRawEvents = [...serverEvents, ...cookieEvents, ...dbEvents];
  const eventsMap = new Map<string, any>();
  allRawEvents.forEach((ev) => {
    const key = ev.id || `${ev.type}-${ev.target_id || ev.targetId}-${ev.actor_roll || ev.metadata?.roll_number || ev.actor_id}-${ev.file_name || ev.metadata?.file_name || "page"}-${ev.created_at}`;
    if (!eventsMap.has(key)) {
      eventsMap.set(key, ev);
    }
  });
  const events = Array.from(eventsMap.values());
  events.sort((a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime());

  // User lookup map by ID, Email, and Roll Number
  const userMap = new Map<string, Record<string, unknown>>();
  dbUsers.forEach((u) => {
    if (u.id) userMap.set(String(u.id), u);
    if (u.email) userMap.set(String(u.email).toLowerCase(), u);
    if (u.roll_number) userMap.set(String(u.roll_number).toUpperCase(), u);
  });

  const materialsWithMetrics = dbMaterials.map((m) => {
    // Filter events for this material
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
    const uniqueViewers = new Set<string>();
    validStudentEvents.filter((e) => e.type === "view").forEach((ev) => {
      const userProfile = 
        (ev.users as Record<string, unknown>) || 
        (ev.actor_id ? userMap.get(String(ev.actor_id)) : null) ||
        (ev.actor_email ? userMap.get(String(ev.actor_email).toLowerCase()) : null);
      const roll = (userProfile?.roll_number as string) || ev.actor_roll || ev.metadata?.roll_number || (userProfile?.email as string) || ev.actor_email || ev.actor_id;
      if (roll) uniqueViewers.add(String(roll).toUpperCase());
    });

    // Count distinct students who downloaded this material (strictly 1 count per student)
    const uniqueDownloaders = new Set<string>();
    validStudentEvents.filter((e) => e.type === "download").forEach((ev) => {
      const userProfile = 
        (ev.users as Record<string, unknown>) || 
        (ev.actor_id ? userMap.get(String(ev.actor_id)) : null) ||
        (ev.actor_email ? userMap.get(String(ev.actor_email).toLowerCase()) : null);
      const roll = (userProfile?.roll_number as string) || ev.actor_roll || ev.metadata?.roll_number || (userProfile?.email as string) || ev.actor_email || ev.actor_id;
      if (roll) uniqueDownloaders.add(String(roll).toUpperCase());
    });

    const views = uniqueViewers.size;
    const downloads = uniqueDownloaders.size;

    // Deduplicate valid student events by (roll, action, file) keeping the latest event
    const distinctEventsMap = new Map<string, any>();
    validStudentEvents.forEach((ev) => {
      const userProfile = 
        (ev.users as Record<string, unknown>) || 
        (ev.actor_id ? userMap.get(String(ev.actor_id)) : null) ||
        (ev.actor_email ? userMap.get(String(ev.actor_email).toLowerCase()) : null);

      const userEmail = ((userProfile?.email as string) || ev.actor_email || ev.metadata?.email || "").toLowerCase();
      const roll = (userProfile?.roll_number as string) || ev.actor_roll || ev.metadata?.roll_number || (userEmail.includes("@") ? userEmail.split("@")[0].toUpperCase() : "");
      if (!roll) return; // Skip events without identified student roll

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
      const fileName = ev.file_name || ev.metadata?.file_name;

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
        branch: (userProfile?.branch as string) || m.branch,
        semester: (userProfile?.current_semester as number) || m.semester,
        section: (userProfile?.section as string) || (parseInt(roll.slice(-2), 10) <= 36 ? "A" : "B"),
        action: ev.type === "download" ? "download" : "view",
        fileName: fileName,
        actionDetail: actionDetail,
        timestamp: ev.created_at || new Date().toISOString(),
      };
    });

    // Resolve genuine faculty uploader details
    const ownerUser = 
      (m.users as { name?: string; email?: string } | null) || 
      (m.owner_id ? userMap.get(String(m.owner_id)) : null);

    const facultyName = 
      (ownerUser?.name as string) || 
      (ownerUser?.email ? (ownerUser.email as string).split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "") || 
      "Dr. G. Satyanarayana Reddy";
    
    const facultyEmail = (ownerUser?.email as string) || "satyanarayanareddy@mvgrce.edu.in";

    return {
      ...m,
      views: views,
      downloads: downloads,
      engagementLogs: engagementLogs,
      material_files: m.material_files || [],
      users: {
        name: facultyName,
        email: facultyEmail,
      },
    };
  });

  // Group multi-branch materials sharing the same course unit into a single section
  const groupedMaterialsMap = new Map<string, any>();
  materialsWithMetrics.forEach((m) => {
    const normTitle = (m.title || "").trim().toLowerCase();
    const normSub = (m.subject || "").trim().toUpperCase();
    const sem = m.semester || 0;
    const type = (m.type || "").trim().toLowerCase();
    const key = `${normSub}___${normTitle}___${sem}___${type}`;

    const existing = groupedMaterialsMap.get(key);
    const branch = (m.branch || "CIC").toUpperCase();

    if (existing) {
      if (!existing.ids) existing.ids = [existing.id];
      if (!existing.ids.includes(m.id)) existing.ids.push(m.id);

      if (!existing.branches) existing.branches = [existing.branch];
      if (!existing.branches.includes(branch)) existing.branches.push(branch);

      // Merge files deduplicated by file_name
      const existingFileNames = new Set((existing.material_files || []).map((f: any) => f.file_name));
      (m.material_files || []).forEach((f: any) => {
        if (!existingFileNames.has(f.file_name)) {
          existing.material_files.push(f);
          existingFileNames.add(f.file_name);
        }
      });

      // Merge engagement logs deduplicated by (rollNumber, action, fileName)
      if (m.engagementLogs && m.engagementLogs.length > 0) {
        const logKeyMap = new Map(
          (existing.engagementLogs || []).map((l: any) => [`${(l.rollNumber || l.email).toUpperCase()}__${l.action}__${l.fileName || "workspace"}`, l])
        );
        m.engagementLogs.forEach((l: any) => {
          const key = `${(l.rollNumber || l.email).toUpperCase()}__${l.action}__${l.fileName || "workspace"}`;
          if (!logKeyMap.has(key)) {
            existing.engagementLogs.push(l);
            logKeyMap.set(key, l);
          }
        });
      }

      // Re-calculate unique views and downloads across all linked branches
      const allUniqueViewers = new Set(
        (existing.engagementLogs || [])
          .filter((l: any) => l.action === "view")
          .map((l: any) => (l.rollNumber || l.email).toUpperCase())
      );
      const allUniqueDownloaders = new Set(
        (existing.engagementLogs || [])
          .filter((l: any) => l.action === "download")
          .map((l: any) => (l.rollNumber || l.email).toUpperCase())
      );
      existing.views = allUniqueViewers.size;
      existing.downloads = allUniqueDownloaders.size;
    } else {
      groupedMaterialsMap.set(key, {
        ...m,
        ids: [m.id],
        branches: [branch],
        material_files: [...(m.material_files || [])],
        engagementLogs: [...(m.engagementLogs || [])],
      });
    }
  });

  const consolidatedMaterials = Array.from(groupedMaterialsMap.values());
  // Sort materials with newest at top and oldest at bottom
  consolidatedMaterials.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const totalViews = consolidatedMaterials.reduce((acc, curr) => acc + curr.views, 0);
  const totalDownloads = consolidatedMaterials.reduce((acc, curr) => acc + curr.downloads, 0);

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
    <AnalyticsClient
      materials={consolidatedMaterials}
      branches={branches}
      totalViews={totalViews}
      totalDownloads={totalDownloads}
      students={students}
    />
  );
}
