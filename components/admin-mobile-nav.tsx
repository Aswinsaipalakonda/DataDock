"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  Inbox, 
  Settings, 
  Megaphone, 
  BarChart, 
  History, 
  User, 
  LogOut, 
  ShieldCheck,
  ChevronRight
} from "lucide-react";

interface AdminMobileNavProps {
  signOutAction: () => Promise<void>;
  userEmail?: string;
  userName?: string;
}

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Support Inquiries", href: "/admin/inquiries", icon: Inbox },
  { name: "Courses & Branches", href: "/admin/taxonomy", icon: Settings },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { name: "Usage Metrics", href: "/admin/analytics", icon: BarChart },
  { name: "System Logs", href: "/admin/logs", icon: History },
  { name: "Admin Profile", href: "/admin/profile", icon: User },
];

export default function AdminMobileNav({ signOutAction, userEmail, userName }: AdminMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="lg:hidden">
      {/* Hamburger Menu Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer border border-slate-200"
        aria-label="Open Admin Menu"
        title="Admin Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Slide-over Drawer Backdrop & Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          />

          {/* Slide-out Drawer from Right */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 z-[110]">
            <div 
              style={{ backgroundColor: "#0f172a" }}
              className="w-screen max-w-xs sm:max-w-sm bg-slate-900 shadow-2xl flex flex-col border-l border-slate-800 text-white animate-in slide-in-from-right duration-300"
            >
              
              {/* Drawer Header */}
              <div 
                style={{ backgroundColor: "#0b1120" }}
                className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white p-1 border border-slate-700 flex items-center justify-center shrink-0">
                    <Image
                      src="/De_logo.jpg"
                      alt="DE Logo"
                      width={32}
                      height={32}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-white text-sm block leading-tight">
                      Data Engineering
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      MVGR College (A)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Admin User Info Card */}
              <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 font-bold text-xs">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">
                      {userName || "Administrator"}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {userEmail || "System Administrator"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 overscroll-contain">
                <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Admin Navigation
                </span>
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span>{item.name}</span>
                      </div>
                      <ChevronRight className={`h-3 w-3 ${isActive ? "text-white/70" : "text-slate-600"}`} />
                    </Link>
                  );
                })}
              </div>

              {/* Drawer Footer with Sign Out */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/60">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
