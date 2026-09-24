"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowLeft, 
  Mail, 
  MapPin, 
  Phone, 
  Send, 
  CheckCircle2, 
  HelpCircle, 
  MessageSquare,
  Sparkles,
  Loader2,
  X,
  Copy,
  Check
} from "lucide-react";
import { LandingHeader } from "@/components/landing-hero";
import { LandingFooter } from "@/components/landing-footer";
import { submitContactInquiry } from "./actions";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    name: string;
    email: string;
    ticketCode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Student",
    subject: "",
    message: "",
    website: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const res = await submitContactInquiry({
      name: formData.name,
      email: formData.email,
      role: formData.role,
      subject: formData.subject,
      message: formData.message,
      website: formData.website,
    });

    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.success) {
      setSubmissionResult({
        name: formData.name,
        email: formData.email,
        ticketCode: res.ticketCode || "INQ-DE",
      });
      setShowModal(true);
      setFormData({
        name: "",
        email: "",
        role: "Student",
        subject: "",
        message: "",
        website: "",
      });
    }
  };

  const handleCopyTicket = () => {
    if (submissionResult?.ticketCode) {
      navigator.clipboard.writeText(submissionResult.ticketCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Schema.org ContactPage Structured Data
  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact DataDock Academic Helpdesk",
    description:
      "Official academic support and department grievance helpdesk for the Department of Data Engineering, MVGR College of Engineering (Autonomous).",
    url: "https://datadock.aswinsai.tech/contact",
    mainEntity: {
      "@type": "EducationalOrganization",
      name: "Department of Data Engineering, MVGRCE",
      email: "de.elearn@mvgrce.edu.in",
      telephone: "+91-8922-241039",
      address: {
        "@type": "PostalAddress",
        streetAddress: "MVGR College of Engineering (A), Chintalavalasa",
        addressLocality: "Vizianagaram",
        addressRegion: "Andhra Pradesh",
        postalCode: "535005",
        addressCountry: "IN",
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <LandingHeader />

      {/* Main Container with generous top padding to ensure header never obscures the title */}
      <main className="flex-1 pt-36 sm:pt-40 lg:pt-44 pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white/80 border border-slate-200/90 px-3.5 py-1.5 rounded-full shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to DataDock Home
          </Link>
        </div>

        {/* Page Header */}
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Academic Support &amp; Grievance Helpdesk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Contact DataDock Support
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
            Have questions regarding syllabus updates, missing course notes, or portal access? Submit your inquiry below to reach the Department of Data Engineering coordinators directly.
          </p>
        </div>

        {/* 2-Column Grid: Info & Interactive Form */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Department Details (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                  <Image
                    src="/De_logo.jpg"
                    alt="MVGR DE Logo"
                    width={40}
                    height={40}
                    className="rounded-xl object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    Department of Data Engineering
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    MVGR College of Engineering (Autonomous)
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">Campus Address:</strong>
                    <span>Chintalavalasa, Vizianagaram, Andhra Pradesh - 535005, India</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">Department Email:</strong>
                    <a href="mailto:de.elearn@mvgrce.edu.in" className="hover:text-blue-600 underline">
                      de.elearn@mvgrce.edu.in
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">Academic Cell Phone:</strong>
                    <span>+91 8922 241039 / 241199</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Academic Helpdesk Hours
                </p>
                <p className="text-xs text-slate-600">
                  Monday to Saturday: 9:00 AM – 4:30 PM (IST)
                </p>
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-3 shadow-md">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Direct Portal Access</span>
              <h4 className="text-base font-bold">Looking for uploaded semester notes?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in to your student vault to access all verified unit PPTs, question banks, and lab manuals.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 px-4 py-2 rounded-full transition-colors shadow-xs"
              >
                Sign In to Portal
              </Link>
            </div>

          </div>

          {/* Right: Interactive Support Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Bot prevention honeypot field */}
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                tabIndex={-1}
                autoComplete="off"
                className="opacity-0 absolute -z-10 h-0 w-0 pointer-events-none"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Send a Message
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in your details below and our academic administration will review your request.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">I am a *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50/50"
                  >
                    <option value="Student">Student (CIC / CSD / CSM)</option>
                    <option value="Faculty">Faculty Member</option>
                    <option value="Alumni">Alumni / Visitor</option>
                    <option value="Other">Other Institutional Staff</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Inquiry Topic</label>
                  <input
                    type="text"
                    placeholder="Enter inquiry topic or subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Message / Details *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter your message, query, or feedback details..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50/50 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Inquiry...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Academic Inquiry</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </main>

      <LandingFooter />

      {/* ========================================================================= */}
      {/* ANIMATED SUCCESS POPUP MODAL */}
      {/* ========================================================================= */}
      {showModal && submissionResult && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-300 text-center space-y-5">
            
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Success Icon */}
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            {/* Modal Headings */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider inline-block">
                Inquiry Logged
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Message Received!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thank you, <strong className="text-slate-900">{submissionResult.name}</strong>. Your inquiry has been routed to the Data Engineering administration dashboard.
              </p>
            </div>

            {/* Ticket Badge with Copy Button */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-left">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Reference Ticket ID
                </span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {submissionResult.ticketCode}
                </span>
              </div>
              <button
                onClick={handleCopyTicket}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Send Another Inquiry
              </button>
              <Link
                href="/"
                className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors inline-flex items-center justify-center cursor-pointer"
              >
                Return to Home
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
