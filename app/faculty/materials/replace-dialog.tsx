"use client";

import { useState } from "react";
import { replaceFileVersion } from "./actions";
import { ALLOWED_EXTENSIONS } from "@/lib/file-constants";
import { X, Upload, Loader2, AlertCircle, FileCheck } from "lucide-react";

interface ReplaceDialogProps {
  materialId: string;
  fileId: string;
  fileName: string;
  linkedMaterialIds?: string[];
  branches?: string[];
  currentBranch?: string;
  onClose: () => void;
}

export default function ReplaceDialog({
  materialId,
  fileId,
  fileName,
  linkedMaterialIds = [],
  branches = [],
  currentBranch,
  onClose,
}: ReplaceDialogProps) {
  const isMultiBranch = branches.length > 1 && linkedMaterialIds.length > 1;
  const [scope, setScope] = useState<"all" | "single">("all");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxFileSize = 100 * 1024 * 1024; // 100MB
      const ext = "." + selectedFile.name.split(".").pop()?.toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`File type ${ext} is not supported. Allowed: PDF, PPT, Word, Excel, Code, ZIP, TXT, and Images.`);
        return;
      }
      if (selectedFile.size > maxFileSize) {
        setError("File exceeds 100MB limit.");
        return;
      }
      setFile(selectedFile);
      setError(null);
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
      formData.append("fileId", fileId);
      formData.append("file", file);

      if (isMultiBranch && scope === "all") {
        formData.append("linkedMaterialIds", JSON.stringify(linkedMaterialIds));
      }

      const result = await replaceFileVersion(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 sm:p-7 relative animate-in zoom-in-95 ease-[cubic-bezier(0.16,1,0.3,1)] duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-base font-bold text-slate-900 mb-1">Upload New Version</h2>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Replacing <span className="font-semibold text-slate-800">{fileName}</span> will increment the version number while preserving student history.
        </p>

        {error && (
          <div role="alert" className="p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl bg-slate-50/70 hover:bg-slate-50 text-center relative group transition-colors cursor-pointer">
            <input
              type="file"
              required
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.rtf,.odt,.xls,.xlsx,.csv,.py,.java,.c,.cpp,.h,.cs,.js,.ts,.tsx,.jsx,.html,.css,.json,.sql,.ipynb,.sh,.xml,.yaml,.yml,.zip,.rar,.7z,.tar,.gz,.png,.jpg,.jpeg,.gif,.webp,.svg"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            {file ? (
              <div className="space-y-1 flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                  <FileCheck className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 truncate max-w-xs block">
                  {file.name}
                </span>
                <span className="text-[10px] text-blue-600 font-medium">Click to select different file</span>
              </div>
            ) : (
              <div className="space-y-1 flex flex-col items-center">
                <Upload className="h-8 w-8 text-blue-600 group-hover:scale-110 mb-1.5 transition-transform" />
                <span className="text-xs font-semibold text-slate-800">
                  Select replacement file
                </span>
                <span className="text-[10px] text-slate-400">
                  PDF, PPT, Word, Excel, Coding files, ZIP, TXT, Images
                </span>
              </div>
            )}
          </div>

          {isMultiBranch && (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Target Sections / Branches:
              </span>
              <p className="text-[11px] text-slate-500 font-normal">
                This unit is shared across {branches.join(", ")}. Select which sections should receive this replacement file:
              </p>
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer p-1.5 rounded-xl hover:bg-white transition-colors">
                  <input
                    type="radio"
                    name="replaceScope"
                    value="all"
                    checked={scope === "all"}
                    onChange={() => setScope("all")}
                    className="accent-primary"
                  />
                  <span className="font-semibold">All linked sections ({branches.join(", ")})</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer p-1.5 rounded-xl hover:bg-white transition-colors">
                  <input
                    type="radio"
                    name="replaceScope"
                    value="single"
                    checked={scope === "single"}
                    onChange={() => setScope("single")}
                    className="accent-primary"
                  />
                  <span>Only this section ({currentBranch || branches[0]})</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
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
                  <span>Updating...</span>
                </>
              ) : (
                "Submit New Version"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
