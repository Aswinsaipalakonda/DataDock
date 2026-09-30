/**
 * Utility functions for generating rich multi-platform and WhatsApp share links for DataDock materials.
 */

export interface MaterialShareMetadata {
  materialId: string;
  title: string;
  subject?: string;
  subjectTitle?: string;
  branch?: string;
  section?: string;
  semester?: number | string;
  regulation?: string;
  type?: string;
}

const DEFAULT_ORIGIN = "https://datadock.aswinsai.tech";

export function getBaseAppUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_ORIGIN;
}

export function generateMaterialDirectLink(materialId: string): string {
  const origin = getBaseAppUrl();
  return `${origin}/student/materials/${materialId}`;
}

export function generateWhatsAppMessage(data: MaterialShareMetadata): string {
  const link = generateMaterialDirectLink(data.materialId);
  const targetCohort = [
    data.branch ? `${data.branch}` : "",
    data.section && data.section !== "ALL" ? `Sec ${data.section}` : "All Sections",
    data.semester ? `(Sem ${data.semester})` : "",
  ].filter(Boolean).join(" ");

  const subjectDisplay = data.subjectTitle && data.subject
    ? `${data.subjectTitle} (${data.subject})`
    : data.subjectTitle || data.subject || "Study Material";

  return [
    `📚 *DataDock — New Study Material Published*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📖 *Subject:* ${subjectDisplay}`,
    `📑 *Title:* ${data.title}`,
    data.type ? `📁 *Type:* ${data.type}` : "",
    `🎯 *Cohort:* ${targetCohort || "Dept. of Data Engineering"}`,
    ``,
    `🔗 *Open Study Material:*`,
    `${link}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `_Log in to DataDock to inspect, preview, and download study resources._`,
  ].filter(Boolean).join("\n");
}

export function getWhatsAppShareUrl(data: MaterialShareMetadata): string {
  const message = generateWhatsAppMessage(data);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

export async function copyMaterialLinkToClipboard(data: MaterialShareMetadata): Promise<boolean> {
  try {
    const link = generateMaterialDirectLink(data.materialId);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(link);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Copy to clipboard failed:", err);
    return false;
  }
}

export async function copyWhatsAppMessageToClipboard(data: MaterialShareMetadata): Promise<boolean> {
  try {
    const msg = generateWhatsAppMessage(data);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(msg);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Copy WhatsApp message failed:", err);
    return false;
  }
}
