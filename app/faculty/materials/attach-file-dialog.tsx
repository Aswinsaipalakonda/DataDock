"use client";

import { useState } from "react";
import { attachFileToMaterial } from "./actions";
import { ALLOWED_EXTENSIONS } from "@/lib/file-constants";
import { X, Upload, Loader2, FileCheck, AlertCircle } from "lucide-react";

interface AttachFileDialogProps {
  materialId: string;
  materialTitle: string;
  linkedMaterialIds?: string[];
  branches?: string[];
  currentBranch?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AttachFileDialog({
  materialId,
  materialTitle,
  linkedMaterialIds = [],
  branches = [],
  currentBranch,
  onClose,
  onSuccess,
}: AttachFileDialogProps) {
  const isMultiBranch = branches.length > 1 && linkedMaterialIds.length > 1;
  const [scope, setScope] = useState<"all" | "single">("all");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (selectedFile: File) => {
    const ext = "." + selectedFile.name.split(".").pop()?.toLowerCase();
    const maxFileSize = 100 * 1024 * 1024; // 100MB

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`File format "${ext}" is unsupported. Allowed: PDF, PPT, Word, Excel, Code, ZIP, TXT, and Images.`);
      return;
    }
    if (selectedFile.size > maxFileSize) {
      setError("File exceeds maximum allowed size of 100MB.");
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("materialId", materialId);
      formData.append("file", file);

      if (isMultiBranch && scope === "all") {
        formData.append("linkedMaterialIds", JSON.stringify(linkedMaterialIds));
      }

      const result = await attachFileToMaterial(formData);
      if (result.error) {
        setError(result.error);
      } else {
        if (onSuccess) onSuccess();
        onClose();
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(2) + " MB";
    const kb = bytes / 1024;
    return kb.toFixed(1) + " KB";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 sm:p-7 relative animate-in zoom-in-95 ease-[cubic-bezier(0.16,1,0.3,1)] duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 pr-6">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
            Study Resource
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1.5">Attach Study File</h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Add a study file to <span className="font-semibold text-slate-800">{materialTitle}</span>
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl text-center relative group transition-all cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50/60"
                : file
                ? "border-emerald-300 bg-emerald-50/40"
                : "border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              required
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.rtf,.odt,.xls,.xlsx,.csv,.py,.java,.c,.cpp,.h,.cs,.js,.ts,.tsx,.jsx,.html,.css,.json,.sql,.ipynb,.sh,.xml,.yaml,.yml,.zip,.rar,.7z,.tar,.gz,.png,.jpg,.jpeg,.gif,.webp,.svg"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />

            {file ? (
              <div className="space-y-1.5 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <FileCheck className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-900 max-w-xs truncate">{file.name}</p>
                <p className="text-[11px] text-slate-500">{formatSize(file.size)}</p>
                <span className="text-[10px] text-blue-600 font-semibold hover:underline">Click or drop to replace file</span>
              </div>
            ) : (
              <div className="space-y-1.5 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Select or drag & drop study file
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                  PDF, PowerPoint, Excel, Coding files (.py/.java/.c/etc.), ZIP, TXT, or Images (up to 100MB)
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="w-1/2 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-full shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading File...</span>
                </>
              ) : (
                "Attach & Save File"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
