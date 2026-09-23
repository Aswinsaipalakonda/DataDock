"use client";

import { useState, useMemo } from "react";
import { 
  createSubjectAction, 
  updateSubjectAction, 
  deleteSubjectAction, 
  deleteSubjectGroupAction,
  toggleSubjectActiveAction, 
  toggleSubjectGroupActiveAction,
  createBranchAction, 
  updateBranchAction,
  toggleBranchActiveAction,
  deleteBranchAction,
  createRegulationAction,
  updateRegulationAction,
  toggleRegulationActiveAction,
  deleteRegulationAction,
  updateSemesterAction,
  toggleSemesterActiveAction
} from "./actions";
import { ToastContainer, ToastMessage } from "@/components/toast";
import { 
  BookOpen, 
  FolderPlus, 
  Plus, 
  Search, 
  X, 
  Loader2, 
  Calendar, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Layers,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  CheckSquare,
  Award
} from "lucide-react";
import { formatSubjectTitle } from "@/lib/utils";

interface Branch {
  code: string;
  name: string;
  active: boolean;
}

interface Semester {
  number: number;
  name: string;
  active: boolean;
}

interface Regulation {
  code: string;
  name: string;
  active: boolean;
}

interface Subject {
  code: string;
  title: string;
  branch: string;
  semester: number;
  regulation?: string;
  active: boolean;
}

export interface GroupedSubject {
  code: string;
  title: string;
  semester: number;
  regulation: string;
  branches: string[];
  active: boolean;
}

interface TaxonomyClientProps {
  branches: Branch[];
  semesters: Semester[];
  subjects: Subject[];
  regulations?: Regulation[];
}

const DEFAULT_REGULATIONS: Regulation[] = [
  { code: "R23", name: "R23 Autonomous Regulation", active: true },
  { code: "R20", name: "R20 Autonomous Regulation", active: true },
  { code: "R19", name: "R19 Autonomous Regulation", active: true },
  { code: "A2", name: "A2 Autonomous Regulation", active: true },
];

