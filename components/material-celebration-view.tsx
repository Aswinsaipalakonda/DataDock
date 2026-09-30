"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Plus,
  BookOpen,
  Users,
  FileText,
  Layers,
  ArrowRight,
  FolderOpen
} from "lucide-react";
import {
  MaterialShareMetadata,
  generateMaterialDirectLink,
  getWhatsAppShareUrl,
  copyMaterialLinkToClipboard,
  copyWhatsAppMessageToClipboard,
} from "@/lib/share-utils";

interface MaterialCelebrationViewProps {
  material: MaterialShareMetadata;
  files?: Array<{ name: string; size: number }>;
  onUploadAnother: () => void;
  onNavigateToMaterials: () => void;
}

export function MaterialCelebrationView({
  material,
  files = [],
  onUploadAnother,
  onNavigateToMaterials,
}: MaterialCelebrationViewProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [blastActive, setBlastActive] = useState(true);

  const directLink = generateMaterialDirectLink(material.materialId);
  const whatsappUrl = getWhatsAppShareUrl(material);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBlastActive(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyMessage = async () => {
    const ok = await copyWhatsAppMessageToClipboard(material);
    if (ok) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 3000);
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyMaterialLinkToClipboard(material);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleOpenWhatsApp = () => {
    // Open WhatsApp in a new tab
    if (typeof window !== "undefined") {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(2) + " MB";
    const kb = bytes / 1024;
    return kb.toFixed(1) + " KB";
  };

  return (
    <div className="relative overflow-hidden w-full max-w-3xl mx-auto my-6 p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl transition-all">
      {/* Decorative Confetti & Blast Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        
        {/* Floating Confetti Shapes */}
        <span className="absolute top-8 left-1/4 text-2xl animate-bounce delay-100">🎉</span>
        <span className="absolute top-12 right-1/4 text-xl animate-bounce delay-300">✨</span>
        <span className="absolute top-20 left-12 text-lg animate-pulse">🎊</span>
        <span className="absolute top-24 right-12 text-lg animate-pulse delay-200">🚀</span>
        <span className="absolute top-4 left-1/2 text-2xl -translate-x-1/2 animate-bounce">🌟</span>
      </div>

      <div className="relative z-10 space-y-8 text-center">
        {/* Animated Success Badge */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-green-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25 ring-8 ring-emerald-50 dark:ring-emerald-950/40 animate-in zoom-in-50 duration-500">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-400 text-slate-900 shadow-md animate-pulse">
              <Sparkles className="w-4 h-4 fill-slate-900" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              Upload Complete & Published
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              Material Published Successfully!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your study resource is now active on DataDock and immediately available to the designated student cohort.
            </p>
          </div>
        </div>

        {/* Uploaded Material Summary Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-left space-y-3.5 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Material Title
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {material.title}
              </h3>
            </div>
            {material.type && (
              <span className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                {material.type}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium truncate">
                {material.subjectTitle ? `${material.subjectTitle} (${material.subject})` : material.subject}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium">
                {material.branch || "CIC"} {material.section && material.section !== "ALL" ? `(Sec ${material.section})` : "(All Secs)"} • Sem {material.semester || 3}
              </span>
            </div>
          </div>

          {files.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[11px] font-medium text-slate-400 mb-1.5">Attached Study Files:</div>
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-mono truncate">{f.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 ml-2 font-mono">
                      {formatFileSize(f.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp & Student Group Direct Sharing Section */}
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 text-left space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <MessageCircle className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Want to share this material link to your students?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Click the button below to redirect directly to WhatsApp with the formatted material announcement and student link ready to send.
              </p>
            </div>
          </div>

          {/* Primary Action: Direct WhatsApp Redirection */}
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>Open WhatsApp to Share Material Link</span>
            <ExternalLink className="w-4 h-4 opacity-90" />
          </button>

          {/* Quick Copy Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopyMessage}
              className={`py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                copiedMessage
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              }`}
            >
              {copiedMessage ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Announcement Text Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy WhatsApp Announcement</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className={`py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                copiedLink
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Direct Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Direct Student Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onUploadAnother}
            className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Another Material</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToMaterials}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-blue-300 dark:text-blue-600" />
            <span>Go to Materials Library</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MaterialCelebrationView;
