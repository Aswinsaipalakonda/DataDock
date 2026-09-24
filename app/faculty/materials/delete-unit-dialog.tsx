"use client";

import { useState } from "react";
import { deleteMaterial } from "./actions";
import { X, Trash2, Loader2, AlertCircle, Layers } from "lucide-react";

interface DeleteUnitDialogProps {
  materialId: string;
  materialTitle: string;
  subjectCode: string;
  linkedMaterialIds?: string[];
  branches?: string[];
  currentBranch?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteUnitDialog({
  materialId,
  materialTitle,
  subjectCode,
  linkedMaterialIds = [],
  branches = [],
  currentBranch,
  onClose,
  onSuccess,
}: DeleteUnitDialogProps) {
  const isMultiBranch = branches.length > 1 && linkedMaterialIds.length > 1;
  const [scope, setScope] = useState<"all" | "single">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const targetLinkedIds = scope === "all" ? linkedMaterialIds : [];
      const res = await deleteMaterial(materialId, targetLinkedIds);

      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
          window.location.reload();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete learning unit.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 sm:p-7 relative animate-in zoom-in-95 ease-[cubic-bezier(0.16,1,0.3,1)] duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Delete Learning Unit</h2>
            <p className="text-xs text-slate-500 font-normal">{subjectCode} • Syllabus Resource</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-slate-900">&quot;{materialTitle}&quot;</span>? This will archive the unit and remove it from student portals.
        </p>

        {isMultiBranch && (
          <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Multi-Branch Unit Detected</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">
              This unit is published to sections: <strong className="text-slate-800">{branches.join(", ")}</strong>. Choose deletion scope:
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer p-2 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="unitDeleteScope"
                  value="all"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="accent-red-600"
                />
                <span className="font-semibold">All linked sections ({branches.join(", ")})</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer p-2 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="unitDeleteScope"
                  value="single"
                  checked={scope === "single"}
                  onChange={() => setScope("single")}
                  className="accent-red-600"
                />
                <span>Only this section ({currentBranch || branches[0]})</span>
              </label>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            <span>{loading ? "Deleting..." : "Delete Unit"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
