"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Eye, 
  Download, 
  BookOpen, 
  FileSpreadsheet, 
  Search, 
  Loader2, 
  BarChart3, 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsLeft,
  ChevronsRight,
  X, 
  GraduationCap,
  Trash2,
  FileText,
  AlertTriangle
} from "lucide-react";
import { logExportEvent, adminDeleteMaterial, adminDeleteMaterialFile } from "./actions";
import { ToastContainer, ToastMessage } from "@/components/toast";
import { StudentEngagementLog } from "./page";
import StudentCohortProgressMatrix, { RegisteredStudent } from "@/components/student-cohort-progress-matrix";

export interface AdminFileInfo {
  id: string;
  file_name: string;
  size?: number;
  file_size?: number;
  mime_type?: string;
  version?: number;
  storage_ref?: string;
  storage_path?: string;
  is_primary?: boolean;
}

interface MaterialWithMetrics {
  id: string;
  ids?: string[];
  title: string;
  type: string;
  branch: string;
  branches?: string[];
  semester: number;
  created_at: string;
  views: number;
  downloads: number;
  material_files?: AdminFileInfo[];
  engagementLogs?: StudentEngagementLog[];
  users: {
    name: string;
    email: string;
  } | null;
}

interface AnalyticsClientProps {
  materials: MaterialWithMetrics[];
  branches: { code: string; name: string }[];
  totalViews: number;
  totalDownloads: number;
  students?: RegisteredStudent[];
}

