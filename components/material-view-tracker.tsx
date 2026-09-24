"use client";

import { useEffect, useRef } from "react";
import { trackMaterialPageView } from "@/app/student/materials/[id]/actions";

interface MaterialViewTrackerProps {
  materialId: string;
  materialTitle: string;
  userRole?: string;
}

export default function MaterialViewTracker({
  materialId,
  materialTitle,
  userRole,
}: MaterialViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track authentic views for students when page is actively mounted in the browser
    if (userRole === "student" && !hasTracked.current) {
      hasTracked.current = true;
      trackMaterialPageView(materialId, materialTitle).catch((err) => {
        console.warn("View beacon notice:", err);
      });
    }
  }, [materialId, materialTitle, userRole]);

  return null;
}
