import Image from "next/image";
import LoginForm from "./login-form";

export const metadata = {
  title: "Sign In | Data Engineering Portal",
  description: "Sign in to access course materials, lecture notes, lab manuals, and academic resources at MVGR College of Engineering.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 relative selection:bg-slate-900 selection:text-white">
      {/* Ultra-Minimalist Subtle Ambient Radial Accent (Clean Slate/Blue, No Gradients) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Modern Minimalist Executive Authentication Card */}
      <div className="w-full max-w-[440px] bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-[32px] border border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.07)] space-y-7 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-3.5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white p-2 border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.04)] mx-auto">
            <Image
              src="/De_logo.jpg"
              alt="Department of Data Engineering Logo"
              width={52}
              height={52}
              priority
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Data Engineering Portal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              MVGR College of Engineering (Autonomous)
            </p>
          </div>
        </div>

        {/* Form Inputs & Actions */}
        <LoginForm />


      </div>
    </main>
  );
}
