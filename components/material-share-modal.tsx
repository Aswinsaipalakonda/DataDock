"use client";

import React, { useState } from "react";
import {
  Share2,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  X,
  FileText,
  Users,
  BookOpen,
} from "lucide-react";
import {
  MaterialShareMetadata,
  generateMaterialDirectLink,
  getWhatsAppShareUrl,
  copyMaterialLinkToClipboard,
  copyWhatsAppMessageToClipboard,
} from "@/lib/share-utils";

interface MaterialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: MaterialShareMetadata | null;
  onNavigateToMaterials?: () => void;
}

export function MaterialShareModal({
  isOpen,
  onClose,
  material,
  onNavigateToMaterials,
}: MaterialShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!isOpen || !material) return null;

  const directLink = generateMaterialDirectLink(material.materialId);
  const whatsappUrl = getWhatsAppShareUrl(material);

  const handleCopyLink = async () => {
    const ok = await copyMaterialLinkToClipboard(material);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyFullMessage = async () => {
    const ok = await copyWhatsAppMessageToClipboard(material);
    if (ok) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="share-modal-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Share Study Material
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Notify students directly via WhatsApp or copy direct link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Material Metadata Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {material.title}
                </span>
              </div>
              {material.type && (
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 shrink-0">
                  {material.type}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">
                  {material.subjectTitle || material.subject}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {material.branch || "CIC"} (Sec {material.section || "A"})
                </span>
              </div>
            </div>
          </div>

          {/* Direct Link Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Direct Student Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directLink}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                  copiedLink
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* WhatsApp Share Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium text-sm flex items-center justify-center gap-2.5 shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>Share to WhatsApp Student Group</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            {/* Copy WhatsApp Message Text */}
            <button
              type="button"
              onClick={handleCopyFullMessage}
              className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border transition-all ${
                copiedMessage
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : "bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              {copiedMessage ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Formatted Announcement Message Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Formatted WhatsApp Announcement Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {onNavigateToMaterials ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToMaterials();
              }}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-colors"
            >
              Done & View All Materials
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MaterialShareModal;
