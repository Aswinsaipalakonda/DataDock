"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  toggleMaterialState, 
  deleteMaterial, 
  bulkToggleMaterialState, 
  bulkDeleteMaterials 
} from "./actions";
import ReplaceDialog from "./replace-dialog";
import AttachFileDialog from "./attach-file-dialog";
import DeleteFileDialog from "./delete-file-dialog";
import DeleteUnitDialog from "./delete-unit-dialog";
import FilePreviewModal from "@/components/file-preview-modal";
import { StudentEngagementLog } from "./page";
import StudentCohortProgressMatrix, { RegisteredStudent } from "@/components/student-cohort-progress-matrix";
import { 
  FileText, 
  Archive, 
  Trash2, 
  RefreshCw, 
  Globe, 
  Eye, 
  Download, 
  Loader2, 
  Plus, 
  FolderOpen, 
  Users, 
  X, 
  GraduationCap, 
  BookOpen, 
  ArrowLeft, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Filter,
  Code,
  Table,
  Presentation,
  FileArchive,
  Image as ImageIcon,
  AlertCircle,
  CheckSquare,
  Square,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  FileCode2,
  CheckCircle2,
  ListFilter
} from "lucide-react";
import { formatSubjectTitle } from "@/lib/utils";

interface FileItem {
  id: string;
  file_name: string;
  size: number;
  mime_type: string;
  version: number;
  storage_ref: string;
}

export interface SubjectItem {
  code: string;
  title: string;
  branch: string;
  semester: number;
  description?: string;
}

interface MaterialItem {
  id: string;
  title: string;
  type: string;
  state: "draft" | "published" | "archived" | "deleted";
  created_at: string;
  subject: string;
  branch?: string;
  branches?: string[];
  ids?: string[];
  semester?: number;
  views?: number;
  downloads?: number;
  engagementLogs?: StudentEngagementLog[];
  material_files: FileItem[];
}

interface MaterialsListProps {
  initialMaterials: MaterialItem[];
  subjects: SubjectItem[];
  students?: RegisteredStudent[];
}

const MATERIAL_TYPES = [
  "Lecture Notes",
  "Lab Manuals",
  "Assignments",
  "Question Banks",
  "Model Papers",
  "Reference Books",
  "Previous Papers",
  "Other Resources",
];

const FILE_FORMAT_OPTIONS = [
  { label: "All File Formats", value: "all" },
  { label: "PDF Documents (.pdf)", value: "pdf" },
  { label: "PowerPoint Slides (.ppt, .pptx)", value: "ppt" },
  { label: "Excel Spreadsheets (.xls, .xlsx, .csv)", value: "excel" },
  { label: "Code Files (.py, .java, .cpp, .js, .ts, etc.)", value: "code" },
  { label: "ZIP Archives (.zip, .rar, .7z)", value: "zip" },
  { label: "Image Assets (.png, .jpg, .svg, .webp)", value: "image" },
  { label: "Word & Text (.doc, .docx, .txt)", value: "doc" },
];

