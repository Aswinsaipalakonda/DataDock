"use client";

import { useState } from "react";
import { updatePasswordAction, signOutUserAction } from "./actions";
import { User, Mail, Shield, BookOpen, Key, Eye, EyeOff, LogOut } from "lucide-react";

interface ProfileClientProps {
  profile: {
    name: string;
    email: string;
    role: string;
    branch: string | null;
    current_semester: number | null;
  };
}

export default function ProfileClient({ profile }: ProfileClientProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
      setMessage({ text: "Password changed successfully!", type: "success" });
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* Profile Details Card */}
      <div className="md:col-span-1 bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-6 h-fit">
        <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-border">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase">
            {profile.name.slice(0, 2)}
          </div>
          <div>
            <h2 className="font-extrabold text-primary text-base">{profile.name}</h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full mt-1.5 inline-block">
              {profile.role}
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs font-semibold text-primary/80">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-primary/40 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-primary/40 uppercase block font-bold">Email Address</span>
              <span className="truncate">{profile.email}</span>
            </div>
          </div>

          {profile.branch && (
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-primary/40 shrink-0" />
              <div>
                <span className="text-[10px] text-primary/40 uppercase block font-bold">Academic Branch</span>
                <span>{profile.branch}</span>
              </div>
            </div>
          )}

          {profile.current_semester && (
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-primary/40 shrink-0" />
              <div>
                <span className="text-[10px] text-primary/40 uppercase block font-bold">Current Semester</span>
                <span>Semester {profile.current_semester}</span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/logout";
            }}
            className="w-full px-4 py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white font-bold text-xs rounded-full border border-danger/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out Account</span>
          </button>
        </div>
      </div>

      {/* Change Password Workspace */}
      <div className="md:col-span-2 bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-6">
        <div>
          <h3 className="font-bold text-primary text-sm flex items-center gap-2">
            <Key className="h-4 w-4 text-secondary" /> Security settings
          </h3>
          <p className="text-xs text-primary/50 mt-1">Update your password to secure your account credentials.</p>
        </div>

        {message && (
          <div role="alert" className={`p-4 rounded-xl border text-sm font-semibold ${
            message.type === "success" ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div className="relative">
            <label htmlFor="new-pass" className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider text-primary/60">New Password</label>
            <div className="relative">
              <input
                id="new-pass"
                required
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-border bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3 text-primary/45 hover:text-primary cursor-pointer"
              >
                {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-pass" className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider text-primary/60">Confirm New Password</label>
            <input
              id="confirm-pass"
              required
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-full disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              {loading ? "Saving changes..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