export default function AnalyticsClient({
  materials,
  branches,
  totalViews,
  totalDownloads,
  students,
}: AnalyticsClientProps) {
  const [materialsList, setMaterialsList] = useState<MaterialWithMetrics[]>(materials);
  useEffect(() => {
    setMaterialsList(materials);
  }, [materials]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedSemester, setSelectedSemester] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [isExporting, setIsExporting] = useState(false);

  // Admin CRUD States
  const [deleteMaterialTarget, setDeleteMaterialTarget] = useState<MaterialWithMetrics | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  const [fileManageMaterial, setFileManageMaterial] = useState<MaterialWithMetrics | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [downloadingFileRef, setDownloadingFileRef] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Smooth Drawer Animation States (Like Add New User)
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [inspectingMaterial, setInspectingMaterial] = useState<MaterialWithMetrics | null>(null);

  // Scroll Container Ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Body Scroll Lock when Drawer or Modals are open
  useEffect(() => {
    if (isDrawerMounted || deleteMaterialTarget || fileManageMaterial) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerMounted, deleteMaterialTarget, fileManageMaterial]);

  // Focus scroll container when drawer becomes visible
  useEffect(() => {
    if (isDrawerVisible && scrollContainerRef.current) {
      scrollContainerRef.current.focus();
    }
  }, [isDrawerVisible]);

  // Direct wheel scroll bridge
  const handleScrollWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += e.deltaY;
    }
  };

  const addToast = (type: "success" | "error" | "info", title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(2) + " MB";
    const kb = bytes / 1024;
    return kb.toFixed(1) + " KB";
  };

  // Admin: Delete Material Handler
  const handleDeleteMaterial = async () => {
    if (!deleteMaterialTarget) return;
    setIsDeletingMaterial(true);
    try {
      const res = await adminDeleteMaterial(deleteMaterialTarget.id, deleteMaterialTarget.ids);
      if (res.success) {
        const targetIds = deleteMaterialTarget.ids || [deleteMaterialTarget.id];
        setMaterialsList((prev) => prev.filter((m) => !targetIds.includes(m.id)));
        addToast("success", "Material Removed", `Successfully deleted "${deleteMaterialTarget.title}".`);
        setDeleteMaterialTarget(null);
      } else {
        addToast("error", "Failed to Delete", res.error || "An error occurred.");
      }
    } catch {
      addToast("error", "Action Failed", "Failed to delete material.");
    } finally {
      setIsDeletingMaterial(false);
    }
  };

  // Admin: Delete Single File Handler
  const handleDeleteFile = async (fileId: string, storageRef?: string, fileName?: string) => {
    if (!fileManageMaterial) return;
    setDeletingFileId(fileId);
    try {
      const res = await adminDeleteMaterialFile(fileManageMaterial.id, fileId, storageRef);
      if (res.success) {
        const updatedFiles = (fileManageMaterial.material_files || []).filter((f) => f.id !== fileId);
        const updatedMat = { ...fileManageMaterial, material_files: updatedFiles };
        setFileManageMaterial(updatedMat);
        setMaterialsList((prev) =>
          prev.map((m) => (m.id === fileManageMaterial.id ? updatedMat : m))
        );
        addToast("success", "File Deleted", `Removed "${fileName || "file"}" from syllabus.`);
      } else {
        addToast("error", "Failed to Delete File", res.error || "An error occurred.");
      }
    } catch {
      addToast("error", "Action Failed", "Failed to delete file.");
    } finally {
      setDeletingFileId(null);
    }
  };

  // Admin: Download File Handler
  const handleDownloadFile = (storageRef?: string, fileName?: string) => {
    if (!storageRef) return;
    setDownloadingFileRef(storageRef);
    try {
      const downloadUrl = `/api/materials/file/${storageRef}?download=1&filename=${encodeURIComponent(fileName || "file")}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName || "file";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      addToast("error", "Download Failed", "Unable to download file.");
    } finally {
      setDownloadingFileRef(null);
    }
  };

  // Admin: Preview File Handler
  const handlePreviewFile = (storageRef?: string, fileName?: string) => {
    if (!storageRef) return;
    const previewUrl = `/api/materials/file/${storageRef}?filename=${encodeURIComponent(fileName || "file")}`;
    window.open(previewUrl, "_blank");
  };

  const materialTypes = useMemo(() => {
    const types = new Set<string>();
    materialsList.forEach((m) => {
      if (m.type) types.add(m.type);
    });
    return Array.from(types).sort();
  }, [materialsList]);

  // Smooth open drawer (matched to Add New User)
  const openInspectModal = (material: MaterialWithMetrics) => {
    setInspectingMaterial(material);
    setIsDrawerMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsDrawerVisible(true);
      });
    });
  };

  // Smooth close drawer (matched to Add New User with 500ms exit transition)
  const closeInspectModal = () => {
    setIsDrawerVisible(false);
    setTimeout(() => {
      setIsDrawerMounted(false);
      setInspectingMaterial(null);
    }, 500);
  };

  const filtered = useMemo(() => {
    const list = materialsList.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = m.title.toLowerCase().includes(q);
        const facultyMatch = (m.users?.name || "").toLowerCase().includes(q);
        const typeMatch = m.type.toLowerCase().includes(q);
        const branchMatch = m.branch.toLowerCase().includes(q);
        if (!titleMatch && !facultyMatch && !typeMatch && !branchMatch) {
          return false;
        }
      }

      if (selectedBranch !== "ALL") {
        const matchesBranch = m.branches && m.branches.length > 0 
          ? m.branches.includes(selectedBranch) 
          : m.branch === selectedBranch;
        if (!matchesBranch) return false;
      }

      if (selectedSemester !== "ALL" && m.semester !== parseInt(selectedSemester, 10)) {
        return false;
      }

      if (selectedType !== "ALL" && m.type !== selectedType) {
        return false;
      }

      return true;
    });

    // Ensure recent materials at top, old at bottom
    return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [materialsList, searchQuery, selectedBranch, selectedSemester, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Auto-clamp current page if filters reduce total pages
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMaterials = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, validCurrentPage, pageSize]);

  const handleExportAllCSV = async () => {
    if (filtered.length === 0) {
      addToast("info", "Nothing to Export", "No materials match your current filters.");
      return;
    }

    setIsExporting(true);
    try {
      const headers = ["Title", "Category", "Branch", "Semester", "Faculty Contributor", "Faculty Email", "Total Views", "Total Downloads", "Uploaded Date"];
      const rows = filtered.map((m) => [
        `"${(m.title || "").replace(/"/g, '""')}"`,
        `"${m.type || ""}"`,
        `"${m.branch || ""}"`,
        m.semester,
        `"${(m.users?.name || "System").replace(/"/g, '""')}"`,
        `"${m.users?.email || ""}"`,
        m.views,
        m.downloads,
        `"${new Date(m.created_at).toISOString()}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `mvgr_de_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await logExportEvent("material_analytics", filtered.length);
      addToast("success", "Export Successful", `Downloaded engagement report for ${filtered.length} resources.`);
    } catch {
      addToast("error", "Export Failed", "Failed to generate CSV analytics report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 w-full max-w-7xl pb-10">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Curriculum Analytics & Student Engagement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Analyze student engagement across full cohorts with Red/Orange/Green progress cards and file-level audits.
          </p>
        </div>

        <button
          onClick={handleExportAllCSV}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 self-start md:self-auto"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          <span>Export Analytics CSV</span>
        </button>
      </div>

      {/* Overview Metrics Grid - 3 cards in 1 row on mobile, tablet, and desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5">
        <div className="p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-1.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Views
            </span>
            <div className="p-1 sm:p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900">{totalViews}</span>
            <span className="text-[9px] sm:text-xs text-slate-400 block font-normal truncate">Audited views</span>
          </div>
        </div>

        <div className="p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-1.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Downloads
            </span>
            <div className="p-1 sm:p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900">{totalDownloads}</span>
            <span className="text-[9px] sm:text-xs text-slate-400 block font-normal truncate">Verified downloads</span>
          </div>
        </div>

        <div className="p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-1.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Materials
            </span>
            <div className="p-1 sm:p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900">{materialsList.length}</span>
            <span className="text-[9px] sm:text-xs text-slate-400 block font-normal truncate">Active syllabus</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden space-y-4">
        {/* Filters Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search by title, faculty, or material type..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 font-normal transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-full text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code}
                </option>
              ))}
            </select>

            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-full text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Sem {s}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-full text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {materialTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table View */}
        {paginatedMaterials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 pl-6 pr-4">Material Info</th>
                  <th className="py-3.5 px-4">Faculty Uploader</th>
                  <th className="py-3.5 px-4">Academic Scope</th>
                  <th className="py-3.5 px-4 text-center">Views</th>
                  <th className="py-3.5 px-4 text-center">Downloads</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                {paginatedMaterials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 pl-6 pr-4 max-w-xs sm:max-w-sm">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 block leading-snug truncate group-hover:text-primary transition-colors">
                          {m.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            {m.type}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-800 block text-xs sm:text-sm">
                          {m.users?.name || "Dr. G. Satyanarayana Reddy"}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[170px]">
                          {m.users?.email || "satyanarayanareddy@mvgrce.edu.in"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(m.branches && m.branches.length > 0 ? m.branches : [m.branch]).map((b) => (
                          <span key={b} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                            {b}
                          </span>
                        ))}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Sem {m.semester}
                        </span>
                      </div>
                    </td>

                    {/* Interactive Views Pill */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openInspectModal(m)}
                        title="Click to view student progress matrix"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-2xs cursor-pointer group/btn"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600 group-hover/btn:scale-110 transition-transform" />
                        <span>{m.views}</span>
                      </button>
                    </td>

                    {/* Interactive Downloads Pill */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openInspectModal(m)}
                        title="Click to view student download matrix"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all shadow-2xs cursor-pointer group/btn"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-600 group-hover/btn:scale-110 transition-transform" />
                        <span>{m.downloads}</span>
                      </button>
                    </td>

                    {/* Admin Actions */}
                    <td className="py-3.5 pl-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openInspectModal(m)}
                          title="View Full Cohort Progress Matrix"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Cohort Matrix</span>
                        </button>

                        <button
                          onClick={() => setFileManageMaterial(m)}
                          title="Inspect and Delete Attached Files"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Files ({m.material_files?.length || 0})</span>
                        </button>

                        <button
                          onClick={() => setDeleteMaterialTarget(m)}
                          title="Delete Syllabus Material"
                          className="p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">No Material Metrics Found</h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5 max-w-sm mx-auto">
                No syllabus resources match your current filter selections.
              </p>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 text-xs font-normal text-slate-500">
              <span>
                Showing{" "}
                <span className="text-slate-900 font-semibold">
                  {Math.min((validCurrentPage - 1) * pageSize + 1, filtered.length)}
                </span>{" "}
                to{" "}
                <span className="text-slate-900 font-semibold">
                  {Math.min(validCurrentPage * pageSize, filtered.length)}
                </span>{" "}
                of <span className="text-slate-900 font-semibold">{filtered.length}</span> materials
              </span>

              <div className="flex items-center gap-1.5">
                <label htmlFor="analyticsPageSize" className="text-slate-500">Rows:</label>
                <select
                  id="analyticsPageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-0.5 text-xs font-medium bg-white border border-slate-200 rounded-full text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Jump to First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="First Page"
                aria-label="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - validCurrentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasGap = prev && p - prev > 1;
                    return (
                      <div key={p} className="flex items-center gap-1">
                        {hasGap && <span className="text-slate-400 text-xs px-0.5">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[28px] h-7 px-2 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                            validCurrentPage === p
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {/* Jump to Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Last Page"
                aria-label="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LUXURIOUS SMOOTH SLIDE-OVER DRAWER (MATCHED TO ADD NEW USER ANIMATION) */}
      {/* ========================================================================= */}
      {isDrawerMounted && inspectingMaterial && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop with 500ms smooth cubic-bezier transition */}
          <div 
            onClick={closeInspectModal}
            className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
              isDrawerVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Right Slide-over Panel with 500ms smooth cubic-bezier slide */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-6 md:pl-10 z-50">
            <div 
              className={`w-screen max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-white shadow-2xl flex flex-col border-l border-slate-200 transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overscroll-contain ${
                isDrawerVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
              }`}
            >
              
              {/* Fixed Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="p-2 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                      Student Cohort Progress Matrix
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-normal">
                      Real-time class engagement analytics and per-file audit trails.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeInspectModal}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Close Window"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Dedicated Scroll Container with onWheel & Direct Scroll Bridge */}
              <div 
                ref={scrollContainerRef}
                tabIndex={0}
                onWheel={handleScrollWheel}
                className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 focus:outline-none"
                style={{
                  overscrollBehavior: "contain",
                  touchAction: "pan-y",
                }}
              >
                <StudentCohortProgressMatrix
                  materialId={inspectingMaterial.id}
                  materialTitle={inspectingMaterial.title}
                  branch={inspectingMaterial.branches ? inspectingMaterial.branches.join(", ") : inspectingMaterial.branch}
                  branches={inspectingMaterial.branches}
                  linkedMaterialIds={inspectingMaterial.ids}
                  semester={inspectingMaterial.semester}
                  files={inspectingMaterial.material_files || []}
                  activityLogs={inspectingMaterial.engagementLogs || []}
                  uploaderName={inspectingMaterial.users?.name || "Faculty Member"}
                  students={students}
                />
                <div className="h-20" />
              </div>

              {/* Fixed Footer */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-slate-500 font-normal">
                  Verified Engagement: <strong className="text-slate-900 font-semibold">{inspectingMaterial.views || 0} Viewed</strong> • <strong className="text-slate-900 font-semibold">{inspectingMaterial.downloads || 0} Downloaded</strong>
                </span>
                <button
                  type="button"
                  onClick={closeInspectModal}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-full shadow-xs cursor-pointer whitespace-nowrap"
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* DELETE MATERIAL CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteMaterialTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Delete Syllabus Material
                </h3>
                <p className="text-xs text-slate-500">
                  This action will archive and hide the document.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="font-semibold text-slate-800 line-clamp-2">
                {deleteMaterialTarget.title}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="font-medium text-slate-700">{deleteMaterialTarget.branch} • Sem {deleteMaterialTarget.semester}</span>
                <span>•</span>
                <span>{deleteMaterialTarget.users?.name || "Faculty Member"}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this course material? It will immediately disappear from both student and faculty portals.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteMaterialTarget(null)}
                disabled={isDeletingMaterial}
                className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMaterial}
                disabled={isDeletingMaterial}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isDeletingMaterial ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGE ATTACHED FILES MODAL (ADMIN CRUD FOR MISTAKEN FILES) */}
      {/* ========================================================================= */}
      {fileManageMaterial && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Attached Files Management
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1 max-w-md">
                    {fileManageMaterial.title}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setFileManageMaterial(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1 space-y-2">
              {fileManageMaterial.material_files && fileManageMaterial.material_files.length > 0 ? (
                fileManageMaterial.material_files.map((file) => {
                  const isDeleting = deletingFileId === file.id;
                  const isDownloading = downloadingFileRef === (file.storage_ref || file.storage_path);
                  return (
                    <div
                      key={file.id}
                      className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 hover:bg-slate-100/70 rounded-2xl border border-slate-200/80 transition-all text-xs"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 truncate max-w-xs block">
                              {file.file_name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] font-bold">
                              v{file.version || 1}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {formatSize(file.file_size || file.size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePreviewFile(file.storage_ref || file.storage_path, file.file_name)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                        >
                          <Eye className="h-3 w-3 text-blue-600" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file.storage_ref || file.storage_path, file.file_name)}
                          disabled={isDownloading}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-full flex items-center gap-1 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.storage_ref || file.storage_path, file.file_name)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-full border border-red-200 flex items-center gap-1 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
                          title="Delete mistakenly uploaded file"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No files currently attached to this material.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                {fileManageMaterial.material_files?.length || 0} file(s) attached
              </span>
              <button
                type="button"
                onClick={() => setFileManageMaterial(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-full shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