function getFileTypeDetails(fileName: string) {
  const ext = "." + (fileName.split(".").pop() || "").toLowerCase();
  if ([".py", ".java", ".c", ".cpp", ".h", ".cs", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".json", ".sql", ".ipynb", ".sh", ".xml", ".yaml", ".yml"].includes(ext)) {
    return {
      label: `${ext.slice(1).toUpperCase()} Code`,
      icon: <Code className="h-4 w-4 text-purple-600" />,
      bg: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }
  if ([".xls", ".xlsx", ".csv"].includes(ext)) {
    return {
      label: "Excel Spreadsheet",
      icon: <Table className="h-4 w-4 text-emerald-600" />,
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if ([".ppt", ".pptx"].includes(ext)) {
    return {
      label: "PowerPoint Slides",
      icon: <Presentation className="h-4 w-4 text-amber-600" />,
      bg: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) {
    return {
      label: "ZIP Archive",
      icon: <FileArchive className="h-4 w-4 text-indigo-600" />,
      bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  }
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) {
    return {
      label: "Image Asset",
      icon: <ImageIcon className="h-4 w-4 text-pink-600" />,
      bg: "bg-pink-50 text-pink-700 border-pink-200",
    };
  }
  return {
    label: ext === ".doc" || ext === ".docx" ? "Word Document" : ext === ".txt" || ext === ".md" ? "Text Document" : "PDF Document",
    icon: <FileText className="h-4 w-4 text-blue-600" />,
    bg: "bg-blue-50 text-blue-700 border-blue-200",
  };
}

function matchesFormat(files: FileItem[] | undefined, format: string): boolean {
  if (format === "all") return true;
  if (!files || files.length === 0) return false;
  return files.some(f => {
    const ext = "." + (f.file_name.split(".").pop() || "").toLowerCase();
    if (format === "pdf") return ext === ".pdf";
    if (format === "ppt") return [".ppt", ".pptx"].includes(ext);
    if (format === "excel") return [".xls", ".xlsx", ".csv"].includes(ext);
    if (format === "code") return [".py", ".java", ".c", ".cpp", ".h", ".cs", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".json", ".sql", ".ipynb", ".sh", ".xml", ".yaml", ".yml"].includes(ext);
    if (format === "zip") return [".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext);
    if (format === "image") return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext);
    if (format === "doc") return [".doc", ".docx", ".txt", ".md"].includes(ext);
    return false;
  });
}

export default function MaterialsList({ initialMaterials, subjects, students }: MaterialsListProps) {
  const [materials, setMaterials] = useState<MaterialItem[]>(initialMaterials);

  // Sync state if server initialMaterials update
  useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials]);

  // View Mode: "portfolios" (grouped by subjects) vs "all" (direct unified flat list)
  const [viewMode, setViewMode] = useState<"portfolios" | "all">("portfolios");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "views" | "downloads" | "title">("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Multi-Selection State for Bulk Actions
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Dialog & Modal States
  const [replaceTarget, setReplaceTarget] = useState<{
    materialId: string;
    fileId: string;
    fileName: string;
    linkedMaterialIds?: string[];
    branches?: string[];
    currentBranch?: string;
  } | null>(null);
  const [attachTarget, setAttachTarget] = useState<{ 
    materialId: string; 
    materialTitle: string;
    linkedMaterialIds?: string[];
    branches?: string[];
    currentBranch?: string;
  } | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<{
    materialId: string;
    fileId: string;
    fileName: string;
    storageRef?: string;
    linkedMaterialIds?: string[];
    branches?: string[];
    currentBranch?: string;
  } | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<{
    materialId: string;
    materialTitle: string;
    subjectCode: string;
    linkedMaterialIds?: string[];
    branches?: string[];
    currentBranch?: string;
  } | null>(null);
  const [previewingFile, setPreviewingFile] = useState<{
    fileName: string;
    fileUrl: string | null;
    mimeType: string;
    storageRef: string;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [downloadingRef, setDownloadingRef] = useState<string | null>(null);

  // Cohort Matrix Drawer States
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [inspectingMaterial, setInspectingMaterial] = useState<MaterialItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Body scroll locking
  useEffect(() => {
    if (isDrawerMounted || isPreviewOpen || replaceTarget || attachTarget || deleteFileTarget || deleteUnitTarget) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerMounted, isPreviewOpen, replaceTarget, attachTarget, deleteFileTarget, deleteUnitTarget]);

  // Direct wheel scroll handler for cohort matrix
  const handleScrollWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += e.deltaY;
    }
  };

  // Reset pagination on filter or view mode changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedMaterialIds(new Set());
  }, [searchQuery, stateFilter, subjectFilter, branchFilter, semesterFilter, typeFilter, formatFilter, sortBy, viewMode, selectedSubjectCode]);

  // Available Branches and Semesters dynamically extracted
  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    materials.forEach((m) => {
      if (m.branch) branches.add(m.branch.toUpperCase());
    });
    subjects.forEach((s) => {
      if (s.branch) branches.add(s.branch.toUpperCase());
    });
    return Array.from(branches).sort();
  }, [materials, subjects]);

  const availableSemesters = useMemo(() => {
    const sems = new Set<number>();
    materials.forEach((m) => {
      if (m.semester) sems.add(m.semester);
    });
    subjects.forEach((s) => {
      if (s.semester) sems.add(s.semester);
    });
    return Array.from(sems).sort((a, b) => a - b);
  }, [materials, subjects]);

  // Grouped Materials (Aggregates multi-branch uploads for the same course unit into a single section)
  const groupedMaterials = useMemo<MaterialItem[]>(() => {
    const map = new Map<string, MaterialItem>();

    materials.forEach((m) => {
      const normTitle = (m.title || "").trim().toLowerCase();
      const normSub = (m.subject || "").trim().toUpperCase();
      const sem = m.semester || 0;
      const type = (m.type || "").trim().toLowerCase();
      const key = `${normSub}___${normTitle}___${sem}___${type}`;

      const existing = map.get(key);
      const branch = (m.branch || "CIC").toUpperCase();

      if (existing) {
        if (!existing.ids) existing.ids = [existing.id];
        if (!existing.ids.includes(m.id)) existing.ids.push(m.id);

        if (!existing.branches) existing.branches = [existing.branch || "CIC"];
        if (!existing.branches.includes(branch)) existing.branches.push(branch);

        // Merge files deduplicated by file_name
        const existingFileNames = new Set((existing.material_files || []).map((f) => f.file_name));
        (m.material_files || []).forEach((f) => {
          if (!existingFileNames.has(f.file_name)) {
            existing.material_files.push(f);
            existingFileNames.add(f.file_name);
          }
        });

        // Merge engagement logs deduplicated by (rollNumber, action, fileName)
        if (m.engagementLogs && m.engagementLogs.length > 0) {
          const logKeyMap = new Map(
            (existing.engagementLogs || []).map((l) => [`${(l.rollNumber || l.email).toUpperCase()}__${l.action}__${l.fileName || "workspace"}`, l])
          );
          m.engagementLogs.forEach((l) => {
            const key = `${(l.rollNumber || l.email).toUpperCase()}__${l.action}__${l.fileName || "workspace"}`;
            if (!logKeyMap.has(key)) {
              existing.engagementLogs?.push(l);
              logKeyMap.set(key, l);
            }
          });
        }

        // Calculate unique student views and downloads across all linked branches
        const uniqueViewers = new Set(
          (existing.engagementLogs || [])
            .filter((l) => l.action === "view")
            .map((l) => (l.rollNumber || l.email || l.studentName).toUpperCase())
        );
        const uniqueDownloaders = new Set(
          (existing.engagementLogs || [])
            .filter((l) => l.action === "download")
            .map((l) => (l.rollNumber || l.email || l.studentName).toUpperCase())
        );
        existing.views = uniqueViewers.size;
        existing.downloads = uniqueDownloaders.size;
      } else {
        const uniqueViewers = new Set(
          (m.engagementLogs || [])
            .filter((l) => l.action === "view")
            .map((l) => (l.rollNumber || l.email || l.studentName).toUpperCase())
        );
        const uniqueDownloaders = new Set(
          (m.engagementLogs || [])
            .filter((l) => l.action === "download")
            .map((l) => (l.rollNumber || l.email || l.studentName).toUpperCase())
        );
        map.set(key, {
          ...m,
          ids: [m.id],
          branches: [branch],
          views: uniqueViewers.size,
          downloads: uniqueDownloaders.size,
          material_files: [...(m.material_files || [])],
          engagementLogs: [...(m.engagementLogs || [])],
        });
      }
    });

    return Array.from(map.values());
  }, [materials]);

  // Overall KPI Metrics
  const metrics = useMemo(() => {
    const totalMaterials = groupedMaterials.length;
    const publishedCount = groupedMaterials.filter((m) => m.state === "published").length;
    const draftCount = groupedMaterials.filter((m) => m.state === "draft").length;
    const archivedCount = groupedMaterials.filter((m) => m.state === "archived").length;
    const totalViews = groupedMaterials.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const totalDownloads = groupedMaterials.reduce((acc, curr) => acc + (curr.downloads || 0), 0);
    const totalFiles = groupedMaterials.reduce((acc, curr) => acc + (curr.material_files?.length || 0), 0);
    return {
      totalMaterials,
      publishedCount,
      draftCount,
      archivedCount,
      totalViews,
      totalDownloads,
      totalFiles,
    };
  }, [groupedMaterials]);

  // Subject Stats for Level 1 (Course Portfolios View)
  const subjectStats = useMemo(() => {
    return subjects.map((sub) => {
      const subMaterials = groupedMaterials.filter(
        (m) => (m.subject || "").toUpperCase() === sub.code.toUpperCase()
      );
      const totalViews = subMaterials.reduce((acc, curr) => acc + (curr.views || 0), 0);
      const totalDownloads = subMaterials.reduce((acc, curr) => acc + (curr.downloads || 0), 0);
      const totalFiles = subMaterials.reduce((acc, curr) => acc + (curr.material_files?.length || 0), 0);
      const publishedCount = subMaterials.filter((m) => m.state === "published").length;
      const draftCount = subMaterials.filter((m) => m.state === "draft").length;

      return {
        ...sub,
        materialsCount: subMaterials.length,
        publishedCount,
        draftCount,
        totalViews,
        totalDownloads,
        totalFiles,
      };
    });
  }, [subjects, groupedMaterials]);

  // Filtered Subjects List for Portfolio View
  const filteredSubjects = useMemo(() => {
    return subjectStats.filter((s) => {
      if (branchFilter !== "all" && s.branch.toUpperCase() !== branchFilter.toUpperCase()) return false;
      if (semesterFilter !== "all" && String(s.semester) !== semesterFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = s.code.toLowerCase().includes(q);
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesBranch = s.branch.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesBranch) return false;
      }
      return true;
    });
  }, [subjectStats, branchFilter, semesterFilter, searchQuery]);

  // Currently Selected Subject (if inside Level 2)
  const currentSubject = useMemo(() => {
    if (!selectedSubjectCode) return null;
    return subjectStats.find((s) => s.code.toUpperCase() === selectedSubjectCode.toUpperCase()) || {
      code: selectedSubjectCode,
      title: selectedSubjectCode,
      branch: "CIC",
      semester: 3,
      materialsCount: 0,
      publishedCount: 0,
      draftCount: 0,
      totalViews: 0,
      totalDownloads: 0,
      totalFiles: 0,
    };
  }, [selectedSubjectCode, subjectStats]);

  // Filtered Materials List (Used in both "All Materials Feed" and "Selected Subject" view)
  const filteredMaterials = useMemo(() => {
    let result = groupedMaterials;

    // Scope to selected subject if one is chosen
    if (selectedSubjectCode) {
      result = result.filter((m) => (m.subject || "").toUpperCase() === selectedSubjectCode.toUpperCase());
    } else if (subjectFilter !== "all") {
      result = result.filter((m) => (m.subject || "").toUpperCase() === subjectFilter.toUpperCase());
    }

    // Publication state filter
    if (stateFilter !== "all") {
      result = result.filter((m) => m.state === stateFilter);
    }

    // Branch filter (matches if any linked branch matches)
    if (branchFilter !== "all") {
      const b = branchFilter.toUpperCase();
      result = result.filter((m) => {
        if (m.branches && m.branches.length > 0) {
          return m.branches.includes(b);
        }
        return (m.branch || "").toUpperCase() === b;
      });
    }

    // Semester filter
    if (semesterFilter !== "all") {
      result = result.filter((m) => String(m.semester) === semesterFilter);
    }

    // Material type filter
    if (typeFilter !== "all") {
      result = result.filter((m) => m.type === typeFilter);
    }

    // File format filter
    if (formatFilter !== "all") {
      result = result.filter((m) => matchesFormat(m.material_files, formatFilter));
    }

    // Universal search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => {
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesSubject = (m.subject || "").toLowerCase().includes(q);
        const matchesType = (m.type || "").toLowerCase().includes(q);
        const matchesFiles = m.material_files?.some((f) => f.file_name.toLowerCase().includes(q));
        const matchedSubTitle = subjects.find((s) => s.code.toUpperCase() === (m.subject || "").toUpperCase())?.title.toLowerCase().includes(q);
        return matchesTitle || matchesSubject || matchesType || matchesFiles || matchedSubTitle;
      });
    }

    // Sorting
    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "views") {
        return (b.views || 0) - (a.views || 0);
      }
      if (sortBy === "downloads") {
        return (b.downloads || 0) - (a.downloads || 0);
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [materials, selectedSubjectCode, subjectFilter, stateFilter, branchFilter, semesterFilter, typeFilter, formatFilter, searchQuery, sortBy, subjects]);

  // Check if any filter is actively applied
  const isFiltered = Boolean(
    searchQuery.trim() ||
    stateFilter !== "all" ||
    subjectFilter !== "all" ||
    branchFilter !== "all" ||
    semesterFilter !== "all" ||
    typeFilter !== "all" ||
    formatFilter !== "all" ||
    sortBy !== "newest"
  );

  const resetAllFilters = () => {
    setSearchQuery("");
    setStateFilter("all");
    setSubjectFilter("all");
    setBranchFilter("all");
    setSemesterFilter("all");
    setTypeFilter("all");
    setFormatFilter("all");
    setSortBy("newest");
  };

  // Pagination for Active View
  const totalPages = viewMode === "portfolios" && !selectedSubjectCode
    ? Math.ceil(filteredSubjects.length / ITEMS_PER_PAGE) || 1
    : Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE) || 1;

  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubjects, currentPage]);

  const paginatedMaterials = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMaterials.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMaterials, currentPage]);

  // Multi-Selection Checkbox Toggles
  const handleToggleSelect = (id: string) => {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageIds = paginatedMaterials.map((m) => m.id);
    const allSelected = currentPageIds.every((id) => selectedMaterialIds.has(id));

    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const isCurrentPageAllSelected = paginatedMaterials.length > 0 && paginatedMaterials.every((m) => selectedMaterialIds.has(m.id));

  // Single Item State Actions
  const handleStateToggle = async (id: string, newState: "draft" | "published" | "archived") => {
    const result = await toggleMaterialState(id, newState);
    if (result.success) {
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, state: newState } : m))
      );
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this study material? This action will archive it safely.")) return;
    const result = await deleteMaterial(id);
    if (result.success) {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setSelectedMaterialIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      alert(result.error);
    }
  };

  // Bulk Actions
  const handleBulkStateToggle = async (newState: "published" | "archived") => {
    const ids = Array.from(selectedMaterialIds);
    if (ids.length === 0) return;

    const actionName = newState === "published" ? "publish" : "archive";
    if (!confirm(`Are you sure you want to ${actionName} all ${ids.length} selected materials?`)) return;

    setIsBulkOperating(true);
    const res = await bulkToggleMaterialState(ids, newState);
    setIsBulkOperating(false);

    if (res.success) {
      setMaterials((prev) =>
        prev.map((m) => (ids.includes(m.id) ? { ...m, state: newState } : m))
      );
      setSelectedMaterialIds(new Set());
    } else {
      alert(res.error || `Failed to bulk ${actionName} materials.`);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedMaterialIds);
    if (ids.length === 0) return;

    if (!confirm(`Are you sure you want to soft-delete all ${ids.length} selected materials?`)) return;

    setIsBulkOperating(true);
    const res = await bulkDeleteMaterials(ids);
    setIsBulkOperating(false);

    if (res.success) {
      setMaterials((prev) => prev.filter((m) => !ids.includes(m.id)));
      setSelectedMaterialIds(new Set());
    } else {
      alert(res.error || "Failed to delete selected materials.");
    }
  };

  // Cohort Matrix Drawer
  const openInspectModal = (material: MaterialItem) => {
    setInspectingMaterial(material);
    setIsDrawerMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsDrawerVisible(true);
      });
    });
  };

  const closeInspectModal = () => {
    setIsDrawerVisible(false);
    setTimeout(() => {
      setIsDrawerMounted(false);
      setInspectingMaterial(null);
    }, 500);
  };

  // File Preview & Download
  const handlePreview = (file: FileItem) => {
    const previewUrl = `/api/materials/file/${file.storage_ref}?filename=${encodeURIComponent(file.file_name)}`;
    setPreviewingFile({
      fileName: file.file_name,
      fileUrl: previewUrl,
      mimeType: file.mime_type,
      storageRef: file.storage_ref,
    });
    setIsPreviewOpen(true);
  };

  const handleDownload = (storageRef: string, fileName: string) => {
    setDownloadingRef(storageRef);
    try {
      const downloadUrl = `/api/materials/file/${storageRef}?download=1&filename=${encodeURIComponent(fileName)}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Failed to download file.");
    } finally {
      setDownloadingRef(null);
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(2) + " MB";
    const kb = bytes / 1024;
    return kb.toFixed(1) + " KB";
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* ========================================================================= */}
      {/* QUICK ANALYTICS KPI SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => {
            setStateFilter("all");
            setViewMode("all");
            setSelectedSubjectCode(null);
          }}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Materials</span>
            <div className="w-8 h-8 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.totalMaterials}</span>
            <span className="text-xs text-slate-500 font-medium">Resources</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across all assigned subjects</p>
        </div>

        <div 
          onClick={() => {
            setStateFilter("published");
            setViewMode("all");
            setSelectedSubjectCode(null);
          }}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Published</span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{metrics.publishedCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Live</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{metrics.draftCount} drafts awaiting publish</p>
        </div>

        <div 
          onClick={() => {
            setSortBy("views");
            setViewMode("all");
            setSelectedSubjectCode(null);
          }}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Views</span>
            <div className="w-8 h-8 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-800">{metrics.totalViews}</span>
            <span className="text-xs text-blue-600 font-medium">Student Views</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Verified unique student readers</p>
        </div>

        <div 
          onClick={() => {
            setSortBy("downloads");
            setViewMode("all");
            setSelectedSubjectCode(null);
          }}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Downloads</span>
            <div className="w-8 h-8 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Download className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-700">{metrics.totalDownloads}</span>
            <span className="text-xs text-indigo-600 font-medium">Files</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across {metrics.totalFiles} attached files</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE TOGGLE & UNIVERSAL FILTER TOOLBAR */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        {/* Top Control Bar: Mode Switcher & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: View Mode Navigation Switcher */}
          {!selectedSubjectCode ? (
            <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("portfolios")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  viewMode === "portfolios"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span>Course Subjects ({filteredSubjects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  viewMode === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>All Materials Feed ({materials.length})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSubjectCode(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Subjects</span>
              </button>
              <span className="text-xs font-bold text-slate-400">/</span>
              <span className="text-xs font-bold text-slate-900 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-mono">
                {currentSubject?.code}
              </span>
            </div>
          )}

          {/* Right: Universal Search & Advanced Filter Toggle */}
          <div className="flex items-center gap-2 flex-1 max-w-xl justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                placeholder={
                  viewMode === "portfolios" && !selectedSubjectCode
                    ? "Search subject by code, name, or branch..."
                    : "Search materials by title, subject code, or file name..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9.5 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:border-primary focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all font-normal"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                showAdvancedFilters || (isFiltered && !searchQuery)
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filter Options</span>
              {isFiltered && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Publication State Tabs & Quick Sorters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-200/80 overflow-x-auto">
            {(["all", "published", "draft", "archived"] as const).map((tab) => {
              const count = tab === "all"
                ? (selectedSubjectCode ? materials.filter(m => (m.subject || "").toUpperCase() === selectedSubjectCode.toUpperCase()).length : materials.length)
                : (selectedSubjectCode
                    ? materials.filter(m => (m.subject || "").toUpperCase() === selectedSubjectCode.toUpperCase() && m.state === tab).length
                    : materials.filter(m => m.state === tab).length);

              const isActive = stateFilter === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStateFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? "bg-primary text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="newest">Recently Uploaded</option>
              <option value="oldest">Oldest Uploaded</option>
              <option value="views">Most Viewed First</option>
              <option value="downloads">Most Downloaded</option>
              <option value="title">Title (A to Z)</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXPANDABLE MULTI-DIMENSIONAL FILTER PANEL */}
        {/* ========================================================================= */}
        {showAdvancedFilters && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Detailed Filter Criteria
                </h4>
              </div>
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Branch Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Target Branch
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {availableBranches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Semester Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Semester
                </label>
                <select
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="all">All Semesters</option>
                  {availableSemesters.map((sem) => (
                    <option key={sem} value={String(sem)}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              {/* Resource Type Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Resource Category
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* File Format Extension Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  File Format
                </label>
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {FILE_FORMAT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* If in "All Materials" feed mode, also provide Subject Filter Dropdown */}
            {viewMode === "all" && !selectedSubjectCode && subjects.length > 1 && (
              <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  Filter By Specific Course Subject:
                </label>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full sm:max-w-md px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="all">All Assigned Course Subjects ({subjects.length})</option>
                  {subjects.map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      {sub.code} - {formatSubjectTitle(sub.title)} ({sub.branch} Sem {sub.semester})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Active Filter Chips Indicator */}
        {isFiltered && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                Search: &quot;{searchQuery}&quot;
                <button onClick={() => setSearchQuery("")} className="hover:text-blue-900 cursor-pointer">×</button>
              </span>
            )}
            {stateFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold capitalize">
                State: {stateFilter}
                <button onClick={() => setStateFilter("all")} className="hover:text-emerald-900 cursor-pointer">×</button>
              </span>
            )}
            {branchFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                Branch: {branchFilter}
                <button onClick={() => setBranchFilter("all")} className="hover:text-purple-900 cursor-pointer">×</button>
              </span>
            )}
            {semesterFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                Semester {semesterFilter}
                <button onClick={() => setSemesterFilter("all")} className="hover:text-amber-900 cursor-pointer">×</button>
              </span>
            )}
            {typeFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                Type: {typeFilter}
                <button onClick={() => setTypeFilter("all")} className="hover:text-indigo-900 cursor-pointer">×</button>
              </span>
            )}
            {formatFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 text-xs font-semibold">
                Format: {FILE_FORMAT_OPTIONS.find((f) => f.value === formatFilter)?.label || formatFilter}
                <button onClick={() => setFormatFilter("all")} className="hover:text-pink-900 cursor-pointer">×</button>
              </span>
            )}
            {subjectFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold font-mono">
                {subjectFilter}
                <button onClick={() => setSubjectFilter("all")} className="hover:text-slate-900 cursor-pointer">×</button>
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold ml-auto cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FLOATING MULTI-SELECT BATCH ACTION DOCK */}
      {/* ========================================================================= */}
      {selectedMaterialIds.size > 0 && (
        <div className="sticky top-4 z-30 p-3 sm:p-4 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center font-bold text-xs">
              {selectedMaterialIds.size}
            </span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white">
                {selectedMaterialIds.size} {selectedMaterialIds.size === 1 ? "Material" : "Materials"} Selected
              </p>
              <p className="text-[11px] text-slate-400 font-normal">
                Choose a bulk administrative action to apply to all selected items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isBulkOperating}
              onClick={() => handleBulkStateToggle("published")}
              className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isBulkOperating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
              <span>Bulk Publish</span>
            </button>

            <button
              type="button"
              disabled={isBulkOperating}
              onClick={() => handleBulkStateToggle("archived")}
              className="px-3.5 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isBulkOperating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              <span>Bulk Archive</span>
            </button>

            <button
              type="button"
              disabled={isBulkOperating}
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isBulkOperating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Bulk Delete</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMaterialIds(new Set())}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 1: ASSIGNED COURSE SUBJECTS GRID (PORTFOLIO MODE) */}
      {/* ========================================================================= */}
      {viewMode === "portfolios" && !selectedSubjectCode && (
        <div className="space-y-6">
          {filteredSubjects.length === 0 ? (
            <div className="py-16 text-center bg-white border border-slate-200/90 rounded-3xl p-8 space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Course Subjects Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No subjects match your active search and filter options. Try clearing filters or switching to All Materials Feed.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("all")}
                  className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  View All Materials
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedSubjects.map((sub) => {
                const hasMaterials = sub.materialsCount > 0;

                return (
                  <div
                    key={sub.code}
                    onClick={() => {
                      setSelectedSubjectCode(sub.code);
                      setCurrentPage(1);
                    }}
                    className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
                  >
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold font-mono">
                          {sub.code}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                          {sub.branch} • Sem {sub.semester}
                        </span>
                      </div>

                      <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200 group-hover:scale-110 transition-transform">
                        <BookOpen className="h-4.5 w-4.5" />
                      </div>
                    </div>

                    {/* Subject Title */}
                    <div className="space-y-1">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                        {formatSubjectTitle(sub.title)}
                      </h2>
                      <p className="text-xs text-slate-500 font-normal">
                        Department of Data Engineering Syllabus
                      </p>
                    </div>

                    {/* Metrics Statistics */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                      <div>
                        <span className="block text-base font-bold text-slate-900">{sub.materialsCount}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">Materials</span>
                      </div>
                      <div className="border-x border-slate-200">
                        <span className="block text-base font-bold text-blue-700">{sub.totalViews}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">Views</span>
                      </div>
                      <div>
                        <span className="block text-base font-bold text-emerald-700">{sub.totalDownloads}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">Downloads</span>
                      </div>
                    </div>

                    {/* Action Link Footer */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs font-semibold text-primary group-hover:text-blue-700">
                      <span>{hasMaterials ? "View Uploaded Materials" : "Open Subject Workspace"}</span>
                      <div className="p-1 rounded-full bg-blue-50 text-blue-700 group-hover:bg-primary group-hover:text-white transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2 / ALL MATERIALS FEED: DETAILED MATERIALS LIST */}
      {/* ========================================================================= */}
      {(viewMode === "all" || selectedSubjectCode) && (
        <div className="space-y-5">
          {/* Active Subject Banner if drilled down */}
          {selectedSubjectCode && (
            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold font-mono text-white border border-white/20">
                      {currentSubject?.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
                      {currentSubject?.branch} • Semester {currentSubject?.semester}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {formatSubjectTitle(currentSubject?.title)}
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
                    <span className="block text-base font-bold text-white">{currentSubject?.materialsCount || 0}</span>
                    <span className="text-[10px] text-slate-300 font-medium">Uploaded</span>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-blue-500/15 border border-blue-500/30 backdrop-blur-md text-center">
                    <span className="block text-base font-bold text-blue-300">{currentSubject?.totalViews || 0}</span>
                    <span className="text-[10px] text-blue-200 font-medium">Views</span>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md text-center">
                    <span className="block text-base font-bold text-emerald-300">{currentSubject?.totalDownloads || 0}</span>
                    <span className="text-[10px] text-emerald-200 font-medium">Downloads</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table Header / Selection Bar */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllCurrentPage}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                title={isCurrentPageAllSelected ? "Deselect page" : "Select page"}
              >
                {isCurrentPageAllSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                <span>Select Page</span>
              </button>

              <span className="text-xs text-slate-400">|</span>

              <span className="text-xs text-slate-500">
                Showing <strong className="text-slate-900">{filteredMaterials.length}</strong> {filteredMaterials.length === 1 ? "material" : "materials"}
                {isFiltered && " (Filtered)"}
              </span>
            </div>

            <Link
              href="/faculty/upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary/95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Upload New Material</span>
            </Link>
          </div>

          {/* Materials Cards List */}
          <div className="space-y-4">
            {filteredMaterials.length > 0 ? (
              paginatedMaterials.map((m) => {
                const isSelected = selectedMaterialIds.has(m.id);

                return (
                  <div
                    key={m.id}
                    className={`p-5 sm:p-7 bg-white rounded-3xl border transition-all space-y-5 group ${
                      isSelected
                        ? "border-primary/80 ring-2 ring-primary/10 shadow-md bg-blue-50/10"
                        : "border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md"
                    }`}
                  >
                    {/* Material Top Row & Actions */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(m.id)}
                          className="mt-1 text-slate-400 hover:text-primary transition-colors cursor-pointer shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-300 group-hover:text-slate-500" />
                          )}
                        </button>

                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                              {m.type}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold font-mono">
                              {m.subject}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">
                              {(m.branches && m.branches.length > 0 ? m.branches.join(", ") : (m.branch || "All Branches"))} • Sem {m.semester || 3}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                m.state === "published"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : m.state === "draft"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {m.state}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-primary transition-colors">
                            {m.title}
                          </h3>

                          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400 font-normal">
                            <span>
                              Uploaded on {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>

                            {/* Engagement Metric Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openInspectModal(m)}
                                title="Click to view student progress matrix"
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                              >
                                <Eye className="h-3 w-3" />
                                <span>{m.views || 0} {m.views === 1 ? "Student View" : "Student Views"}</span>
                              </button>

                              <button
                                onClick={() => openInspectModal(m)}
                                title="Click to view student download matrix"
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                              >
                                <Download className="h-3 w-3" />
                                <span>{m.downloads || 0} Downloads</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* State Controls Bar */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        {m.state === "draft" && (
                          <button
                            onClick={() => handleStateToggle(m.id, "published")}
                            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Publish</span>
                          </button>
                        )}

                        {m.state === "published" && (
                          <button
                            onClick={() => handleStateToggle(m.id, "archived")}
                            className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            <span>Archive</span>
                          </button>
                        )}

                        {m.state === "archived" && (
                          <button
                            onClick={() => handleStateToggle(m.id, "published")}
                            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Restore</span>
                          </button>
                        )}

                        <button
                          onClick={() => openInspectModal(m)}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Users className="h-3.5 w-3.5 text-blue-300" />
                          <span>Cohort Matrix</span>
                        </button>

                        <button
                          onClick={() => setDeleteUnitTarget({
                            materialId: m.id,
                            materialTitle: m.title,
                            subjectCode: m.subject,
                            linkedMaterialIds: m.ids,
                            branches: m.branches,
                            currentBranch: m.branch,
                          })}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full border border-red-200 cursor-pointer transition-all"
                          title="Delete material"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Attached Files List */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Attached Study Files ({m.material_files?.length || 0}):
                        </span>
                        <button
                          onClick={() => setAttachTarget({ 
                            materialId: m.id, 
                            materialTitle: m.title,
                            linkedMaterialIds: m.ids,
                            branches: m.branches,
                            currentBranch: m.branch,
                          })}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add File</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {m.material_files && m.material_files.length > 0 ? (
                          m.material_files
                            .filter((f, idx, self) => self.findIndex((t) => t.file_name === f.file_name) === idx)
                            .map((file) => {
                              const isDownloading = downloadingRef === file.storage_ref;
                              const fileType = getFileTypeDetails(file.file_name);
                              return (
                                <div
                                  key={file.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs gap-3 hover:bg-slate-100/80 transition-all"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${fileType.bg}`}>
                                      {fileType.icon}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md block">
                                          {file.file_name}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[9px] font-bold">
                                          v{file.version}
                                        </span>
                                      </div>
                                      <span className="text-slate-500 text-[11px]">
                                        {formatSize(file.size)} • {fileType.label}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                    <button
                                      onClick={() => handlePreview(file)}
                                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                    >
                                      <Eye className="h-3 w-3 text-blue-600" />
                                      <span>Preview</span>
                                    </button>

                                    <button
                                      onClick={() => handleDownload(file.storage_ref, file.file_name)}
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
                                      onClick={() => setReplaceTarget({
                                        materialId: m.id,
                                        fileId: file.id,
                                        fileName: file.file_name,
                                        linkedMaterialIds: m.ids,
                                        branches: m.branches,
                                        currentBranch: m.branch,
                                      })}
                                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                    >
                                      <RefreshCw className="h-3 w-3 text-amber-600" />
                                      <span>New Version</span>
                                    </button>

                                    <button
                                      onClick={() => setDeleteFileTarget({
                                        materialId: m.id,
                                        fileId: file.id,
                                        fileName: file.file_name,
                                        storageRef: file.storage_ref,
                                        linkedMaterialIds: m.ids,
                                        branches: m.branches,
                                        currentBranch: m.branch,
                                      })}
                                      className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-semibold rounded-full border border-red-200 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                      title="Delete study file"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-amber-50/70 border border-dashed border-amber-200 rounded-2xl text-xs gap-3">
                            <div className="flex items-center gap-2 text-amber-900">
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>No study files registered. Attach a file so enrolled students can view and download.</span>
                            </div>
                            <button
                              onClick={() => setAttachTarget({ materialId: m.id, materialTitle: m.title })}
                              className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 self-start sm:self-auto"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Attach Study File</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center bg-white border border-slate-200/90 rounded-3xl p-8 space-y-4 shadow-2xs">
                <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FolderOpen className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {isFiltered ? "No Materials Match Selected Filters" : "No Study Materials Uploaded Yet"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {isFiltered
                      ? "Try clearing your search query, adjusting branch/semester, or resetting all filters."
                      : "Start publishing lecture notes, lab manuals, and syllabus documents for enrolled students."}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  )}
                  <Link
                    href="/faculty/upload"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Upload New Material</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGINATION TOOLBAR */}
      {/* ========================================================================= */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/80">
          <div className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? "bg-primary text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Render Attach File Dialog */}
      {attachTarget && (
        <AttachFileDialog
          materialId={attachTarget.materialId}
          materialTitle={attachTarget.materialTitle}
          linkedMaterialIds={attachTarget.linkedMaterialIds}
          branches={attachTarget.branches}
          currentBranch={attachTarget.currentBranch}
          onClose={() => setAttachTarget(null)}
        />
      )}

      {/* Render Replace File Version Dialog */}
      {replaceTarget && (
        <ReplaceDialog
          materialId={replaceTarget.materialId}
          fileId={replaceTarget.fileId}
          fileName={replaceTarget.fileName}
          linkedMaterialIds={replaceTarget.linkedMaterialIds}
          branches={replaceTarget.branches}
          currentBranch={replaceTarget.currentBranch}
          onClose={() => setReplaceTarget(null)}
        />
      )}

      {/* Render Delete File Dialog */}
      {deleteFileTarget && (
        <DeleteFileDialog
          materialId={deleteFileTarget.materialId}
          fileId={deleteFileTarget.fileId}
          fileName={deleteFileTarget.fileName}
          storageRef={deleteFileTarget.storageRef}
          linkedMaterialIds={deleteFileTarget.linkedMaterialIds}
          branches={deleteFileTarget.branches}
          currentBranch={deleteFileTarget.currentBranch}
          onClose={() => setDeleteFileTarget(null)}
        />
      )}

      {/* Render Delete Unit Dialog */}
      {deleteUnitTarget && (
        <DeleteUnitDialog
          materialId={deleteUnitTarget.materialId}
          materialTitle={deleteUnitTarget.materialTitle}
          subjectCode={deleteUnitTarget.subjectCode}
          linkedMaterialIds={deleteUnitTarget.linkedMaterialIds}
          branches={deleteUnitTarget.branches}
          currentBranch={deleteUnitTarget.currentBranch}
          onClose={() => setDeleteUnitTarget(null)}
        />
      )}

      {/* Render File Preview Modal */}
      {previewingFile && (
        <FilePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          fileName={previewingFile.fileName}
          fileUrl={previewingFile.fileUrl}
          mimeType={previewingFile.mimeType}
          onDownload={() => handleDownload(previewingFile.storageRef, previewingFile.fileName)}
          isDownloading={downloadingRef === previewingFile.storageRef}
        />
      )}

      {/* ========================================================================= */}
      {/* COHORT PROGRESS MATRIX SLIDE-OVER DRAWER */}
      {/* ========================================================================= */}
      {isDrawerMounted && inspectingMaterial && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            onClick={closeInspectModal}
            className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
              isDrawerVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-6 md:pl-10 z-50">
            <div 
              className={`w-screen max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-white shadow-2xl flex flex-col border-l border-slate-200 transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overscroll-contain ${
                isDrawerVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
              }`}
            >
              {/* Drawer Header */}
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

              {/* Scroll Container */}
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
                  branch={inspectingMaterial.branches ? inspectingMaterial.branches.join(", ") : inspectingMaterial.branch || "CIC"}
                  branches={inspectingMaterial.branches}
                  linkedMaterialIds={inspectingMaterial.ids}
                  semester={inspectingMaterial.semester || 3}
                  files={inspectingMaterial.material_files || []}
                  activityLogs={inspectingMaterial.engagementLogs || []}
                  uploaderName="You (Faculty)"
                  students={students}
                />
                <div className="h-20" />
              </div>

              {/* Drawer Footer */}
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
    </div>
  );
}
