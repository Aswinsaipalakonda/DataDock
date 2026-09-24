import { createClient } from "@/utils/supabase/server";
import { getCachedUserProfile } from "@/utils/supabase/cached-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Sidebar from "@/components/sidebar";
import Breadcrumbs from "@/components/breadcrumbs";
import BottomNav from "@/components/bottom-nav";
import NotificationBell from "@/components/notification-bell";
import GlobalSearch from "@/components/global-search";
import AdminMobileNav from "@/components/admin-mobile-nav";
import { ShieldCheck } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCachedUserProfile();
  if (!user || profile?.role !== "admin") {
    redirect("/login");
  }

  const handleSignOut = async () => {
    "use server";
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar 
        userRole="admin" 
        signOutAction={handleSignOut}
      />

      {/* Main Content Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-24 lg:pb-8">
        {/* Top Header Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3">
            {/* Mobile Logo Branding */}
            <Link href="/admin" className="flex items-center gap-2.5 lg:hidden">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-slate-200 bg-white p-0.5 shrink-0 shadow-2xs">
                <Image
                  src="/De_logo.jpg"
                  alt="DE Logo"
                  width={32}
                  height={32}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
              <div className="leading-tight">
                <span className="text-xs font-bold text-slate-900 block">Data Engineering</span>
                <span className="text-[10px] text-slate-500 font-medium block">MVGR College</span>
              </div>
            </Link>

            {/* Desktop Breadcrumbs */}
            <div className="hidden lg:block">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Clean Admin Role Badge */}
            <Link
              href="/admin/profile"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-2xs hover:bg-slate-800 transition-all cursor-pointer"
              title="Admin Profile"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>System Administrator</span>
            </Link>

            {/* Mobile Navigation Drawer Trigger */}
            <AdminMobileNav
              signOutAction={handleSignOut}
              userEmail={user.email}
              userName={profile?.name || "Administrator"}
            />
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 w-full">
          {children}
        </main>
      </div>

      <BottomNav 
        userRole="admin" 
        signOutAction={handleSignOut}
      />
      <GlobalSearch />
    </div>
  );
}
