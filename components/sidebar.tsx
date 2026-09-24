"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  Bookmark, 
  LayoutDashboard, 
  LogOut, 
  Upload, 
  FileText, 
  Users, 
  Settings, 
  BarChart, 
  History, 
  User, 
  Megaphone,
  Sparkles,
  Inbox
} from "lucide-react";

interface SidebarProps {
  userRole: "student" | "faculty" | "admin";
  userScope?: {
    branch?: string;
    semester?: number;
  };
  signOutAction: () => Promise<void>;
}

export default function Sidebar({ userRole, userScope, signOutAction }: SidebarProps) {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navigation = {
    student: [
      { name: "Dashboard", href: "/student", icon: LayoutDashboard },
      { name: "Subjects", href: "/student/subjects", icon: BookOpen },
      { name: "Bookmarks", href: "/student/bookmarks", icon: Bookmark },
      { name: "Profile", href: "/student/profile", icon: User },
    ],
    faculty: [
      { name: "Dashboard", href: "/faculty", icon: LayoutDashboard },
      { name: "Upload Material", href: "/faculty/upload", icon: Upload },
      { name: "My Materials", href: "/faculty/materials", icon: FileText },
      { name: "Profile", href: "/faculty/profile", icon: User },
    ],
    admin: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "User Management", href: "/admin/users", icon: Users },
      { name: "Support Inquiries", href: "/admin/inquiries", icon: Inbox },
      { name: "Courses & Branches", href: "/admin/taxonomy", icon: Settings },
      { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { name: "Usage Metrics", href: "/admin/analytics", icon: BarChart },
      { name: "System Logs", href: "/admin/logs", icon: History },
      { name: "Profile", href: "/admin/profile", icon: User },
    ],
  };

  const navItems = navigation[userRole] || [];

  return (
    <aside
      className="hidden lg:flex fixed top-0 bottom-0 left-0 z-45 w-64 bg-[#0F172A] border-r border-slate-800 flex-col"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/40">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-white p-1.5 shadow-md shadow-black/30 border border-slate-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            <Image
              src="/De_logo.jpg"
              alt="Department of Data Engineering Logo"
              width={44}
              height={44}
              priority
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-white text-sm tracking-tight block leading-snug truncate group-hover:text-blue-300 transition-colors">
              Data Engineering
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block truncate">
                MVGR College (A)
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* User Scope Badge Panel */}
      {userScope && (userScope.branch || userScope.semester) && (
        <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/20">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Current Scope</span>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {userScope.branch && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {userScope.branch}
                </span>
              )}
              {userScope.semester && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Sem {userScope.semester}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3.5 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === `/${userRole}`
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={`flex items-center gap-3.5 px-5 py-3 rounded-full text-sm transition-all duration-200 group ${
                isActive 
                  ? "bg-white text-slate-900 shadow-sm font-bold" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white font-medium"
              }`}
            >
              <Icon className={`h-4 w-4 transition-colors duration-200 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-white"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Signout Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-900/30">
        <button
          type="button"
          onClick={async () => {
            try {
              setIsSigningOut(true);
              if (signOutAction) await signOutAction();
            } catch {
              // Ignore action redirect error
            } finally {
              window.location.href = "/api/auth/logout";
            }
          }}
          disabled={isSigningOut}
          suppressHydrationWarning
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-2xl transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
        </button>
      </div>
    </aside>
  );
}
