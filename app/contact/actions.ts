"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/utils/rate-limiter";
import { z } from "zod";

export interface ContactSubmissionPayload {
  name: string;
  email: string;
  role: string;
  subject?: string;
  message: string;
  website?: string;
}

const ContactSchema = z.object({
  name: z.string().trim().min(2, "Please provide your valid full name.").max(120),
  email: z.string().trim().email("Please provide a valid email address.").max(254),
  role: z.string().trim().max(50).default("Student"),
  subject: z
    .string()
    .trim()
    .min(2, "Please provide a subject.")
    .max(180)
    .regex(/^[^\r\n]+$/, "Subject may not contain newline characters."),
  message: z
    .string()
    .trim()
    .min(5, "Please provide inquiry details (at least 5 characters).")
    .max(4000),
  website: z.string().max(0, "Invalid submission.").optional().or(z.literal("")),
});

export async function submitContactInquiry(payload: ContactSubmissionPayload) {
  try {
    // 1. IP Rate Limiting (5 requests per hour)
    try {
      const headerList = await headers();
      const rawIp =
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerList.get("x-real-ip") ||
        "local-client";
      const clientIp = rawIp.replace(/[^a-zA-Z0-9.:_-]/g, "");

      const ipCheck = checkRateLimit(`contact:${clientIp}`, {
        maxAttempts: 5,
        windowMs: 60 * 60 * 1000,
      });

      if (!ipCheck.allowed) {
        return {
          error: `Too many contact submissions from your network. Please wait ${Math.ceil(
            ipCheck.retryAfterSeconds / 60
          )} minutes before submitting again.`,
        };
      }
    } catch {
      // Ignore header inspection issues
    }

    // 2. Schema Validation (Honeypot + Type check)
    const parsed = ContactSchema.safeParse({
      name: payload.name,
      email: payload.email,
      role: payload.role || "Student",
      subject: payload.subject || "General Academic Inquiry",
      message: payload.message,
      website: payload.website ?? "",
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid submission.";
      return { error: firstError };
    }

    // 3. CRLF Sanitization
    const safeName = parsed.data.name.replace(/[\r\n]/g, " ");
    const safeSubject = parsed.data.subject.replace(/[\r\n]/g, " ");
    const safeRole = parsed.data.role.replace(/[\r\n]/g, " ");
    const safeEmail = parsed.data.email.toLowerCase().replace(/[\r\n]/g, "");
    const safeMessage = parsed.data.message;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("support_inquiries")
      .insert({
        name: safeName,
        email: safeEmail,
        role: safeRole,
        subject: safeSubject,
        message: safeMessage,
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Support inquiry insertion error:", error);
      return {
        error: "Unable to submit your message right now. Please try again or contact via email directly.",
      };
    }

    revalidatePath("/admin/inquiries");
    revalidatePath("/admin");

    return {
      success: true,
      id: data.id,
      ticketCode: `INQ-${data.id.slice(0, 6).toUpperCase()}`,
      message: "Your inquiry has been successfully transmitted to the department coordinators.",
    };
  } catch (err: any) {
    console.error("Unexpected error submitting contact inquiry:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
