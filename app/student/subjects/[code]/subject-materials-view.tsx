"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  FileText, 
  Search, 
  ArrowLeft, 
  BookOpen, 
  ChevronRight, 
  Layers, 
  User, 
  Calendar,
  Clock,
  FolderOpen,
  X,
  FileCheck2,
  Sparkles
} from "lucide-react";
import { formatSubjectTitle } from "@/lib/utils";

interface MaterialFileItem {
  id: string;
  file_name: string;
  size: number;
  mime_type: string;
  storage_ref: string;
  version?: number;
}

interface MaterialItem {
  id: string;
  title: string;
  type: string;
  created_at: string;
  tags?: string[];
  branch?: string;
  subject?: string;
  users?: {
    name?: string;
  };
  material_files?: MaterialFileItem[];
}

interface SubjectItem {
  code: string;
  title: string;
  branch: string;
  semester: number;
  regulation?: string;
  description?: string;
}

interface SubjectMaterialsViewProps {
  subject: SubjectItem;
  materials: MaterialItem[];
  studentBranch: string;
  initialType?: string;
  initialQuery?: string;
  examLockout: {
    isLocked: boolean;
    examTitle?: string;
    startTimeText?: string;
    endTimeText?: string;
    message?: string;
  };
}

const CATEGORY_TABS = [
  { label: "All Materials", value: "All" },
  { label: "Lecture Notes", value: "Lecture Notes" },
  { label: "Lecture Slides", value: "Lecture Slides" },
  { label: "Assignments", value: "Assignments" },
  { label: "Lab Manuals", value: "Lab Manuals" },
  { label: "Question Banks", value: "Question Banks" },
];

function normalizeType(t: string) {
  const s = (t || "").toLowerCase().trim();
  if (s.includes("note")) return "notes";
  if (s.includes("slide")) return "slides";
  if (s.includes("assignment")) return "assignments";
  if (s.includes("lab") || s.includes("manual")) return "labs";
  if (s.includes("question")) return "questions";
  return s;
}

export default function SubjectMaterialsView({
  subject,
  materials,
  studentBranch,
  initialType = "All",
  initialQuery = "",
  examLockout,
}: SubjectMaterialsViewProps) {
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);

  // Filter materials based on selected category and search query
  const filteredMaterials = useMemo(() => {
    let result = materials;

    if (selectedType && selectedType !== "All") {
      const target = normalizeType(selectedType);
      result = result.filter((m) => normalizeType(m.type) === target);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => {
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesType = m.type.toLowerCase().includes(q);
        const matchesTags = m.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesFiles = m.material_files?.some((f) => f.file_name.toLowerCase().includes(q));
        return matchesTitle || matchesType || matchesTags || matchesFiles;
      });
    }

    return result;
  }, [materials, selectedType, searchQuery]);

  // Aggregate files count
  const totalFilesCount = useMemo(() => {
    return materials.reduce((acc, m) => acc + (m.material_files?.length || 0), 0);
  }, [materials]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-5xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* COMPACT & SLEEK MOBILE-FIRST SUBJECT BANNER */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        {/* Top Actions Row: Back Button & Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link
            href="/student/subjects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Subjects</span>
          </Link>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold font-mono">
              {subject.code}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-semibold">
              Section {studentBranch} • Sem {subject.semester || 3}
            </span>
          </div>
        </div>

        {/* Subject Title & Details */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {formatSubjectTitle(subject.title)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Curated syllabus materials uploaded by faculty specifically for{" "}
            <strong className="font-semibold text-slate-800">Section {studentBranch}</strong>.
          </p>
        </div>

        {/* Quick Stats Pill Badges */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            <span>{materials.length} {materials.length === 1 ? "Unit Published" : "Units Published"}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            <span>{totalFilesCount} {totalFilesCount === 1 ? "Study File Attached" : "Study Files Attached"}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400 font-normal">
            {subject.regulation || "R23"} Regulation
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER & SEARCH TOOLBAR (FULLY RESPONSIVE) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {/* Search Input Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search by unit title or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-2xl focus:outline-none focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all shadow-2xs font-normal"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x -mx-1 px-1">
          {CATEGORY_TABS.map((tab) => {
            const count = tab.value === "All"
              ? materials.length
              : materials.filter((m) => normalizeType(m.type) === normalizeType(tab.value)).length;

            const isSelected = selectedType === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedType(tab.value)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 snap-start ${
                  isSelected
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs font-medium"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXAM LOCKOUT BANNER (IF ACTIVE) */}
      {/* ========================================================================= */}
      {examLockout.isLocked ? (
        <div className="bg-amber-50/70 p-5 sm:p-7 rounded-3xl border border-amber-300 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-amber-950">
                {examLockout.examTitle || "Examination Lockout Active"}
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Session Hours: {examLockout.startTimeText} – {examLockout.endTimeText} (IST)
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-normal">
            {examLockout.message || `Course materials for Semester ${subject.semester || 3} are temporarily locked during the scheduled evaluation window.`}
          </p>
          <div className="pt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
              Locked for Examination Mode
            </span>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MATERIALS TITLES LIST (CLEAN, TOUCH-FRIENDLY & MOBILE RESPONSIVE) */
        /* ========================================================================= */
        <div className="space-y-3">
          {filteredMaterials.length > 0 ? (
            filteredMaterials.map((mat) => {
              const facultyName = mat.users?.name || "Faculty Incharge";
              const filesCount = mat.material_files?.length || 0;

              return (
                <Link
                  key={mat.id}
                  href={`/student/materials/${mat.id}`}
                  prefetch={false}
                  className="block p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-blue-300 active:scale-[0.99] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Badges: Type, Faculty, Date, File Count */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] sm:text-xs font-bold">
                          {mat.type}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-medium">
                          <User className="h-3 w-3 text-slate-500" />
                          <span>{facultyName}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-normal">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(mat.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] sm:text-xs font-semibold">
                          <FileCheck2 className="h-3 w-3 text-indigo-600" />
                          <span>{filesCount} {filesCount === 1 ? "File" : "Files"}</span>
                        </span>
                      </div>

                      {/* Prominent Unit Title */}
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                        {mat.title}
                      </h2>

                      {/* Tags (if any) */}
                      {mat.tags && mat.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {mat.tags.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-500 font-normal">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Arrow / Chevron Icon */}
                    <div className="shrink-0 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-500 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-2xs">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="py-16 text-center bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FolderOpen className="h-6 w-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {searchQuery || selectedType !== "All"
                  ? "No Materials Found Matching Filters"
                  : `No Materials Published Yet for Section ${studentBranch}`}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-normal">
                {searchQuery || selectedType !== "All"
                  ? "Try adjusting your search keywords or switching category tabs."
                  : "Your subject faculty member has not published syllabus notes or lab manuals for this section yet."}
              </p>
              {(searchQuery || selectedType !== "All") && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedType("All");
                    }}
                    className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
