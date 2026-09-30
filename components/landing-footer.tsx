import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, GraduationCap, BookOpen, ShieldCheck, ExternalLink, HelpCircle } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-white border-t border-slate-200/90 pt-16 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Column 1 & 2: Institutional Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3.5 group">
              <div className="w-11 h-11 rounded-2xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Image 
                  src="/De_logo.jpg" 
                  alt="DataDock Logo" 
                  width={42} 
                  height={42} 
                  className="object-contain w-full h-full rounded-xl"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-slate-900 tracking-tight block leading-tight">
                    DataDock
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    DE Portal
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium block">
                  Dept. of Data Engineering • MVGR College of Engineering (A)
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-600 leading-relaxed font-normal max-w-sm">
              The centralized academic learning repository and verified materials cloud for Cyber Security &amp; IoT (CIC), Data Science (CSD), and AI &amp; Machine Learning (CSM).
            </p>

            {/* Accreditation Badges */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                UGC Autonomous
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                NAAC &apos;A&apos; Grade
              </span>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                NBA Accredited
              </span>
            </div>
          </div>

          {/* Column 3: Academic Specializations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Specializations
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li>
                <Link href="/#specializations" className="hover:text-blue-600 transition-colors">
                  Cyber Security &amp; IoT (CIC)
                </Link>
              </li>
              <li>
                <Link href="/#specializations" className="hover:text-blue-600 transition-colors">
                  Data Science (CSD)
                </Link>
              </li>
              <li>
                <Link href="/#specializations" className="hover:text-blue-600 transition-colors">
                  AI &amp; Machine Learning (CSM)
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-blue-600 transition-colors">
                  Autonomous Syllabi Sem 1–8
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 transition-colors">
                  Lab Manuals &amp; Papers
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Portals & Workspaces */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Portal Access
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li>
                <Link href="/login" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                  Student Portal <ArrowUpRight className="h-3 w-3" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                  Faculty Workspace <ArrowUpRight className="h-3 w-3" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                  Admin Console <ArrowUpRight className="h-3 w-3" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 transition-colors">
                  Personal Study Vault
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Legal & Institutional Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Company &amp; Legal
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li>
                <Link href="/about" className="hover:text-blue-600 transition-colors">
                  About DataDock
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-blue-600 transition-colors">
                  Academic Help &amp; Support
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-600 transition-colors">
                  Terms &amp; Academic Code
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.mvgrce.edu.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                >
                  MVGR Official Site <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-600">All Academic Cloud Systems Operational</span>
          </div>

          <div className="font-normal flex items-center gap-3.5 flex-wrap justify-center sm:justify-end">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link href="/about" className="hover:underline">About</Link>
            <span>•</span>
            <Link href="/contact" className="hover:underline">Contact</Link>
            <span>•</span>
            <a 
              href="https://aswinsai.tech/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-600 hover:text-blue-600 font-semibold transition-colors"
            >
              Aswinsai
            </a>
            <span>•</span>
            <span>© {new Date().getFullYear()} DataDock • MVGR Department of Data Engineering</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default LandingFooter;
