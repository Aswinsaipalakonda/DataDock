"use client";

import { useState } from "react";
import { updatePasswordAction, signOutUserAction } from "@/app/profile/actions";
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Key, 
  Eye, 
  EyeOff, 
  LogOut, 
  CheckCircle2, 
  Building2, 
  SlidersHorizontal, 
  Bell, 
  Lock, 
  ShieldAlert, 
  Server, 
  ChevronRight, 
  Sparkles,
  ExternalLink,
  Laptop
} from "lucide-react";
import Link from "next/link";
import { ToastContainer, ToastMessage } from "@/components/toast";

interface AdminProfileClientProps {
  profile: {
    name: string;
    email: string;
    role: string;
    branch: string | null;
    current_semester: number | null;
  };
}

export default function AdminProfileClient({ profile }: AdminProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"security" | "notifications" | "session">("security");

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Notification Toggles State
  const [notifUploads, setNotifUploads] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [notifReports, setNotifReports] = useState(true);
  const [notifSystem, setNotifSystem] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword.length < 6) {
      setLoading(false);
      addToast("error", "Invalid Password", "New password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLoading(false);
      addToast("error", "Mismatch", "Passwords do not match. Please re-enter.");
      return;
    }

    const result = await updatePasswordAction(newPassword);
    setLoading(false);

    if (result.error) {
      addToast("error", "Update Failed", result.error);
    } else {
      addToast("success", "Password Updated", "Your administrator password was successfully changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSavePreferences = () => {
    addToast("success", "Preferences Saved", "Admin system alert preferences updated.");
  };

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  return (
    <div className="space-y-6 sm:space-y-7 w-full max-w-6xl pb-10">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE ADMIN HERO CARD */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/10 text-white border border-white/20 flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-inner backdrop-blur-md shrink-0">
              {initials}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {profile.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider">
                  Super Administrator
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 font-normal">
                {profile.email} • System Governance & Access Control
              </p>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                <span>Department of Data Engineering • MVGR College of Engineering (Autonomous)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/logout";
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 2-COLUMN SETTINGS WORKSPACE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (4 cols): System Governance Credentials & Shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Identity Info Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Governance Credentials
              </h2>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 font-normal">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Email</span>
                <span className="font-semibold text-slate-900 block truncate">{profile.email}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Administrative Role</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-900 capitalize">{profile.role}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Scope</span>
                <span className="font-semibold text-slate-900 block">All Branches (CIC, CSD, CSM)</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Policy</span>
                <span className="font-semibold text-slate-900 block">Continuous Audit Security Enabled</span>
              </div>
            </div>

            {/* Quick Administrative Shortcuts */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quick Actions</span>
              
              <Link
                href="/admin/users"
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-800 transition-all group"
              >
                <span>Manage Users Directory</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href="/admin/analytics"
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-800 transition-all group"
              >
                <span>Curriculum Engagement Analytics</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href="/admin/logs"
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-800 transition-all group"
              >
                <span>Activity & Governance Logs</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Tabbed Settings Container */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
          
          {/* Tab Switcher Header */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-full sm:w-fit overflow-x-auto">
            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "security"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>Password & Security</span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "notifications"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Alert Preferences</span>
            </button>

            <button
              onClick={() => setActiveTab("session")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "session"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Session Details</span>
            </button>
          </div>

          {/* ===================================================================== */}
          {/* TAB 1: PASSWORD & CREDENTIALS WORKSPACE */}
          {/* ===================================================================== */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Update Administrator Password
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Ensure your account is protected with a strong, distinct passphrase.
                </p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    New Administrator Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      placeholder="Minimum 6 characters..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Password Strength Checklist */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Security Requirements:
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${newPassword.length >= 6 ? "text-emerald-600" : "text-slate-300"}`} />
                      <span className={newPassword.length >= 6 ? "text-slate-900 font-semibold" : "text-slate-500"}>
                        At least 6 characters long
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${newPassword && newPassword === confirmPassword ? "text-emerald-600" : "text-slate-300"}`} />
                      <span className={newPassword && newPassword === confirmPassword ? "text-slate-900 font-semibold" : "text-slate-500"}>
                        Passwords match exactly
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Updating Credentials..." : "Save New Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: SYSTEM ALERT PREFERENCES */}
          {/* ===================================================================== */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Governance & Security Notifications
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Configure automated administrative notifications and critical security triggers.
                </p>
              </div>

              <div className="space-y-3 divide-y divide-slate-100">
                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">Faculty Upload Alerts</span>
                    <span className="text-[11px] text-slate-500 font-normal">Receive notices whenever new syllabus notes are published.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifUploads}
                    onChange={(e) => setNotifUploads(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">Security & Password Reset Alerts</span>
                    <span className="text-[11px] text-slate-500 font-normal">Log and flag administrative password reset events.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSecurity}
                    onChange={(e) => setNotifSecurity(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">Daily Engagement Digest</span>
                    <span className="text-[11px] text-slate-500 font-normal">Summary of student document reads and verification downloads.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifReports}
                    onChange={(e) => setNotifReports(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">Platform Maintenance Notices</span>
                    <span className="text-[11px] text-slate-500 font-normal">Storage capacity and portal maintenance updates.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSystem}
                    onChange={(e) => setNotifSystem(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
                >
                  Save Notification Preferences
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: ACTIVE ADMIN SESSION INFO */}
          {/* ===================================================================== */}
          {activeTab === "session" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Active Administrative Session
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Overview of current device authentication, encryption status, and access level.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authentication Protocol</span>
                  <span className="text-xs font-bold text-slate-900 block">Secure Institutional Session Token</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Connection Security</span>
                  <span className="text-xs font-bold text-slate-900 block">Encrypted SSL Connection</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Session State</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700">Authenticated & Active</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Governance Tier</span>
                  <span className="text-xs font-bold text-blue-700">Institutional Super Administrator</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
