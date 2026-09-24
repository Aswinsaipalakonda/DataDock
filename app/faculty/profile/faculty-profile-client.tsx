"use client";

import { useState } from "react";
import { 
  User, 
  Mail, 
  BookOpen, 
  Building, 
  Layers, 
  LogOut, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Sparkles, 
  Award,
  FileText,
  GraduationCap
} from "lucide-react";
import { updatePasswordAction, signOutUserAction } from "@/app/profile/actions";

interface FacultyProfileClientProps {
  profile: {
    name: string;
    email: string;
    role: string;
    designation: string | null;
    branch: string | null;
  };
}

export default function FacultyProfileClient({ profile }: FacultyProfileClientProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "FA";

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password.length < 6) {
      setLoading(false);
      setMessage({ text: "Password must be at least 6 characters long.", type: "error" });
      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    const result = await updatePasswordAction(password);
    setLoading(false);

    if (result.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      setMessage({ text: "Password updated successfully!", type: "success" });
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 w-full max-w-5xl pb-10">
      {/* ========================================================================= */}
      {/* 2-COLUMN MAIN WORKSPACE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Institutional Faculty Identity Card */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
          {/* Avatar and Identity */}
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-2xl shadow-sm border-2 border-slate-100">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{profile.name}</h2>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-white shadow-2xs">
                  <Award className="h-3.5 w-3.5 text-slate-300" />
                  <span>{profile.designation || "Assistant Professor"}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Faculty
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Details List */}
          <div className="space-y-3.5 text-xs font-normal">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div className="truncate min-w-0">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Official Institutional Email</span>
                <span className="text-xs font-bold text-slate-800 truncate block">{profile.email}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Building className="h-4 w-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Academic Department</span>
                <span className="text-xs font-bold text-slate-800 block">Department of Data Engineering</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Teaching Domains</span>
                <span className="text-xs font-bold text-slate-800 block">Database Systems & Cloud Infrastructure</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Assigned Department</span>
                <span className="text-xs font-bold text-slate-800 block">Department of Data Engineering</span>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/logout";
              }}
              className="w-full py-3 px-4 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out Account</span>
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Security & Account Management */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <Lock className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Faculty Credentials & Security</h2>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Update your account password to maintain secure access to the faculty syllabus publishing tools.
            </p>
          </div>

          {message && (
            <div
              role="alert"
              className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 transition-all ${
                message.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-pass" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-pass"
                  required
                  type={showPass ? "text" : "password"}
                  placeholder="Enter new password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-normal text-slate-900 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="conf-pass" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                id="conf-pass"
                required
                type={showPass ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-normal text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Password Strength Checklist */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Security Requirements:
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${password.length >= 6 ? "text-emerald-600" : "text-slate-300"}`} />
                  <span className={password.length >= 6 ? "text-slate-900 font-semibold" : "text-slate-500"}>
                    At least 6 characters long
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${password && password === confirmPassword ? "text-emerald-600" : "text-slate-300"}`} />
                  <span className={password && password === confirmPassword ? "text-slate-900 font-semibold" : "text-slate-500"}>
                    Passwords match exactly
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || password.length < 6 || password !== confirmPassword}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
