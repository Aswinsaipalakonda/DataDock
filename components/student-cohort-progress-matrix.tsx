"use client";

import { useState, useMemo } from "react";
import { 
  Eye, 
  Download, 
  FileText, 
  Search, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  MinusCircle, 
  X, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Users, 
  Layers, 
  LayoutGrid, 
  ListFilter 
} from "lucide-react";
import { resolveBranchCode } from "@/lib/utils";

export interface FileInfo {
  id: string;
  file_name: string;
  size?: number;
}

export interface ActivityLogItem {
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

export interface RegisteredStudent {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  branch?: string | null;
  current_semester?: number | null;
  section?: string | null;
  roll_number?: string | null;
}

export interface StudentCohortProgressMatrixProps {
  materialId: string;
  materialTitle: string;
  branch: string;
  branches?: string[];
  linkedMaterialIds?: string[];
  semester: number;
  files: FileInfo[];
  activityLogs: ActivityLogItem[];
  uploaderName?: string;
  students?: RegisteredStudent[];
}

interface StudentFileStatus {
  fileId: string;
  fileName: string;
  viewed: boolean;
  viewCount: number;
  lastViewedAt?: string;
  downloaded: boolean;
  downloadCount: number;
  lastDownloadedAt?: string;
}

interface StudentProgressRecord {
  rollNumber: string;
  studentName: string;
  email: string;
  branch: string;
  semester: number;
  section: string;
  hasDownloaded: boolean;
  hasViewed: boolean;
  isPending: boolean;
  files: StudentFileStatus[];
  totalViews: number;
  totalDownloads: number;
  lastActivityAt?: string;
  lastViewedAt?: string;
  lastDownloadedAt?: string;
}

// Resilient file name normalizer to prevent whitespace / comma mismatch
function normalizeFileName(name?: string): string {
  if (!name) return "";
  try {
    return decodeURIComponent(name)
      .replace(/[,\s_\-.]+/g, " ")
      .trim()
      .toLowerCase();
  } catch {
    return (name || "").replace(/[,\s_\-.]+/g, " ").trim().toLowerCase();
  }
}

// Format timestamp helper
function formatTimestamp(isoString?: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}



export default function StudentCohortProgressMatrix({
  materialId,
  materialTitle,
  branch,
  branches,
  linkedMaterialIds,
  semester,
  files,
  activityLogs,
  uploaderName,
  students,
}: StudentCohortProgressMatrixProps) {
  const [selectedFileFilter, setSelectedFileFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "downloaded" | "viewed" | "pending">("ALL");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [inspectingStudent, setInspectingStudent] = useState<StudentProgressRecord | null>(null);

  const normalizedFiles = useMemo(() => {
    if (files && files.length > 0) return files;
    return [
      { id: "file-default-1", file_name: "Course_Study_Material.pdf" },
    ];
  }, [files]);

  const targetBranches = useMemo(() => {
    if (branches && branches.length > 0) {
      return branches.map((b) => resolveBranchCode(b));
    }
    return branch.split(/[,/]+/).map((b) => resolveBranchCode(b.trim()));
  }, [branch, branches]);

  // Compute Full Cohort Records using actual registered students from User Management matching this class
  const cohortRecords: StudentProgressRecord[] = useMemo(() => {
    const targetSem = Number(semester) || 3;

    // 1. Build deduplicated Map by normalized uppercase roll number
    const cohortMap = new Map<string, { roll: string; name: string; section: string; branch: string; email?: string }>();

    // 2. Overlay all actual registered students from User Management & Roster
    if (students && students.length > 0) {
      students.forEach((s) => {
        if (s.role && s.role !== "student") return;
        const emailLower = (s.email || "").toLowerCase();
        if (emailLower.startsWith("faculty") || emailLower.startsWith("testfaculty") || emailLower.startsWith("admin")) return;

        const roll = (s.roll_number || (s.email?.includes("@") ? s.email.split("@")[0] : "") || "").trim().toUpperCase();
        if (!roll || roll.startsWith("FACULTY") || roll.startsWith("TESTFACULTY") || roll.startsWith("ADMIN")) return;

        const sBranch = resolveBranchCode(s.branch, roll);
        const sSem = Number(s.current_semester);

        // Check if student belongs to this branch cohort
        if (targetBranches.includes(sBranch) && (sSem === targetSem || isNaN(sSem) || !s.current_semester)) {
          const section = (s.section || (parseInt(roll.slice(-2), 10) <= 36 ? "A" : "B")).toUpperCase();
          cohortMap.set(roll, {
            roll,
            name: s.name?.trim() || `Student ${roll.slice(-4)}`,
            section,
            branch: sBranch,
            email: s.email,
          });
        }
      });
    } else if (activityLogs && activityLogs.length > 0) {
      // 3. Fallback only if no registered students provided: overlay verified student engagement activity logs
      activityLogs.forEach((log) => {
        const emailLower = (log.email || "").toLowerCase();
        const logRoll = (log.rollNumber || (log.email?.includes("@") ? log.email.split("@")[0] : "")).trim().toUpperCase();
        
        const isFacultyOrAdmin = 
          logRoll.startsWith("ADMIN") || 
          logRoll.startsWith("FACULTY") || 
          logRoll.startsWith("TESTFACULTY") ||
          emailLower.startsWith("faculty") ||
          emailLower.startsWith("testfaculty") ||
          emailLower.startsWith("admin");

        if (logRoll && !isFacultyOrAdmin) {
          const logBranch = resolveBranchCode(log.branch, logRoll);
          if (targetBranches.includes(logBranch)) {
            const existing = cohortMap.get(logRoll);
            const section = (log.section || existing?.section || (parseInt(logRoll.slice(-2), 10) <= 36 ? "A" : "B")).toUpperCase();
            cohortMap.set(logRoll, {
              roll: logRoll,
              name: (existing && existing.name && !existing.name.startsWith("Student ")) ? existing.name : (log.studentName || `Student ${logRoll.slice(-4)}`),
              section,
              branch: logBranch,
              email: log.email || existing?.email,
            });
          }
        }
      });
    }

    const rawCohort = Array.from(cohortMap.values());

    // Sort cohort consistently by roll number (e.g., 23331A4701, 23331A4702, ...)
    rawCohort.sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: "base" }));

    return rawCohort.map((c) => {
      // Find all activity events matching this student
      const studentEvents = activityLogs.filter((log) => {
        const r1 = (log.rollNumber || "").toUpperCase();
        const r2 = c.roll.toUpperCase();
        const logEmail = (log.email || "").toLowerCase();
        const cEmail = (c.email || "").toLowerCase();

        const rollMatch = r1 === r2;
        const emailMatch = (cEmail && logEmail === cEmail) || (c.roll && logEmail.includes(c.roll.toLowerCase()));
        const nameMatch = log.studentName && c.name && log.studentName.toLowerCase() === c.name.toLowerCase();

        return rollMatch || emailMatch || nameMatch;
      });

      // Sort student events by timestamp descending (newest first)
      studentEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Compute status for each file
      const fileStatuses: StudentFileStatus[] = normalizedFiles.map((f) => {
        const normTarget = normalizeFileName(f.file_name);

        const fileEvents = studentEvents.filter((e) => {
          // If there's only 1 file in the material, all file-level events match it
          if (normalizedFiles.length === 1 && (e.action === "download" || (e.action === "view" && e.actionDetail && e.actionDetail !== "Viewed Material Workspace"))) {
            return true;
          }

          // Try direct fileName match
          if (e.fileName) {
            const normEv = normalizeFileName(e.fileName);
            if (normEv === normTarget || normEv.includes(normTarget) || normTarget.includes(normEv)) {
              return true;
            }
          }

          // Fallback: extract file name from actionDetail (e.g. "Previewed: image-Photoroom.png" or "Downloaded: file.pdf")
          if (e.actionDetail) {
            const detailMatch = e.actionDetail.match(/(?:Previewed|Downloaded|Viewed):\s*(.+)/i);
            if (detailMatch && detailMatch[1]) {
              const normDetail = normalizeFileName(detailMatch[1].trim());
              if (normDetail === normTarget || normDetail.includes(normTarget) || normTarget.includes(normDetail)) {
                return true;
              }
            }
          }

          return false;
        });

        // Separate and sort view and download events descending (newest first)
        const viewEvents = fileEvents
          .filter((e) => e.action === "view")
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const downloadEvents = fileEvents
          .filter((e) => e.action === "download")
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const lastView = viewEvents.length > 0 ? viewEvents[0].timestamp : undefined;
        const lastDownload = downloadEvents.length > 0 ? downloadEvents[0].timestamp : undefined;

        return {
          fileId: f.id,
          fileName: f.file_name,
          viewed: viewEvents.length > 0,
          viewCount: viewEvents.length > 0 ? 1 : 0, // strictly 1 per student
          lastViewedAt: lastView,
          downloaded: downloadEvents.length > 0,
          downloadCount: downloadEvents.length > 0 ? 1 : 0, // strictly 1 per student
          lastDownloadedAt: lastDownload,
        };
      });

      let hasDownloaded = false;
      let hasViewed = false;

      if (selectedFileFilter === "ALL") {
        hasDownloaded = fileStatuses.some((fs) => fs.downloaded) || studentEvents.some((e) => e.action === "download");
        hasViewed = fileStatuses.some((fs) => fs.viewed) || studentEvents.some((e) => e.action === "view");
      } else {
        const normFilter = normalizeFileName(selectedFileFilter);
        const targetFs = fileStatuses.find((fs) => normalizeFileName(fs.fileName) === normFilter);
        hasDownloaded = !!targetFs?.downloaded;
        hasViewed = !!targetFs?.viewed;
      }

      const isPending = !hasDownloaded && !hasViewed;

      const viewEvents = studentEvents.filter((e) => e.action === "view");
      const downloadEvents = studentEvents.filter((e) => e.action === "download");
      const lastViewedAt = viewEvents.length > 0 ? viewEvents[0].timestamp : undefined;
      const lastDownloadedAt = downloadEvents.length > 0 ? downloadEvents[0].timestamp : undefined;
      const lastActivityAt = studentEvents.length > 0 ? studentEvents[0].timestamp : undefined;

      return {
        rollNumber: c.roll,
        studentName: c.name,
        email: c.email || `${c.roll.toLowerCase()}@mvgrce.edu.in`,
        branch: c.branch || branch || "CIC",
        semester: semester || 3,
        section: c.section,
        hasDownloaded,
        hasViewed,
        isPending,
        files: fileStatuses,
        totalViews: hasViewed ? 1 : 0,
        totalDownloads: hasDownloaded ? 1 : 0,
        lastActivityAt,
        lastViewedAt,
        lastDownloadedAt,
      };
    });
  }, [targetBranches, semester, activityLogs, normalizedFiles, selectedFileFilter, students, branch]);

  const totalCount = cohortRecords.length;
  const downloadedCount = cohortRecords.filter((r) => r.hasDownloaded).length;
  const viewedCount = cohortRecords.filter((r) => r.hasViewed).length;
  const pendingCount = cohortRecords.filter((r) => r.isPending).length;

  const downloadPct = totalCount > 0 ? Math.round((downloadedCount / totalCount) * 100) : 0;
  const viewPct = totalCount > 0 ? Math.round((viewedCount / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;

  // Available Branches and Sections in the cohort
  const availableBranches = useMemo(() => {
    const bSet = new Set<string>();
    cohortRecords.forEach((r) => {
      if (r.branch) bSet.add(r.branch.toUpperCase());
    });
    return Array.from(bSet).sort();
  }, [cohortRecords]);

  const availableSections = useMemo(() => {
    const sSet = new Set<string>();
    cohortRecords.forEach((r) => {
      if (r.section) sSet.add(r.section.toUpperCase());
    });
    return Array.from(sSet).sort();
  }, [cohortRecords]);

  // Default page size is 96 cards as requested
  const [cohortPage, setCohortPage] = useState(1);
  const [cohortPageSize, setCohortPageSize] = useState(96);

  const filteredCohort = useMemo(() => {
    return cohortRecords.filter((r) => {
      if (selectedBranchFilter !== "ALL" && r.branch.toUpperCase() !== selectedBranchFilter.toUpperCase()) {
        return false;
      }
      if (selectedSectionFilter !== "ALL" && r.section.toUpperCase() !== selectedSectionFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter === "downloaded" && !r.hasDownloaded) return false;
      if (statusFilter === "viewed" && !r.hasViewed) return false;
      if (statusFilter === "pending" && !r.isPending) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const rollMatch = r.rollNumber.toLowerCase().includes(q);
        const nameMatch = r.studentName.toLowerCase().includes(q);
        return rollMatch || nameMatch;
      }
      return true;
    });
  }, [cohortRecords, selectedBranchFilter, selectedSectionFilter, statusFilter, searchQuery]);

  const totalCohortPages = Math.max(1, Math.ceil(filteredCohort.length / cohortPageSize));
  const validCohortPage = Math.min(cohortPage, totalCohortPages);

  const paginatedCohort = useMemo(() => {
    const start = (validCohortPage - 1) * cohortPageSize;
    return filteredCohort.slice(start, start + cohortPageSize);
  }, [filteredCohort, validCohortPage, cohortPageSize]);

  // Export Matrix to CSV
  const handleExportMatrixCSV = () => {
    const headers = [
      "Roll Number",
      "Student Name",
      "Official Email",
      "Branch",
      "Semester",
      "Section",
      "Downloaded Any",
      "Viewed Any",
      ...normalizedFiles.flatMap((f) => [
        `${f.file_name} (Viewed)`,
        `${f.file_name} (Last Viewed Time)`,
        `${f.file_name} (Downloaded)`,
        `${f.file_name} (Last Downloaded Time)`
      ]),
      "Total Views",
      "Total Downloads",
      "Last Overall Activity",
    ];

    const rows = cohortRecords.map((r) => [
      `"${r.rollNumber}"`,
      `"${r.studentName}"`,
      `"${r.email}"`,
      `"${r.branch}"`,
      r.semester,
      `"${r.section}"`,
      r.hasDownloaded ? "YES" : "NO",
      r.hasViewed ? "YES" : "NO",
      ...r.files.flatMap((f) => [
        f.viewed ? `YES (${f.viewCount})` : "NO",
        f.lastViewedAt ? `"${formatTimestamp(f.lastViewedAt)}"` : '"N/A"',
        f.downloaded ? `YES (${f.downloadCount})` : "NO",
        f.lastDownloadedAt ? `"${formatTimestamp(f.lastDownloadedAt)}"` : '"N/A"',
      ]),
      r.totalViews,
      r.totalDownloads,
      r.lastActivityAt ? `"${formatTimestamp(r.lastActivityAt)}"` : '"N/A"',
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${materialTitle.slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_")}_cohort_progress_${branch}_Sem${semester}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full">
      {/* ========================================================================= */}
      {/* 1. HERO COHORT ANALYTICS CARD */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-white border border-white/20">
                {branch} • Sem {semester}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-semibold">
                {totalCount} Enrolled Students
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {materialTitle}
            </h2>
          </div>

          <button
            onClick={handleExportMatrixCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold rounded-full backdrop-blur-md shadow-sm cursor-pointer transition-all self-start sm:self-auto"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Downloaded */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md space-y-1">
            <div className="flex items-center justify-between text-emerald-300 text-[11px] font-semibold">
              <span>Downloaded</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-white">{downloadedCount}</span>
              <span className="text-[10px] text-emerald-300 font-medium">({downloadPct}%)</span>
            </div>
          </div>

          {/* Viewed */}
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-md space-y-1">
            <div className="flex items-center justify-between text-amber-300 text-[11px] font-semibold">
              <span>Viewed</span>
              <Eye className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-white">{viewedCount}</span>
              <span className="text-[10px] text-amber-300 font-medium">({viewPct}%)</span>
            </div>
          </div>

          {/* Pending */}
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 backdrop-blur-md space-y-1">
            <div className="flex items-center justify-between text-rose-300 text-[11px] font-semibold">
              <span>Pending</span>
              <MinusCircle className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-white">{pendingCount}</span>
              <span className="text-[10px] text-rose-300 font-medium">({totalCount > 0 ? Math.round((pendingCount/totalCount)*100) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex shadow-inner">
          {downloadPct > 0 && (
            <div 
              style={{ width: `${downloadPct}%` }} 
              className="bg-emerald-400 h-full transition-all duration-500" 
              title={`Downloaded: ${downloadedCount}`}
            />
          )}
          {viewPct > downloadPct && (
            <div 
              style={{ width: `${viewPct - downloadPct}%` }} 
              className="bg-amber-400 h-full transition-all duration-500" 
              title={`Viewed Only: ${viewedCount - downloadedCount}`}
            />
          )}
          {pendingPct > 0 && (
            <div 
              style={{ width: `${pendingPct}%` }} 
              className="bg-rose-400/80 h-full transition-all duration-500" 
              title={`Pending: ${pendingCount}`}
            />
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TARGET DOCUMENT SELECTOR */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Filter by Document:
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedFileFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFileFilter === "ALL"
                ? "bg-primary text-white shadow-md"
                : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium shadow-2xs"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Files Combined ({normalizedFiles.length})</span>
          </button>

          {normalizedFiles.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFileFilter(f.file_name)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFileFilter === f.file_name
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium shadow-2xs"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              <span className="truncate max-w-[180px]">{f.file_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTROLS BAR: STATUS TABS, SEARCH, VIEW MODE */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Row 1: Status Pills & View Mode */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Status Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("downloaded")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                statusFilter === "downloaded"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>Downloaded ({downloadedCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter("viewed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                statusFilter === "viewed"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span>Viewed ({viewedCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                statusFilter === "pending"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>Pending ({pendingCount})</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center self-end md:self-auto p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <ListFilter className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Branch & Section Filter, Page Size, and Flexible Search Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Branch Filter */}
            {availableBranches.length > 1 && (
              <select
                value={selectedBranchFilter}
                onChange={(e) => {
                  setSelectedBranchFilter(e.target.value);
                  setCohortPage(1);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-full text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">All Branches ({totalCount})</option>
                {availableBranches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {/* Section Filter */}
            {availableSections.length > 0 && (
              <select
                value={selectedSectionFilter}
                onChange={(e) => {
                  setSelectedSectionFilter(e.target.value);
                  setCohortPage(1);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-full text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>Sec {sec}</option>
                ))}
              </select>
            )}

           
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56 md:w-64 shrink-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              placeholder="Search roll or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:border-primary text-slate-900 placeholder:text-slate-400 font-normal transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STUDENT ROLL CARDS MATRIX (GRID VIEW) */}
      {/* ========================================================================= */}
      {viewMode === "grid" ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500 font-medium px-1">
            <span>
              Showing{" "}
              <strong className="text-slate-900 font-semibold">
                {filteredCohort.length > 0 ? (validCohortPage - 1) * cohortPageSize + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-900 font-semibold">
                {Math.min(validCohortPage * cohortPageSize, filteredCohort.length)}
              </strong>{" "}
              of <strong className="text-slate-900 font-semibold">{filteredCohort.length}</strong> Students (Cohort: {totalCount})
            </span>
            <span className="text-[11px] text-slate-400">Click any card to inspect file details</span>
          </div>

          {filteredCohort.length > 0 ? (
            <div className="grid grid-cols-1 min-[440px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 p-2 sm:p-2.5 bg-slate-50/50 rounded-2xl border border-slate-200/80">
              {paginatedCohort.map((student) => {
                const isDownloaded = student.hasDownloaded;
                const isViewed = student.hasViewed;

                let borderClasses = "border-slate-200 bg-white hover:border-slate-300 text-slate-700";
                let badgeClasses = "bg-slate-100 text-slate-600";
                let statusLabel = "Pending";
                let StatusIcon = MinusCircle;

                if (isDownloaded) {
                  borderClasses = "border-emerald-300 bg-emerald-50/90 hover:border-emerald-400 text-emerald-950 shadow-2xs";
                  badgeClasses = "bg-emerald-600 text-white font-bold";
                  statusLabel = "Downloaded";
                  StatusIcon = CheckCircle2;
                } else if (isViewed) {
                  borderClasses = "border-amber-300 bg-amber-50/90 hover:border-amber-400 text-amber-950 shadow-2xs";
                  badgeClasses = "bg-amber-500 text-white font-bold";
                  statusLabel = "Viewed";
                  StatusIcon = Eye;
                }

                return (
                  <button
                    key={student.rollNumber}
                    onClick={() => setInspectingStudent(student)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:scale-[1.02] ${borderClasses}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-extrabold tracking-tight">
                        {student.rollNumber}
                      </span>
                      <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold truncate block w-full">
                        {student.studentName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        {student.branch} • Sec {student.section}
                      </span>
                    </div>

                    {/* Timestamp & Status Badge */}
                    <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${badgeClasses}`}>
                          {statusLabel}
                        </span>
                        <ChevronRight className="h-3 w-3 text-slate-400" />
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {isDownloaded && student.lastDownloadedAt ? (
                          <span className="text-emerald-700 font-medium">Downloaded: {formatTimestamp(student.lastDownloadedAt)}</span>
                        ) : isViewed && student.lastViewedAt ? (
                          <span className="text-amber-700 font-medium">Viewed: {formatTimestamp(student.lastViewedAt)}</span>
                        ) : (
                          <span className="text-slate-400">Not opened yet</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {totalCount === 0 
                  ? `No students are registered for ${targetBranches.join(", ")} • Semester ${semester} in User Management yet.`
                  : `No students match the current filters.`
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* 5. TABLE VIEW */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 pl-4 pr-2">Roll</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-2">Branch & Sec</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2">Timestamp</th>
                  <th className="py-2.5 px-2 text-center">Views</th>
                  <th className="py-2.5 px-2 text-center">Downloads</th>
                  <th className="py-2.5 pr-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedCohort.map((student) => {
                  const isDownloaded = student.hasDownloaded;
                  const isViewed = student.hasViewed;

                  return (
                    <tr key={student.rollNumber} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 pl-4 pr-2 font-bold text-slate-900 text-xs">
                        {student.rollNumber}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 text-xs">
                        {student.studentName}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-600 text-xs">
                        {student.branch} • Sec {student.section}
                      </td>
                      <td className="py-2.5 px-2">
                        {isDownloaded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Downloaded</span>
                          </span>
                        ) : isViewed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            <Eye className="h-3 w-3" />
                            <span>Viewed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-normal">
                            <MinusCircle className="h-3 w-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-slate-500">
                        {isDownloaded && student.lastDownloadedAt
                          ? formatTimestamp(student.lastDownloadedAt)
                          : isViewed && student.lastViewedAt
                          ? formatTimestamp(student.lastViewedAt)
                          : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-blue-700">
                        {student.totalViews}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-700">
                        {student.totalDownloads}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <button
                          onClick={() => setInspectingStudent(student)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-full text-[11px] cursor-pointer"
                        >
                          Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cohort Pagination Controls */}
      {filteredCohort.length > 0 && totalCohortPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-normal">
            <span>
              Page <strong className="text-slate-900 font-semibold">{validCohortPage}</strong> of <strong className="text-slate-900 font-semibold">{totalCohortPages}</strong>
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <label htmlFor="cohortPageSize" className="text-slate-400 text-[11px]">Per page:</label>
              <select
                id="cohortPageSize"
                value={cohortPageSize}
                onChange={(e) => {
                  setCohortPageSize(parseInt(e.target.value, 10));
                  setCohortPage(1);
                }}
                className="px-2 py-0.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-full text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCohortPage(1)}
              disabled={validCohortPage === 1}
              className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCohortPage((p) => Math.max(1, p - 1))}
              disabled={validCohortPage === 1}
              className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalCohortPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalCohortPages <= 5) return true;
                  if (p === 1 || p === totalCohortPages) return true;
                  return Math.abs(p - validCohortPage) <= 1;
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && p - prev > 1;
                  return (
                    <div key={p} className="flex items-center gap-1">
                      {hasGap && <span className="text-slate-400 text-xs px-0.5">...</span>}
                      <button
                        onClick={() => setCohortPage(p)}
                        className={`min-w-[26px] h-6 px-1.5 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                          validCohortPage === p
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={() => setCohortPage((p) => Math.min(totalCohortPages, p + 1))}
              disabled={validCohortPage === totalCohortPages}
              className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCohortPage(totalCohortPages)}
              disabled={validCohortPage === totalCohortPages}
              className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STUDENT DETAILED PER-FILE AUDIT MODAL WITH DUAL INDEPENDENT TIMESTAMPS */}
      {/* ========================================================================= */}
      {inspectingStudent && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-slate-900 text-white text-xs font-bold">
                    {inspectingStudent.rollNumber}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    inspectingStudent.hasDownloaded
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : inspectingStudent.hasViewed
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {inspectingStudent.hasDownloaded
                      ? "Downloaded Files"
                      : inspectingStudent.hasViewed
                      ? "Viewed Material"
                      : "Pending"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {inspectingStudent.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingStudent.email} • {inspectingStudent.branch} Sem {inspectingStudent.semester} (Sec {inspectingStudent.section})
                </p>
                {inspectingStudent.lastViewedAt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full w-fit mt-1">
                    <Clock className="h-3 w-3 text-amber-600" />
                    <span>Material Page Visited: {formatTimestamp(inspectingStudent.lastViewedAt)}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setInspectingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Per-File Breakdown List with Explicit View & Download Timestamps */}
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {inspectingStudent.files.map((file) => (
                <div
                  key={file.fileId}
                  className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/80 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {file.fileName}
                    </span>
                  </div>

                  {/* Status & Timestamps Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-xs">
                    {/* View Action Status & Timestamp */}
                    <div className="p-2 rounded-xl bg-white border border-slate-200/60 space-y-1">
                      {file.viewed ? (
                        <>
                          <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                            <span>Viewed ({file.viewCount}x)</span>
                          </div>
                          {file.lastViewedAt && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                              <span>{formatTimestamp(file.lastViewedAt)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 font-normal py-0.5">
                          <MinusCircle className="h-3.5 w-3.5" />
                          <span>Not Viewed</span>
                        </div>
                      )}
                    </div>

                    {/* Download Action Status & Timestamp */}
                    <div className="p-2 rounded-xl bg-white border border-slate-200/60 space-y-1">
                      {file.downloaded ? (
                        <>
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Downloaded ({file.downloadCount}x)</span>
                          </div>
                          {file.lastDownloadedAt && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                              <span>{formatTimestamp(file.lastDownloadedAt)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 font-normal py-0.5">
                          <MinusCircle className="h-3.5 w-3.5" />
                          <span>Not Downloaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingStudent(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-full cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
