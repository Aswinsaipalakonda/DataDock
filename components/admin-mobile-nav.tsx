"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  BarChart3, 
  History, 
  User, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  GraduationCap
} from "lucide-react";

interface AdminMobileNavProps {
  signOutAction: () => Promise<void>;
  userEmail?: string;
  userName?: string;
}

const navSections = [
  {
    title: "Core Workspaces",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "User Management", href: "/admin/users", icon: Users },
      { name: "Courses & Branches", href: "/admin/taxonomy", icon: Settings },
    ],
  },
  {
    title: "Curriculum & Analytics",
    items: [
      { name: "Usage Metrics", href: "/admin/analytics", icon: BarChart3 },
      { name: "Support Inquiries", href: "/admin/inquiries", icon: Inbox },
      { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { name: "System Logs", href: "/admin/logs", icon: History },
    ],
  },
  {
    title: "Account",
    items: [
      { name: "Admin Profile", href: "/admin/profile", icon: User },
    ],
  },
];

export default function AdminMobileNav({ signOutAction, userEmail, userName }: AdminMobileNavProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialMountRef = useRef(true);
  const pathname = usePathname();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleOpen = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsDrawerMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsDrawerMounted(false);
      closeTimeoutRef.current = null;
    }, 500); // Wait for the 500ms smooth transition to finish before unmounting
  }, []);

  // When drawer mounts into DOM, trigger visible state after initial paint for buttery smooth entrance
  useEffect(() => {
    if (isDrawerMounted) {
      let frame1: number;
      let frame2: number;
      frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(frame1);
        cancelAnimationFrame(frame2);
      };
    }
  }, [isDrawerMounted]);

  // Close smoothly on route navigation
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (isDrawerMounted) {
      handleClose();
    }
  }, [pathname, isDrawerMounted, handleClose]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Lock body scroll cleanly while drawer is mounted
  useEffect(() => {
    if (isDrawerMounted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerMounted]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerMounted) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerMounted, handleClose]);

  return (
    <div className="lg:hidden">
      {/* Modern Interactive Hamburger Toggle Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="p-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 transition-all border border-slate-200/90 shadow-2xs active:scale-95 flex items-center justify-center cursor-pointer"
        aria-label="Open Admin Menu"
        title="Admin Navigation Menu"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {/* Render via Portal directly into document.body to break free of any header containing block or backdrop-filter */}
      {hasMounted && isDrawerMounted && createPortal(
        <div 
          className={`fixed inset-0 z-[9999] overflow-hidden transition-all duration-500 ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Animated Dimming Backdrop with blur - 500ms smooth fade */}
          <div
            onClick={handleClose}
            className={`fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Slide-out Drawer Panel - 500ms smooth gliding transition */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10 z-[10000]">
            <div 
              style={{ backgroundColor: "#0b0f19" }}
              className={`w-screen max-w-[320px] sm:max-w-[360px] shadow-2xl flex flex-col border-l border-slate-800 text-white transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
              }`}
            >
              
              {/* Drawer Brand Header */}
              <div 
                style={{ backgroundColor: "#080c14" }}
                className="p-4 sm:p-5 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                    <Image
                      src="/De_logo.jpg"
                      alt="DE Logo"
                      width={36}
                      height={36}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-white text-sm block leading-tight tracking-tight">
                      Data Engineering
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      MVGR College (A)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close menu"
                  title="Close Navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Administrator Identity Badge */}
              <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 font-bold text-xs shadow-inner">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b0f19] ring-1 ring-emerald-500/50" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white block truncate">
                        {userName || "Administrator"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {userEmail || "admin@mvgrce.edu.in"}
                    </span>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-semibold border border-blue-500/30">
                      System Administrator • Full Access
                    </span>
                  </div>
                </div>
              </div>

              {/* Categorized Navigation Menu Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 overscroll-contain">
                {navSections.map((section) => (
                  <div key={section.title} className="space-y-1.5">
                    <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {section.title}
                    </span>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleClose}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                              isActive
                                ? "bg-primary text-white shadow-md shadow-primary/20 font-bold"
                                : "text-slate-300 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg transition-colors ${
                                isActive ? "bg-white/20 text-white" : "bg-white/5 text-slate-400 group-hover:text-white"
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="tracking-tight">{item.name}</span>
                            </div>
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${
                              isActive ? "text-white/80" : "text-slate-600 group-hover:text-slate-400"
                            }`} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer Footer with Session Controls */}
              <div 
                style={{ backgroundColor: "#080c14" }}
                className="p-4 border-t border-slate-800/90 space-y-2.5 shrink-0"
              >
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out Account</span>
                  </button>
                </form>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 font-medium">
                    DataDock • MVGR College (A)
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