export default function TaxonomyClient({
  branches: initialBranches,
  semesters: initialSemesters,
  subjects: initialSubjects,
  regulations: initialRegulations = DEFAULT_REGULATIONS,
}: TaxonomyClientProps) {
  // Navigation Tabs: "subjects" | "branches" | "semesters" | "regulations"
  const [activeTab, setActiveTab] = useState<"subjects" | "branches" | "semesters" | "regulations">("subjects");

  // Master Data
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [regulations, setRegulations] = useState<Regulation[]>(initialRegulations);

  // Filter States for Subjects
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [regulationFilter, setRegulationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination for Subjects
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Slide-over Right Drawer for Subject Creation & Editing
  const [isSubjectDrawerMounted, setIsSubjectDrawerMounted] = useState(false);
  const [isSubjectDrawerVisible, setIsSubjectDrawerVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{ originalCode: string; originalBranches: string[]; originalRegulation: string; originalBranch?: string } | null>(null);

  // Delete Subject Confirmation Modal
  const [deletingSubject, setDeletingSubject] = useState<GroupedSubject | null>(null);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  // Modal for Branch Creation & Editing
  const [isBranchModalMounted, setIsBranchModalMounted] = useState(false);
  const [isBranchModalVisible, setIsBranchModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Modal for Regulation Creation & Editing
  const [isRegulationModalMounted, setIsRegulationModalMounted] = useState(false);
  const [isRegulationModalVisible, setIsRegulationModalVisible] = useState(false);
  const [editingRegulation, setEditingRegulation] = useState<Regulation | null>(null);
  const [newRegCode, setNewRegCode] = useState("");
  const [newRegName, setNewRegName] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Delete Confirmation Modals
  const [deletingRegulation, setDeletingRegulation] = useState<Regulation | null>(null);
  const [isDeletingRegulation, setIsDeletingRegulation] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  // Modal for Semester Editing
  const [isSemesterModalMounted, setIsSemesterModalMounted] = useState(false);
  const [isSemesterModalVisible, setIsSemesterModalVisible] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [semTitle, setSemTitle] = useState("");
  const [semActive, setSemActive] = useState(true);
  const [semLoading, setSemLoading] = useState(false);

  // Subject Form State (Supports Multiple Branches & Regulation)
  const [subCode, setSubCode] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [subRegulation, setSubRegulation] = useState(initialRegulations[0]?.code || "R23");
  const [subBranches, setSubBranches] = useState<string[]>([initialBranches[0]?.code || "CIC"]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [subSemester, setSubSemester] = useState("1");
  const [subActive, setSubActive] = useState(true);
  const [subjectLoading, setSubjectLoading] = useState(false);

  // Branch Form State
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchLoading, setBranchLoading] = useState(false);

  // Toggling States
  const [togglingCode, setTogglingCode] = useState<string | null>(null);
  const [togglingRegCode, setTogglingRegCode] = useState<string | null>(null);
  const [togglingBranchCode, setTogglingBranchCode] = useState<string | null>(null);
  const [togglingSemNumber, setTogglingSemNumber] = useState<number | null>(null);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Branch selection toggle helper
  const toggleBranchSelection = (bCode: string) => {
    setSubBranches((prev) => {
      if (prev.includes(bCode)) {
        if (prev.length === 1) return prev; // Keep at least one branch selected
        return prev.filter((b) => b !== bCode);
      } else {
        return [...prev, bCode];
      }
    });
  };

  // Toggle select all branches
  const toggleSelectAllBranches = () => {
    if (subBranches.length === branches.length) {
      setSubBranches([branches[0]?.code || "CIC"]);
    } else {
      setSubBranches(branches.map((b) => b.code));
    }
  };

  // Open Drawer in Create Mode
  const openSubjectDrawer = () => {
    setEditingSubject(null);
    setSubCode("");
    setSubTitle("");
    setSubRegulation(regulations[0]?.code || "R23");
    setSubBranches(branches.map((b) => b.code)); // Default to all branches for convenience
    setSubSemester("1");
    setSubActive(true);
    setIsBranchDropdownOpen(false);
    setIsSubjectDrawerMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSubjectDrawerVisible(true);
      });
    });
  };

  // Open Drawer in Edit Mode
  const openEditSubjectDrawer = (subject: GroupedSubject) => {
    setEditingSubject({ 
      originalCode: subject.code, 
      originalBranches: subject.branches,
      originalRegulation: subject.regulation || "R23"
    });
    setSubCode(subject.code);
    setSubTitle(subject.title);
    setSubRegulation(subject.regulation || "R23");
    setSubBranches(subject.branches);
    setSubSemester(subject.semester.toString());
    setSubActive(subject.active);
    setIsBranchDropdownOpen(false);
    setIsSubjectDrawerMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSubjectDrawerVisible(true);
      });
    });
  };

  const closeSubjectDrawer = () => {
    setIsSubjectDrawerVisible(false);
    setIsBranchDropdownOpen(false);
    setTimeout(() => {
      setIsSubjectDrawerMounted(false);
      setEditingSubject(null);
    }, 450);
  };

  const openBranchModal = () => {
    setEditingBranch(null);
    setBranchCode("");
    setBranchName("");
    setIsBranchModalMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsBranchModalVisible(true);
      });
    });
  };

  const openEditBranchModal = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchCode(branch.code);
    setBranchName(branch.name);
    setIsBranchModalMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsBranchModalVisible(true);
      });
    });
  };

  const closeBranchModal = () => {
    setIsBranchModalVisible(false);
    setTimeout(() => {
      setIsBranchModalMounted(false);
      setEditingBranch(null);
      setBranchCode("");
      setBranchName("");
    }, 400);
  };

  const openRegulationModal = () => {
    setEditingRegulation(null);
    setNewRegCode("");
    setNewRegName("");
    setIsRegulationModalMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsRegulationModalVisible(true);
      });
    });
  };

  const openEditRegulationModal = (reg: Regulation) => {
    setEditingRegulation(reg);
    setNewRegCode(reg.code);
    setNewRegName(reg.name);
    setIsRegulationModalMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsRegulationModalVisible(true);
      });
    });
  };

  const closeRegulationModal = () => {
    setIsRegulationModalVisible(false);
    setTimeout(() => {
      setIsRegulationModalMounted(false);
      setEditingRegulation(null);
      setNewRegCode("");
      setNewRegName("");
    }, 400);
  };

  const openEditSemesterModal = (sem: Semester) => {
    setEditingSemester(sem);
    setSemTitle(sem.name);
    setSemActive(sem.active);
    setIsSemesterModalMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSemesterModalVisible(true);
      });
    });
  };

  const closeSemesterModal = () => {
    setIsSemesterModalVisible(false);
    setTimeout(() => {
      setIsSemesterModalMounted(false);
      setEditingSemester(null);
      setSemTitle("");
    }, 400);
  };

  // Grouped Subjects (1 row per code + regulation + semester across all its branches)
  const groupedSubjects = useMemo<GroupedSubject[]>(() => {
    const map = new Map<string, GroupedSubject>();
    for (const sub of subjects) {
      const reg = sub.regulation || "R23";
      const key = `${sub.code}___${reg}___${sub.semester}`;
      const existing = map.get(key);
      if (existing) {
        if (!existing.branches.includes(sub.branch)) {
          existing.branches.push(sub.branch);
        }
        existing.active = existing.active || sub.active;
      } else {
        map.set(key, {
          code: sub.code,
          title: sub.title,
          semester: sub.semester,
          regulation: reg,
          branches: [sub.branch],
          active: sub.active,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.code.localeCompare(b.code);
    });
  }, [subjects]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalSubjects = groupedSubjects.length;
    const activeSubjects = groupedSubjects.filter((s) => s.active).length;
    const totalBranches = branches.length;
    const totalSemesters = initialSemesters.length;
    const totalRegulations = regulations.length;
    return { totalSubjects, activeSubjects, totalBranches, totalSemesters, totalRegulations };
  }, [groupedSubjects, branches, initialSemesters, regulations]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    return groupedSubjects.filter((s) => {
      const matchesSearch =
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = branchFilter === "all" ? true : s.branches.includes(branchFilter);
      const matchesSemester = semesterFilter === "all" ? true : s.semester.toString() === semesterFilter;
      const matchesRegulation = regulationFilter === "all" ? true : s.regulation === regulationFilter;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? s.active
          : !s.active;

      return matchesSearch && matchesBranch && matchesSemester && matchesRegulation && matchesStatus;
    });
  }, [groupedSubjects, searchQuery, branchFilter, semesterFilter, regulationFilter, statusFilter]);

  // Paginated Subjects
  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const paginatedSubjects = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredSubjects.slice(startIdx, startIdx + pageSize);
  }, [filteredSubjects, currentPage, pageSize]);

  // Submit Handler for Subject (Create OR Update)
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subBranches.length === 0) {
      addToast("error", "Branch Selection Required", "Please select at least one branch for this subject.");
      return;
    }
    setSubjectLoading(true);

    const semNum = parseInt(subSemester, 10);
    const formattedCode = subCode.toUpperCase().trim();
    const formattedTitle = subTitle.trim();
    const formattedReg = subRegulation.toUpperCase().trim() || "R23";

    try {
      if (editingSubject) {
        // UPDATE Subject across branches
        const origBranches = editingSubject.originalBranches && editingSubject.originalBranches.length > 0
          ? editingSubject.originalBranches
          : [editingSubject.originalBranch || subBranches[0]];

        const result = await updateSubjectAction(
          editingSubject.originalCode,
          origBranches[0] || "",
          editingSubject.originalRegulation,
          {
            code: formattedCode,
            title: formattedTitle,
            branches: subBranches,
            semester: semNum,
            regulation: formattedReg,
            active: subActive,
            originalBranches: origBranches,
          }
        );

        if (result.error) {
          addToast("error", "Subject Update Failed", result.error);
        } else {
          addToast(
            "success", 
            "Subject Updated", 
            `${formattedCode} - ${formattedTitle} [${formattedReg}] updated across ${subBranches.join(", ")}.`
          );
          const updatedRecords = subBranches.map((b) => ({
            code: formattedCode,
            title: formattedTitle,
            branch: b,
            semester: semNum,
            regulation: formattedReg,
            active: subActive,
          }));
          setSubjects((prev) => [
            ...updatedRecords,
            ...prev.filter((s) => !(
              (s.code === editingSubject.originalCode && origBranches.includes(s.branch) && (s.regulation || "R23") === editingSubject.originalRegulation) ||
              (s.code === formattedCode && subBranches.includes(s.branch) && (s.regulation || "R23") === formattedReg)
            )),
          ]);
          closeSubjectDrawer();
        }
      } else {
        // CREATE Subject across selected branches with regulation
        const result = await createSubjectAction(
          formattedCode,
          formattedTitle,
          subBranches,
          semNum,
          formattedReg
        );

        if (result.error) {
          addToast("error", "Subject Creation Failed", result.error);
        } else {
          addToast(
            "success",
            "Subject Created Successfully",
            `${formattedCode} - ${formattedTitle} (${formattedReg}) registered for ${subBranches.join(", ")}.`
          );
          const createdRecords = subBranches.map((b) => ({
            code: formattedCode,
            title: formattedTitle,
            branch: b,
            semester: semNum,
            regulation: formattedReg,
            active: true,
          }));
          setSubjects((prev) => [
            ...createdRecords,
            ...prev.filter((s) => !(s.code === formattedCode && subBranches.includes(s.branch) && (s.regulation || "R23") === formattedReg)),
          ]);
          setSubCode("");
          setSubTitle("");
          closeSubjectDrawer();
        }
      }
    } catch {
      addToast("error", "Error", "An unexpected error occurred.");
    } finally {
      setSubjectLoading(false);
    }
  };

  // Delete Subject Handler (across all its branches)
  const handleDeleteSubjectConfirm = async () => {
    if (!deletingSubject) return;
    setIsDeletingSubject(true);

    try {
      const result = await deleteSubjectGroupAction(deletingSubject.code, deletingSubject.branches, deletingSubject.regulation || "R23");
      if (result.error) {
        addToast("error", "Delete Failed", result.error);
      } else {
        addToast("success", "Subject Deleted", `${deletingSubject.code} was removed across ${deletingSubject.branches.join(", ")}.`);
        setSubjects((prev) =>
          prev.filter((s) => !(s.code === deletingSubject.code && deletingSubject.branches.includes(s.branch) && (s.regulation || "R23") === (deletingSubject.regulation || "R23")))
        );
        setDeletingSubject(null);
      }
    } catch {
      addToast("error", "Error", "Failed to delete subject.");
    } finally {
      setIsDeletingSubject(false);
    }
  };

  // Toggle Subject Active (across all its branches)
  const handleToggleSubject = async (sub: GroupedSubject) => {
    const key = `${sub.code}-${sub.regulation}`;
    setTogglingCode(key);
    try {
      const res = await toggleSubjectGroupActiveAction(sub.code, sub.branches, sub.regulation, sub.active);
      if (res.error) {
        addToast("error", "Status Update Failed", res.error);
      } else {
        const nextActive = !sub.active;
        setSubjects((prev) =>
          prev.map((s) =>
            s.code === sub.code && (s.regulation || "R23") === sub.regulation && sub.branches.includes(s.branch)
              ? { ...s, active: nextActive }
              : s
          )
        );
        addToast("success", "Status Updated", `${sub.code} is now ${nextActive ? "Active" : "Inactive"}.`);
      }
    } catch {
      addToast("error", "Error", "Failed to update subject status.");
    } finally {
      setTogglingCode(null);
    }
  };

  // Save Branch Handler (Create or Update)
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchCode.trim() || !branchName.trim()) return;
    setBranchLoading(true);
    const code = branchCode.toUpperCase().trim();
    const name = branchName.trim();

    try {
      if (editingBranch) {
        // UPDATE Branch
        const res = await updateBranchAction(editingBranch.code, {
          code,
          name,
          active: editingBranch.active,
        });
        if (res.error) {
          addToast("error", "Branch Update Failed", res.error);
        } else {
          addToast("success", "Branch Updated", `Branch ${code} (${name}) was updated.`);
          setBranches((prev) =>
            prev.map((b) => (b.code === editingBranch.code ? { ...b, code, name } : b))
          );
          if (code !== editingBranch.code) {
            setSubjects((prev) =>
              prev.map((s) => (s.branch === editingBranch.code ? { ...s, branch: code } : s))
            );
          }
          closeBranchModal();
        }
      } else {
        // CREATE Branch
        const res = await createBranchAction(code, name);
        if (res.error) {
          addToast("error", "Branch Creation Failed", res.error);
        } else {
          addToast("success", "Branch Created", `Branch ${code} was added.`);
          setBranches((prev) => [
            ...prev,
            { code, name, active: true },
          ]);
          closeBranchModal();
        }
      }
    } catch {
      addToast("error", "Error", "Failed to save branch.");
    } finally {
      setBranchLoading(false);
    }
  };

  // Toggle Branch Status
  const handleToggleBranch = async (code: string, currentActive: boolean) => {
    setTogglingBranchCode(code);
    try {
      const res = await toggleBranchActiveAction(code, currentActive);
      if (res.error) {
        addToast("error", "Status Update Failed", res.error);
      } else {
        setBranches((prev) =>
          prev.map((b) => (b.code === code ? { ...b, active: !currentActive } : b))
        );
        addToast("success", "Status Updated", `Branch ${code} is now ${!currentActive ? "Active" : "Inactive"}.`);
      }
    } catch {
      addToast("error", "Error", "Failed to update branch status.");
    } finally {
      setTogglingBranchCode(null);
    }
  };

  // Delete Branch Confirm
  const handleDeleteBranchConfirm = async () => {
    if (!deletingBranch) return;
    setIsDeletingBranch(true);
    try {
      const res = await deleteBranchAction(deletingBranch.code);
      if (res.error) {
        addToast("error", "Delete Failed", res.error);
      } else {
        addToast("success", "Branch Deleted", `Branch ${deletingBranch.code} was removed.`);
        setBranches((prev) => prev.filter((b) => b.code !== deletingBranch.code));
        setDeletingBranch(null);
      }
    } catch {
      addToast("error", "Error", "Failed to delete branch.");
    } finally {
      setIsDeletingBranch(false);
    }
  };

  // Save Regulation Handler (Create or Update)
  const handleSaveRegulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegCode.trim()) return;
    setRegLoading(true);
    const code = newRegCode.toUpperCase().trim();
    const name = newRegName.trim() || `${code} Autonomous Regulation`;

    try {
      if (editingRegulation) {
        // UPDATE Regulation
        const res = await updateRegulationAction(editingRegulation.code, {
          code,
          name,
          active: editingRegulation.active,
        });
        if (res.error) {
          addToast("error", "Update Failed", res.error);
        } else {
          addToast("success", "Regulation Updated", `Regulation ${code} (${name}) was updated.`);
          setRegulations((prev) =>
            prev.map((r) => (r.code === editingRegulation.code ? { ...r, code, name } : r))
          );
          if (code !== editingRegulation.code) {
            setSubjects((prev) =>
              prev.map((s) => (s.regulation === editingRegulation.code ? { ...s, regulation: code } : s))
            );
          }
          closeRegulationModal();
        }
      } else {
        // CREATE Regulation
        const res = await createRegulationAction(code, name);
        if (res.error) {
          addToast("error", "Regulation Creation Failed", res.error);
        } else {
          addToast("success", "Regulation Created", `Regulation ${code} (${name}) was registered.`);
          const newReg = { code, name, active: true };
          setRegulations((prev) => [...prev.filter((r) => r.code !== code), newReg]);
          setSubRegulation(code);
          closeRegulationModal();
        }
      }
    } catch {
      addToast("error", "Error", "Failed to save regulation.");
    } finally {
      setRegLoading(false);
    }
  };

  // Toggle Regulation Status
  const handleToggleRegulation = async (code: string, currentActive: boolean) => {
    setTogglingRegCode(code);
    try {
      const res = await toggleRegulationActiveAction(code, currentActive);
      if (res.error) {
        addToast("error", "Status Update Failed", res.error);
      } else {
        setRegulations((prev) =>
          prev.map((r) => (r.code === code ? { ...r, active: !currentActive } : r))
        );
        addToast("success", "Status Updated", `Regulation ${code} is now ${!currentActive ? "Active" : "Inactive"}.`);
      }
    } catch {
      addToast("error", "Error", "Failed to update regulation status.");
    } finally {
      setTogglingRegCode(null);
    }
  };

  // Delete Regulation Confirm
  const handleDeleteRegulationConfirm = async () => {
    if (!deletingRegulation) return;
    setIsDeletingRegulation(true);
    try {
      const res = await deleteRegulationAction(deletingRegulation.code);
      if (res.error) {
        addToast("error", "Delete Failed", res.error);
      } else {
        addToast("success", "Regulation Deleted", `Regulation ${deletingRegulation.code} was removed.`);
        setRegulations((prev) => prev.filter((r) => r.code !== deletingRegulation.code));
        setDeletingRegulation(null);
      }
    } catch {
      addToast("error", "Error", "Failed to delete regulation.");
    } finally {
      setIsDeletingRegulation(false);
    }
  };

  // Save Semester Handler (Update)
  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSemester) return;
    setSemLoading(true);
    const name = semTitle.trim() || `Semester ${editingSemester.number}`;

    try {
      const res = await updateSemesterAction(editingSemester.number, {
        name,
        active: semActive,
      });

      if (res.error) {
        addToast("error", "Update Failed", res.error);
      } else {
        addToast("success", "Semester Updated", `Sem ${editingSemester.number} updated to "${name}".`);
        setSemesters((prev) =>
          prev.map((s) => (s.number === editingSemester.number ? { ...s, name, active: semActive } : s))
        );
        closeSemesterModal();
      }
    } catch {
      addToast("error", "Error", "Failed to update semester.");
    } finally {
      setSemLoading(false);
    }
  };

  // Toggle Semester Status
  const handleToggleSemester = async (number: number, currentActive: boolean) => {
    setTogglingSemNumber(number);
    try {
      const res = await toggleSemesterActiveAction(number, currentActive);
      if (res.error) {
        addToast("error", "Status Update Failed", res.error);
      } else {
        setSemesters((prev) =>
          prev.map((s) => (s.number === number ? { ...s, active: !currentActive } : s))
        );
        addToast("success", "Status Updated", `Sem ${number} is now ${!currentActive ? "Active" : "Inactive"}.`);
      }
    } catch {
      addToast("error", "Error", "Failed to update semester status.");
    } finally {
      setTogglingSemNumber(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 w-full pb-10">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* ========================================================================= */}
      {/* HEADER BANNER */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/5 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                Curriculum & Taxonomy Management
              </h1>
              <p className="text-xs sm:text-sm text-primary/60 font-normal">
                Manage autonomous regulations (R23, R24, A2), branches, semesters, and multi-branch course catalogs.
              </p>
            </div>
          </div>

          {/* Stat Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-xs font-medium text-indigo-700">
              <Award className="h-3.5 w-3.5 text-indigo-600" />
              Regulations: <span className="font-semibold">{stats.totalRegulations}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-xs font-medium text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Subjects: <span className="font-semibold">{stats.totalSubjects}</span> ({stats.activeSubjects} Active)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Branches: <span className="font-semibold">{stats.totalBranches}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs font-medium text-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
              Semesters: <span className="font-semibold">{stats.totalSemesters}</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
          <button
            onClick={openRegulationModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
          >
            <Award className="h-4 w-4 text-indigo-600" />
            <span>+ Add Regulation</span>
          </button>

          <button
            onClick={openBranchModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-bg hover:bg-surface text-primary font-medium text-xs sm:text-sm transition-all shadow-xs hover:shadow-sm cursor-pointer"
          >
            <FolderPlus className="h-4 w-4 text-primary/70" />
            <span>+ Add Branch</span>
          </button>

          <button
            onClick={openSubjectDrawer}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-medium text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <BookOpen className="h-4 w-4" />
            <span>+ Add Subject</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="bg-surface p-4 sm:p-5 rounded-3xl border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
          {[
            { id: "subjects", label: "Subjects Catalog", count: groupedSubjects.length, icon: BookOpen },
            { id: "regulations", label: "Academic Regulations", count: regulations.length, icon: Award },
            { id: "branches", label: "Department Branches", count: branches.length, icon: FolderPlus },
            { id: "semesters", label: "Semester Timelines", count: semesters.length, icon: Calendar },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as "subjects" | "regulations" | "branches" | "semesters");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "bg-bg text-primary/70 hover:text-primary hover:bg-border/60 font-normal"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    isActive ? "bg-white/20 text-white" : "bg-surface border border-border text-primary/60"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subjects Tab Toolbar Filter Controls */}
        {activeTab === "subjects" && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-0.5">
            {/* Search Box */}
            <div className="sm:col-span-4 relative">
              <Search className="absolute left-4 top-3 h-4 w-4 text-primary/40" />
              <input
                placeholder="Search code or subject title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-11 pr-10 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/40 font-normal text-primary placeholder:text-primary/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3.5 top-3 text-primary/40 hover:text-primary p-0.5 rounded-full hover:bg-border cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Regulation Filter */}
            <div className="sm:col-span-2">
              <select
                value={regulationFilter}
                onChange={(e) => {
                  setRegulationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2.5 text-sm font-normal bg-bg border border-border rounded-full text-primary focus:outline-none focus:ring-2 focus:ring-secondary/40 cursor-pointer"
              >
                <option value="all">All Regulations</option>
                {regulations.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.code} ({r.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Selector */}
            <div className="sm:col-span-2">
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2.5 text-sm font-normal bg-bg border border-border rounded-full text-primary focus:outline-none focus:ring-2 focus:ring-secondary/40 cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Selector */}
            <div className="sm:col-span-2">
              <select
                value={semesterFilter}
                onChange={(e) => {
                  setSemesterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2.5 text-sm font-normal bg-bg border border-border rounded-full text-primary focus:outline-none focus:ring-2 focus:ring-secondary/40 cursor-pointer"
              >
                <option value="all">All Semesters</option>
                {semesters.map((s) => (
                  <option key={s.number} value={s.number.toString()}>
                    Sem {s.number}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Selector */}
            <div className="sm:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2.5 text-sm font-normal bg-bg border border-border rounded-full text-primary focus:outline-none focus:ring-2 focus:ring-secondary/40 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUBJECTS CATALOG VIEW WITH REGULATION COLUMN & FULL CRUD */}
      {/* ========================================================================= */}
      {activeTab === "subjects" && (
        <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-xs">
          {paginatedSubjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-bg/50 text-primary/50 font-semibold uppercase tracking-wider text-xs border-b border-border">
                    <th className="py-3.5 pl-6 pr-4">Regulation</th>
                    <th className="py-3.5 px-4">Course Code</th>
                    <th className="py-3.5 px-4">Subject Title</th>
                    <th className="py-3.5 px-4">Branches</th>
                    <th className="py-3.5 px-4">Semester</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedSubjects.map((sub) => {
                    const reg = sub.regulation || "R23";
                    const isToggling = togglingCode === `${sub.code}-${reg}`;

                    return (
                      <tr key={`${sub.code}-${reg}-${sub.semester}`} className="hover:bg-bg/30 transition-colors group">
                        {/* Regulation Badge */}
                        <td className="py-3.5 pl-6 pr-4">
                          <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-xs tracking-wide">
                            {reg}
                          </span>
                        </td>

                        {/* Course Code Badge */}
                        <td className="py-3.5 px-4">
                          <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-xs">
                            {sub.code}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="py-3.5 px-4 font-semibold text-primary text-sm leading-snug group-hover:text-secondary transition-colors">
                          {formatSubjectTitle(sub.title)}
                        </td>

                        {/* Branches Pills */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                            {sub.branches.map((b) => (
                              <span
                                key={b}
                                className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Semester */}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-xs font-medium text-secondary">
                            Sem {sub.semester}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {sub.active ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Full CRUD Actions */}
                        <td className="py-3.5 pl-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Trigger */}
                            <button
                              onClick={() => openEditSubjectDrawer(sub)}
                              title="Edit Subject"
                              className="p-1.5 rounded-full border border-border bg-surface text-primary/70 hover:text-primary hover:bg-bg hover:border-primary/30 transition-all cursor-pointer shadow-2xs"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* Activate / Deactivate Toggle */}
                            <button
                              onClick={() => handleToggleSubject(sub)}
                              disabled={isToggling}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 ${
                                sub.active
                                  ? "bg-surface hover:bg-red-50 text-primary/70 hover:text-red-700 border-border hover:border-red-200/80 shadow-2xs"
                                  : "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80 shadow-2xs"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                              ) : sub.active ? (
                                "Deactivate"
                              ) : (
                                "Activate"
                              )}
                            </button>

                            {/* Delete Trigger */}
                            <button
                              onClick={() => setDeletingSubject(sub)}
                              title="Delete Subject"
                              className="p-1.5 rounded-full border border-red-200/60 bg-red-50/50 text-red-600 hover:bg-red-100/80 hover:border-red-300 transition-all cursor-pointer shadow-2xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center space-y-2.5">
              <div className="w-12 h-12 mx-auto rounded-full bg-bg border border-border flex items-center justify-center text-primary/40">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-primary text-sm">No Subjects Found</h3>
                <p className="text-xs text-primary/50 mt-0.5 max-w-sm mx-auto font-normal">
                  No curriculum subject records match your current regulation, branch, or semester criteria.
                </p>
              </div>
              <button
                onClick={openSubjectDrawer}
                className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-medium shadow-xs hover:bg-primary/95 transition-all cursor-pointer"
              >
                + Add First Subject
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredSubjects.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-bg/20">
              <div className="flex items-center gap-3 text-xs font-normal text-primary/60">
                <span>
                  Showing{" "}
                  <span className="text-primary font-semibold">
                    {Math.min((currentPage - 1) * pageSize + 1, filteredSubjects.length)}
                  </span>{" "}
                  to{" "}
                  <span className="text-primary font-semibold">
                    {Math.min(currentPage * pageSize, filteredSubjects.length)}
                  </span>{" "}
                  of <span className="text-primary font-semibold">{filteredSubjects.length}</span> subjects
                </span>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 text-xs bg-bg border border-border rounded-lg text-primary focus:outline-none cursor-pointer"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-border bg-surface text-primary disabled:opacity-30 hover:bg-bg transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium px-2 text-primary">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-border bg-surface text-primary disabled:opacity-30 hover:bg-bg transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* REGULATIONS TAB */}
      {/* ========================================================================= */}
      {activeTab === "regulations" && (
        <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-primary">Registered Academic Regulations</h2>
              <p className="text-xs text-primary/60 font-normal">
                Manage university autonomous regulations (e.g., R23, R24, R20, A2).
              </p>
            </div>
            <button
              onClick={openRegulationModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Regulation</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-bg/50 text-primary/50 font-semibold uppercase tracking-wider text-xs border-b border-border">
                  <th className="py-3.5 pl-6 pr-4">Regulation Code</th>
                  <th className="py-3.5 px-4">Regulation Description</th>
                  <th className="py-3.5 px-4">Mapped Subjects</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {regulations.map((reg) => {
                  const mappedCount = subjects.filter((s) => (s.regulation || "R23") === reg.code).length;
                  const isToggling = togglingRegCode === reg.code;

                  return (
                    <tr key={reg.code} className="hover:bg-bg/30 transition-colors">
                      <td className="py-3.5 pl-6 pr-4">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-xs">
                          {reg.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-primary">{reg.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                          {mappedCount} Subjects
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {reg.active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditRegulationModal(reg)}
                            title="Edit Regulation"
                            className="p-1.5 rounded-full border border-border bg-surface text-primary/70 hover:text-primary hover:bg-bg hover:border-primary/30 transition-all cursor-pointer shadow-2xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleRegulation(reg.code, reg.active)}
                            disabled={isToggling}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 ${
                              reg.active
                                ? "bg-surface hover:bg-red-50 text-primary/70 hover:text-red-700 border-border hover:border-red-200/80 shadow-2xs"
                                : "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80 shadow-2xs"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                            ) : reg.active ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </button>
                          <button
                            onClick={() => setDeletingRegulation(reg)}
                            title="Delete Regulation"
                            className="p-1.5 rounded-full border border-red-200/60 bg-red-50/50 text-red-600 hover:bg-red-100/80 hover:border-red-300 transition-all cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BRANCHES TAB */}
      {/* ========================================================================= */}
      {activeTab === "branches" && (
        <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-primary">Departmental Branches</h2>
              <p className="text-xs text-primary/60 font-normal">
                Autonomous engineering specializations offering student enrollment.
              </p>
            </div>
            <button
              onClick={openBranchModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary/95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Branch</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-bg/50 text-primary/50 font-semibold uppercase tracking-wider text-xs border-b border-border">
                  <th className="py-3.5 pl-6 pr-4">Branch Code</th>
                  <th className="py-3.5 px-4">Specialization Title</th>
                  <th className="py-3.5 px-4">Associated Subjects</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {branches.map((b) => {
                  const mappedCount = subjects.filter((s) => s.branch === b.code).length;
                  const isToggling = togglingBranchCode === b.code;

                  return (
                    <tr key={b.code} className="hover:bg-bg/30 transition-colors">
                      <td className="py-3.5 pl-6 pr-4">
                        <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-bold text-xs">
                          {b.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-primary">{b.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                          {mappedCount} Subjects
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {b.active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditBranchModal(b)}
                            title="Edit Branch"
                            className="p-1.5 rounded-full border border-border bg-surface text-primary/70 hover:text-primary hover:bg-bg hover:border-primary/30 transition-all cursor-pointer shadow-2xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleBranch(b.code, b.active)}
                            disabled={isToggling}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 ${
                              b.active
                                ? "bg-surface hover:bg-red-50 text-primary/70 hover:text-red-700 border-border hover:border-red-200/80 shadow-2xs"
                                : "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80 shadow-2xs"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                            ) : b.active ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </button>
                          <button
                            onClick={() => setDeletingBranch(b)}
                            title="Delete Branch"
                            className="p-1.5 rounded-full border border-red-200/60 bg-red-50/50 text-red-600 hover:bg-red-100/80 hover:border-red-300 transition-all cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEMESTERS TAB */}
      {/* ========================================================================= */}
      {activeTab === "semesters" && (
        <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-primary">Academic Semesters</h2>
              <p className="text-xs text-primary/60 font-normal">
                Four-year B.Tech curriculum timelines (Semesters 1 through 8).
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {semesters.map((sem) => {
              const semSubjects = subjects.filter((s) => s.semester === sem.number);
              const isToggling = togglingSemNumber === sem.number;

              return (
                <div
                  key={sem.number}
                  className={`p-5 rounded-2xl bg-bg border transition-all shadow-2xs flex flex-col justify-between ${
                    sem.active ? "border-border/80 hover:border-primary/30" : "border-slate-300/70 opacity-70 bg-slate-50/50"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        Sem {sem.number}
                      </span>
                      <button
                        onClick={() => handleToggleSemester(sem.number, sem.active)}
                        disabled={isToggling}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          sem.active 
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200" 
                            : "text-slate-600 bg-slate-100 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="h-3 w-3 animate-spin inline-block" />
                        ) : sem.active ? (
                          "Active"
                        ) : (
                          "Inactive"
                        )}
                      </button>
                    </div>
                    <div>
                      <h3 className="font-bold text-primary text-sm leading-snug">{sem.name}</h3>
                      <p className="text-xs text-primary/60 font-normal mt-0.5">
                        {semSubjects.length} curriculum subjects registered
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-border/60">
                    <button
                      onClick={() => openEditSemesterModal(sem)}
                      className="w-full py-1.5 px-3 rounded-full border border-border bg-surface hover:bg-bg text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER DRAWER: CREATE / EDIT SUBJECT WITH REGULATION SUPPORT */}
      {/* ========================================================================= */}
      {isSubjectDrawerMounted && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={closeSubjectDrawer}
            className={`absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out cursor-pointer ${
              isSubjectDrawerVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className={`w-screen max-w-md bg-surface border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
                isSubjectDrawerVisible ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {/* Drawer Header */}
              <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between bg-bg/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">
                      {editingSubject ? "Edit Curriculum Subject" : "Add New Subject"}
                    </h3>
                    <p className="text-xs text-primary/55 font-normal mt-0.5">
                      {editingSubject ? `Modify course code: ${editingSubject.originalCode}` : "Register curriculum subject with regulation"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeSubjectDrawer}
                  disabled={subjectLoading}
                  className="p-2 rounded-full text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form
                id="subject-manage-form"
                data-lenis-prevent
                onSubmit={handleSubjectSubmit}
                className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto overscroll-contain"
              >
                {/* Regulation Selector with Quick Add */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Academic Regulation *
                    </label>
                    <button
                      type="button"
                      onClick={openRegulationModal}
                      className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add New Regulation
                    </button>
                  </div>
                  <select
                    value={subRegulation}
                    onChange={(e) => setSubRegulation(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/40 text-primary font-semibold cursor-pointer"
                  >
                    {regulations.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} - {r.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-primary/50 mt-1">
                    Defines the academic regulation syllabus standard (e.g. R23, R24, A2).
                  </p>
                </div>

                {/* Course Code */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 mb-1">
                    Subject Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    placeholder="Enter course subject code"
                    className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/40 text-primary font-normal placeholder:text-primary/40 uppercase"
                  />
                </div>

                {/* Subject Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 mb-1">
                    Subject Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="Enter subject title"
                    className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/40 text-primary font-normal placeholder:text-primary/40"
                  />
                </div>

                {/* Multi-Select Branches */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Assigned Branches (Multi-Select) *
                    </label>
                    <button
                      type="button"
                      onClick={toggleSelectAllBranches}
                      className="text-[11px] font-bold text-secondary hover:underline cursor-pointer"
                    >
                      {subBranches.length === branches.length ? "Deselect All" : "Select All Branches"}
                    </button>
                  </div>

                  {/* Multi-Select Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-left bg-bg border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-secondary/40 text-primary flex items-center justify-between gap-2 cursor-pointer transition-all hover:border-primary/30"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                      {subBranches.length === branches.length ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          <Check className="h-3 w-3" /> All Branches ({branches.length})
                        </span>
                      ) : subBranches.length > 0 ? (
                        subBranches.map((bCode) => (
                          <span
                            key={bCode}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 shadow-2xs"
                          >
                            {bCode}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-primary/40">Select one or more branches...</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-primary/50 shrink-0">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isBranchDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isBranchDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsBranchDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1.5 p-2 bg-surface border border-border rounded-2xl shadow-xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={toggleSelectAllBranches}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold hover:bg-bg flex items-center justify-between cursor-pointer transition-colors text-primary"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={subBranches.length === branches.length}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer pointer-events-none"
                            />
                            <span>All Branches (Common Course)</span>
                          </div>
                          <span className="text-[10px] text-primary/50 uppercase font-semibold">
                            {branches.length} Branches
                          </span>
                        </button>

                        <div className="border-t border-border my-1" />

                        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                          {branches.map((b) => {
                            const isSelected = subBranches.includes(b.code);
                            return (
                              <button
                                key={b.code}
                                type="button"
                                onClick={() => toggleBranchSelection(b.code)}
                                className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? "bg-primary/5 text-primary font-bold"
                                    : "hover:bg-bg text-primary/80 font-normal"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer pointer-events-none shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="font-extrabold text-xs">{b.code}</span>
                                    <span className="text-[11px] text-primary/55 block truncate font-normal">
                                      {b.name}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Semester Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 mb-1">
                    Semester *
                  </label>
                  <select
                    value={subSemester}
                    onChange={(e) => setSubSemester(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/40 text-primary font-normal cursor-pointer"
                  >
                    {semesters.map((s) => (
                      <option key={s.number} value={s.number.toString()}>
                        Semester {s.number} ({s.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Checkbox */}
                {editingSubject && (
                  <div className="flex items-center gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="sub-active-status"
                      checked={subActive}
                      onChange={(e) => setSubActive(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="sub-active-status" className="text-xs font-medium text-primary cursor-pointer">
                      Subject is Active in Catalog
                    </label>
                  </div>
                )}
              </form>

              {/* Drawer Footer */}
              <div className="p-4 sm:p-6 border-t border-border bg-bg/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeSubjectDrawer}
                  disabled={subjectLoading}
                  className="px-5 py-2.5 rounded-full border border-border bg-surface text-primary text-xs font-semibold hover:bg-bg transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  form="subject-manage-form"
                  disabled={subjectLoading}
                  className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {subjectLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingSubject ? "Save Changes" : "Register Subject"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT REGULATION */}
      {/* ========================================================================= */}
      {isRegulationModalMounted && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={closeRegulationModal}
            className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
              isRegulationModalVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            className={`relative bg-surface rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-5 transform transition-all duration-300 ${
              isRegulationModalVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Award className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-primary">
                    {editingRegulation ? "Edit Academic Regulation" : "Add Academic Regulation"}
                  </h3>
                  <p className="text-xs text-primary/55 font-normal">
                    {editingRegulation ? `Modify regulation: ${editingRegulation.code}` : "Define syllabus regulation code"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeRegulationModal}
                className="p-1.5 rounded-full text-primary/40 hover:text-primary hover:bg-bg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRegulation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 mb-1">
                  Regulation Code *
                </label>
                <input
                  type="text"
                  required
                  value={newRegCode}
                  onChange={(e) => setNewRegCode(e.target.value)}
                  placeholder="Enter regulation code"
                  className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-primary font-semibold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 mb-1">
                  Regulation Description
                </label>
                <input
                  type="text"
                  value={newRegName}
                  onChange={(e) => setNewRegName(e.target.value)}
                  placeholder="Enter regulation description or title"
                  className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-primary font-normal"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRegulationModal}
                  className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-primary hover:bg-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading || !newRegCode.trim()}
                  className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {regLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingRegulation ? "Update Regulation" : "Save Regulation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT BRANCH */}
      {/* ========================================================================= */}
      {isBranchModalMounted && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={closeBranchModal}
            className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
              isBranchModalVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            className={`relative bg-surface rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-5 transform transition-all duration-300 ${
              isBranchModalVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <FolderPlus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-primary">
                    {editingBranch ? "Edit Department Branch" : "Add Department Branch"}
                  </h3>
                  <p className="text-xs text-primary/55 font-normal">
                    {editingBranch ? `Modify branch: ${editingBranch.code}` : "Define engineering specialization"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeBranchModal}
                className="p-1.5 rounded-full text-primary/40 hover:text-primary hover:bg-bg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 mb-1">
                  Branch Code *
                </label>
                <input
                  type="text"
                  required
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  placeholder="Enter branch code"
                  className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/40 text-primary font-semibold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Enter branch full name"
                  className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/40 text-primary font-normal"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeBranchModal}
                  className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-primary hover:bg-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={branchLoading || !branchCode.trim() || !branchName.trim()}
                  className="px-5 py-2 rounded-full bg-primary hover:bg-primary/95 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {branchLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingBranch ? "Update Branch" : "Save Branch"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT SEMESTER */}
      {/* ========================================================================= */}
      {isSemesterModalMounted && editingSemester && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={closeSemesterModal}
            className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
              isSemesterModalVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            className={`relative bg-surface rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-5 transform transition-all duration-300 ${
              isSemesterModalVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-primary">
                    Edit Semester {editingSemester.number}
                  </h3>
                  <p className="text-xs text-primary/55 font-normal">
                    Update academic curriculum timeline
                  </p>
                </div>
              </div>
              <button
                onClick={closeSemesterModal}
                className="p-1.5 rounded-full text-primary/40 hover:text-primary hover:bg-bg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSemester} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 mb-1">
                  Semester Display Title *
                </label>
                <input
                  type="text"
                  required
                  value={semTitle}
                  onChange={(e) => setSemTitle(e.target.value)}
                  placeholder="Enter semester display title"
                  className="w-full px-4 py-2.5 text-sm bg-bg border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary font-medium"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-bg border border-border/70">
                <input
                  type="checkbox"
                  id="sem-active-status"
                  checked={semActive}
                  onChange={(e) => setSemActive(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary/30 border-border cursor-pointer"
                />
                <label htmlFor="sem-active-status" className="text-xs font-medium text-primary cursor-pointer">
                  Semester is active in curriculum timeline
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeSemesterModal}
                  className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-primary hover:bg-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={semLoading || !semTitle.trim()}
                  className="px-5 py-2 rounded-full bg-primary hover:bg-primary/95 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {semLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Semester</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE REGULATION CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingRegulation && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setDeletingRegulation(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <div className="relative bg-surface rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-2xl bg-red-50">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Delete Regulation?</h3>
                <p className="text-xs text-primary/55 font-normal">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-primary/70 leading-relaxed font-normal">
              Are you sure you want to remove <span className="font-bold text-primary">{deletingRegulation.code} - {deletingRegulation.name}</span> from the registered regulations?
            </p>

            {subjects.filter((s) => (s.regulation || "R23") === deletingRegulation.code).length > 0 && (
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-700">
                <strong>Warning:</strong> {subjects.filter((s) => (s.regulation || "R23") === deletingRegulation.code).length} curriculum subject(s) are currently mapped to this regulation. You must reassign or remove them first.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRegulation(null)}
                disabled={isDeletingRegulation}
                className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-primary hover:bg-bg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRegulationConfirm}
                disabled={isDeletingRegulation}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingRegulation && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Regulation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE BRANCH CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingBranch && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setDeletingBranch(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <div className="relative bg-surface rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-2xl bg-red-50">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Delete Department Branch?</h3>
                <p className="text-xs text-primary/55 font-normal">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-primary/70 leading-relaxed font-normal">
              Are you sure you want to remove <span className="font-bold text-primary">{deletingBranch.code} - {deletingBranch.name}</span> from the department branches?
            </p>

            {subjects.filter((s) => s.branch === deletingBranch.code).length > 0 && (
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-700">
                <strong>Warning:</strong> {subjects.filter((s) => s.branch === deletingBranch.code).length} curriculum subject(s) are currently associated with this branch. You must reassign or remove them first.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBranch(null)}
                disabled={isDeletingBranch}
                className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-primary hover:bg-bg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBranchConfirm}
                disabled={isDeletingBranch}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingBranch && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Branch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE SUBJECT CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setDeletingSubject(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <div className="relative bg-surface rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-2xl bg-red-50">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Delete Subject?</h3>
                <p className="text-xs text-primary/55 font-normal">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-primary/70 leading-relaxed font-normal">
              Are you sure you want to remove <span className="font-bold text-primary">{deletingSubject.code} - {deletingSubject.title}</span> ({deletingSubject.branches.join(", ")}, {deletingSubject.regulation || "R23"}) from the catalog?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                disabled={isDeletingSubject}
                className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-primary hover:bg-bg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubjectConfirm}
                disabled={isDeletingSubject}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingSubject && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Subject</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
