import Link from "next/link";

export const dynamic = "force-static";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans p-6 sm:p-12">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="font-extrabold text-lg text-white tracking-tight">
          DataDock
        </Link>
        <span className="text-xs text-slate-400">Department of Data Engineering</span>
      </header>

      <main className="max-w-md mx-auto w-full text-center py-16 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
          404 • Resource Not Found
        </div>

        <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-white">
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Page Lost in the Academic Cloud
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed">
          The requested page or learning resource does not exist or has been relocated to another curriculum section.
        </p>

        <div className="flex items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-blue-600/20"
          >
            Go to Home
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full text-xs font-bold transition-all"
          >
            Portal Login
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-500">
        © {new Date().getFullYear()} DataDock • MVGR College of Engineering (Autonomous)
      </footer>
    </div>
  );
}
