import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { ALLOWED_EXTENSIONS } from "@/lib/file-constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JWT_SECRET = process.env.JWT_SECRET || "de-elearn-mvgrce-super-secure-jwt-secret-key-2026";
const uploadBaseDir = path.join(process.cwd(), "server", "uploads", "materials");

// Ensure upload directory exists
try {
  if (!fs.existsSync(uploadBaseDir)) {
    fs.mkdirSync(uploadBaseDir, { recursive: true });
  }
} catch (e) {
  // Directory might already exist
}

function normalizeMaterialType(rawType: string): string {
  const lower = (rawType || "").toLowerCase().trim();
  if (lower === "notes" || lower.includes("note")) return "Notes";
  if (lower.includes("slide")) return "Lecture Slides";
  if (lower.includes("assignment")) return "Assignments";
  if (lower.includes("lab") || lower.includes("manual")) return "Lab Manuals";
  if (lower.includes("question")) return "Question Banks";
  if (lower.includes("model")) return "Model Papers";
  if (lower.includes("book") || lower.includes("reference")) return "Reference Books";
  if (lower.includes("previous")) return "Previous Papers";
  if (lower.includes("video")) return "Videos";
  return "Other Resources";
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from session cookies or auth header
    const cookieStore = await cookies();
    const token =
      cookieStore.get("de_token")?.value ||
      cookieStore.get("__Secure-session")?.value ||
      cookieStore.get("__Host-session")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Please log in to upload materials." }, { status: 401 });
    }

    let userPayload: any = null;
    try {
      userPayload = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Session expired or invalid. Please log in again." }, { status: 401 });
    }

    if (!userPayload?.id) {
      return NextResponse.json({ error: "Invalid user credentials." }, { status: 401 });
    }

    // Verify user in database
    const [userRows]: any = await pool.query(
      "SELECT id, name, email, role, status FROM users WHERE id = ? LIMIT 1",
      [userPayload.id]
    );

    if (!userRows.length || userRows[0].status === "deactivated") {
      return NextResponse.json({ error: "Account not found or deactivated." }, { status: 403 });
    }

    const currentUser = userRows[0];
    if (currentUser.role !== "faculty" && currentUser.role !== "admin") {
      return NextResponse.json({ error: "Only faculty and administrators can publish materials." }, { status: 403 });
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();

    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || "";
    const subject = (formData.get("subject") as string)?.trim();
    const subjectTitle = (formData.get("subjectTitle") as string)?.trim() || `${subject} Course`;
    const regulation = (formData.get("regulation") as string)?.trim() || "R23";
    const semester = parseInt(formData.get("semester") as string, 10) || 3;
    const rawType = (formData.get("type") as string)?.trim();
    const state = (formData.get("state") as "draft" | "published") || "published";
    const tagsStr = (formData.get("tags") as string) || "";
    const tags = tagsStr
      ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const normalizedType = normalizeMaterialType(rawType);

    if (!title || !subject || !semester || !normalizedType) {
      return NextResponse.json(
        { error: "Missing required taxonomy fields (title, subject, semester, type)." },
        { status: 400 }
      );
    }

    // Parse allocations
    const allocationsRaw = formData.get("allocations") as string;
    let targetAllocations: Array<{ branch: string; section: string }> = [];

    if (allocationsRaw) {
      try {
        targetAllocations = JSON.parse(allocationsRaw);
      } catch {
        targetAllocations = [];
      }
    }

    if (!targetAllocations.length) {
      const rawBranches = formData.getAll("branches") as string[];
      const singleBranch = (formData.get("branch") as string)?.trim();
      const rawSection = (formData.get("section") as string)?.trim() || "ALL";
      const targetBranches = rawBranches.length > 0 ? rawBranches : [singleBranch || "CIC"];
      targetAllocations = targetBranches.map((b) => ({ branch: b, section: rawSection }));
    }

    if (!targetAllocations.length) {
      return NextResponse.json(
        { error: "Please specify at least one target branch and section." },
        { status: 400 }
      );
    }

    // Parse files
    const files = formData.getAll("files") as File[];
    const validFiles = files.filter((f) => f && f.size > 0 && f.name !== "undefined");

    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one valid file is required to upload a material." },
        { status: 400 }
      );
    }

    const maxFileSize = 150 * 1024 * 1024; // 150 MB

    for (const file of validFiles) {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          {
            error: `File type "${ext}" is not supported. Supported types include PDF, PPT, Word, Excel, Code files, ZIP, TXT, and Images.`,
          },
          { status: 400 }
        );
      }
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the maximum limit of 150 MB.` },
          { status: 400 }
        );
      }
    }

    // Read buffers into memory for disk write
    const fileBuffers: Array<{
      name: string;
      size: number;
      type: string;
      ext: string;
      buffer: Buffer;
    }> = [];

    for (const file of validFiles) {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      const arrayBuf = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      fileBuffers.push({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        ext,
        buffer: buf,
      });
    }

    // 3. Insert records and persist files for each allocation target
    const createdMaterialIds: string[] = [];

    for (const alloc of targetAllocations) {
      const branch = alloc.branch;
      const section = alloc.section || "ALL";
      const materialId = crypto.randomUUID();

      // Ensure branch, semester, regulation exist in lookup tables
      await pool.query(
        "INSERT IGNORE INTO branches (code, name, active) VALUES (?, ?, 1)",
        [branch, branch]
      );
      await pool.query(
        "INSERT IGNORE INTO semesters (number, name, active) VALUES (?, ?, 1)",
        [semester, `${semester}th Semester`]
      );
      await pool.query(
        "INSERT IGNORE INTO regulations (code, name, active) VALUES (?, ?, 1)",
        [regulation, `${regulation} Autonomous Regulation`]
      );
      await pool.query(
        "INSERT IGNORE INTO subjects (code, title, branch, semester, regulation, active) VALUES (?, ?, ?, ?, ?, 1)",
        [subject, subjectTitle, branch, semester, regulation]
      );

      // Insert Material record
      await pool.query(
        `INSERT INTO materials (id, title, description, subject, branch, section, semester, regulation, type, state, owner_id, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          materialId,
          title,
          description,
          subject,
          branch,
          section,
          semester,
          regulation,
          normalizedType,
          state,
          currentUser.id,
          JSON.stringify(tags),
        ]
      );

      // Save files to disk and insert into material_files
      const materialDir = path.join(uploadBaseDir, materialId);
      if (!fs.existsSync(materialDir)) {
        fs.mkdirSync(materialDir, { recursive: true });
      }

      for (const item of fileBuffers) {
        const fileId = crypto.randomUUID();
        const diskFileName = `${fileId}${item.ext}`;
        const storageRef = `${materialId}/${diskFileName}`;
        const fullDiskPath = path.join(uploadBaseDir, storageRef);

        fs.writeFileSync(fullDiskPath, item.buffer);

        await pool.query(
          `INSERT INTO material_files (id, material_id, file_name, mime_type, size, version, storage_path, storage_ref)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            fileId,
            materialId,
            item.name,
            item.type,
            item.size,
            storageRef,
            storageRef,
          ]
        );
      }

      // Record Activity Event & Audit Log
      try {
        await pool.query(
          `INSERT INTO activity_events (id, type, actor_id, target_id, metadata)
           VALUES (?, 'upload', ?, ?, ?)`,
          [
            crypto.randomUUID(),
            currentUser.id,
            materialId,
            JSON.stringify({
              title,
              type: normalizedType,
              subject,
              branch,
              section,
              filesCount: validFiles.length,
            }),
          ]
        );

        await pool.query(
          `INSERT INTO audit_logs (id, action, actor_id, object_id, after_summary)
           VALUES (?, 'UPLOAD_MATERIAL', ?, ?, ?)`,
          [
            crypto.randomUUID(),
            currentUser.id,
            materialId,
            JSON.stringify({
              title,
              type: normalizedType,
              subject,
              branch,
              section,
              filesCount: validFiles.length,
            }),
          ]
        );
      } catch (logErr) {
        console.warn("Audit/Activity log notice:", logErr);
      }

      createdMaterialIds.push(materialId);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Material published successfully.",
        materialIds: createdMaterialIds,
        redirectUrl: "/faculty/materials",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Upload material route error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload material on the server." },
      { status: 500 }
    );
  }
}
