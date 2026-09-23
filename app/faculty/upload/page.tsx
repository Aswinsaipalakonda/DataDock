import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import { redirect } from "next/navigation";
import UploadForm from "./upload-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface RegulationOption {
  code: string;
  name: string;
}

interface SubjectOption {
  code: string;
  title: string;
  branch: string;
  semester: number;
  regulation?: string;
}

interface BranchOption {
  code: string;
  name: string;
}

const FALLBACK_REGULATIONS: RegulationOption[] = [
  { code: "R24", name: "R24 Autonomous Regulation" },
  { code: "R23", name: "R23 Autonomous Regulation" },
  { code: "R20", name: "R20 Autonomous Regulation" },
  { code: "R19", name: "R19 Autonomous Regulation" },
  { code: "A2", name: "A2 Autonomous Regulation" },
];

const FALLBACK_BRANCHES: BranchOption[] = [
  { code: "CSM", name: "Artificial Intelligence and Machine Learning" },
  { code: "CIC", name: "Cyber Security, IoT with BlockChain Technology" },
  { code: "CSD", name: "Data Science" },
];

const FALLBACK_SUBJECTS: SubjectOption[] = [];

export default async function FacultyUploadPage() {
  const { user, supabase } = await getCachedUserProfile();
  if (!user) redirect("/login");

  // Fetch active regulations, subjects, and branches in parallel
  const [regulationsRes, subjectsRes, branchesRes] = await Promise.all([
    supabase.from("regulations").select("code, name").eq("active", true).order("code"),
    supabase.from("subjects").select("code, title, branch, semester, regulation").eq("active", true).order("code"),
    supabase.from("branches").select("code, name").eq("active", true).order("code"),
  ]);

  const activeRegulations = (regulationsRes.data && regulationsRes.data.length > 0)
    ? regulationsRes.data
    : FALLBACK_REGULATIONS;

  const activeSubjects = (subjectsRes.data as SubjectOption[]) || [];

  const activeBranches = (branchesRes.data && branchesRes.data.length > 0)
    ? (branchesRes.data as BranchOption[])
    : FALLBACK_BRANCHES;

  return (
    <div className="space-y-6 sm:space-y-7 w-full max-w-5xl pb-10">
      <div>
        <Link 
          href="/faculty" 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Upload Syllabus Material</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-normal">
          Upload verified reference notes, assignments, lecture slide decks, or laboratory manual guides.
        </p>
      </header>

      <UploadForm 
        regulations={activeRegulations} 
        subjects={activeSubjects} 
        branches={activeBranches}
      />
    </div>
  );
}
