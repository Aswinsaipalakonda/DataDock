import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import busboy from "busboy";
import pool from "@/lib/db";
import { ALLOWED_EXTENSIONS } from "@/lib/file-constants";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

interface ParsedFile {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
  ext: string;
}

interface ParsedMultipart {
  fields: Record<string, string | string[]>;
  files: ParsedFile[];
}

// 1. Busboy-powered robust parser
function parseWithBusboy(buffer: Buffer, contentType: string): Promise<ParsedMultipart> {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: { "content-type": contentType },
      limits: {
        fileSize: 150 * 1024 * 1024,
        files: 20,
      },
    });

    const fields: Record<string, string | string[]> = {};
    const files: ParsedFile[] = [];

    bb.on("field", (name, val) => {
      if (fields[name]) {
        if (Array.isArray(fields[name])) {
          (fields[name] as string[]).push(val);
        } else {
          fields[name] = [fields[name] as string, val];
        }
      } else {
        fields[name] = val;
      }
    });

    bb.on("file", (name, fileStream, info) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk) => {
        chunks.push(chunk);
      });
      fileStream.on("end", () => {
        const fileBuf = Buffer.concat(chunks);
        const finalName = filename || "uploaded_file.pdf";
        const ext = "." + (finalName.split(".").pop()?.toLowerCase() || "pdf");
        if (fileBuf.length > 0) {
          files.push({
            filename: finalName,
            mimeType: mimeType || "application/octet-stream",
            buffer: fileBuf,
            size: fileBuf.length,
            ext,
          });
        }
      });
    });

    bb.on("close", () => {
      resolve({ fields, files });
    });

    bb.on("error", (err) => {
      reject(err);
    });

    bb.end(buffer);
  });
}

// 2. Pure buffer fallback parser
function parseBufferFallback(buffer: Buffer, boundary: string): ParsedMultipart {
  const fields: Record<string, string | string[]> = {};
  const files: ParsedFile[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);

  let pos = 0;
  while (pos < buffer.length) {
    const bStart = buffer.indexOf(boundaryBuffer, pos);
    if (bStart === -1) break;

    const bEnd = buffer.indexOf(boundaryBuffer, bStart + boundaryBuffer.length);
    if (bEnd === -1) break;

    let part = buffer.subarray(bStart + boundaryBuffer.length, bEnd);

    if (part.length >= 2 && part[0] === 0x0d && part[1] === 0x0a) {
      part = part.subarray(2);
    } else if (part.length >= 1 && (part[0] === 0x0a || part[0] === 0x0d)) {
      part = part.subarray(1);
    }

    if (part.length >= 2 && part[part.length - 2] === 0x0d && part[part.length - 1] === 0x0a) {
      part = part.subarray(0, part.length - 2);
    } else if (part.length >= 1 && (part[part.length - 1] === 0x0a || part[part.length - 1] === 0x0d)) {
      part = part.subarray(0, part.length - 1);
    }

    let headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    let headerOffset = 4;
    if (headerEnd === -1) {
      headerEnd = part.indexOf(Buffer.from("\n\n"));
      headerOffset = 2;
    }
    if (headerEnd === -1) {
      headerEnd = part.indexOf(Buffer.from("\r\r"));
      headerOffset = 2;
    }

    if (headerEnd !== -1) {
      const headerStr = part.subarray(0, headerEnd).toString("utf-8");
      const body = part.subarray(headerEnd + headerOffset);

      const nameMatch = headerStr.match(/name=(?:"([^"]*)"|'([^']*)'|([^;\r\n\s]+))/i);
      const filenameMatch = headerStr.match(/filename(?:\*=(?:UTF-8''|utf-8'')([^;\r\n\s]+)|=(?:"([^"]*)"|'([^']*)'|([^;\r\n\s]+)))/i);
      const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n;]+)/i);

      const fieldName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || "").trim() : "";
      let filename = filenameMatch ? (filenameMatch[2] || filenameMatch[3] || filenameMatch[4] || filenameMatch[1] || "").trim() : "";
      if (filename) {
        try {
          filename = decodeURIComponent(filename);
        } catch {
          // keep original
        }
      }

      const mimeType = typeMatch ? typeMatch[1].trim() : "application/octet-stream";

      if (filename || fieldName === "files" || fieldName === "files[]" || fieldName === "file" || fieldName === "document") {
        const finalName = filename || "uploaded_document.pdf";
        const ext = "." + (finalName.split(".").pop()?.toLowerCase() || "pdf");
        if (body.length > 0) {
          files.push({
            filename: finalName,
            mimeType,
            buffer: body,
            size: body.length,
            ext,
          });
        }
      } else if (fieldName) {
        const val = body.toString("utf-8");
        if (fields[fieldName]) {
          if (Array.isArray(fields[fieldName])) {
            (fields[fieldName] as string[]).push(val);
          } else {
            fields[fieldName] = [fields[fieldName] as string, val];
          }
        } else {
          fields[fieldName] = val;
        }
      }
    }

    pos = bEnd;
  }

  return { fields, files };
}

// Master Multipart Ingestion
async function parseMultipartPayload(req: NextRequest): Promise<ParsedMultipart> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    throw new Error("Invalid Content-Type header. Expected multipart/form-data.");
  }

  // Read whole body once into memory buffer
  const arrayBuffer = await req.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error("Request body is empty.");
  }
  const buffer = Buffer.from(arrayBuffer);

  // 1. Try Busboy parser first
  try {
    const result = await parseWithBusboy(buffer, contentType);
    if (result.files.length > 0 || Object.keys(result.fields).length > 0) {
      return result;
    }
  } catch (bbErr) {
    console.warn("Busboy parsing notice, falling back to buffer parser:", bbErr);
  }

  // 2. Fallback to manual buffer parser
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;,\s]+))/i);
  if (boundaryMatch) {
    const boundary = (boundaryMatch[1] || boundaryMatch[2]).trim().replace(/^["']|["']$/g, "");
    return parseBufferFallback(buffer, boundary);
  }

  throw new Error("Failed to parse multipart request payload.");
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from session cookies or authorization header
    const cookieStore = await cookies();
    const token =
      cookieStore.get("de_token")?.value ||
      cookieStore.get("__Secure-session")?.value ||
      cookieStore.get("__Host-session")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to upload materials." },
        { status: 401 }
      );
    }

    let userPayload: any = null;
    try {
      userPayload = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Session expired or invalid. Please log in again." },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: "Account not found or deactivated." },
        { status: 403 }
      );
    }

    const currentUser = userRows[0];
    if (currentUser.role !== "faculty" && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only faculty and administrators can publish materials." },
        { status: 403 }
      );
    }

    // 2. Parse Multipart Payload cleanly
    let parsed: ParsedMultipart;
    try {
      parsed = await parseMultipartPayload(req);
    } catch (parseErr: any) {
      console.error("Multipart parse error:", parseErr);
      return NextResponse.json(
        { error: parseErr?.message || "Failed to parse incoming upload payload." },
        { status: 400 }
      );
    }

    const getFieldString = (key: string): string => {
      const val = parsed.fields[key];
      if (Array.isArray(val)) return val[0] || "";
      return val || "";
    };

    const title = getFieldString("title").trim();
    const description = getFieldString("description").trim() || "";
    const subject = getFieldString("subject").trim();
    const subjectTitle = getFieldString("subjectTitle").trim() || `${subject} Course`;
    const regulation = getFieldString("regulation").trim() || "R24";
    const semester = parseInt(getFieldString("semester"), 10) || 3;
    const rawType = getFieldString("type").trim();
    const state = (getFieldString("state") as "draft" | "published") || "published";
    const tagsStr = getFieldString("tags");
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

    // Parse target allocations
    const allocationsRaw = getFieldString("allocations");
    let targetAllocations: Array<{ branch: string; section: string }> = [];

    if (allocationsRaw) {
      try {
        targetAllocations = JSON.parse(allocationsRaw);
      } catch {
        targetAllocations = [];
      }
    }

    if (!targetAllocations.length) {
      const rawBranchesVal = parsed.fields["branches"];
      const rawBranches = Array.isArray(rawBranchesVal)
        ? rawBranchesVal
        : rawBranchesVal
        ? [rawBranchesVal]
        : [];
      const singleBranch = getFieldString("branch").trim();
      const rawSection = getFieldString("section").trim() || "ALL";
      const targetBranches = rawBranches.length > 0 ? rawBranches : [singleBranch || "CIC"];
      targetAllocations = targetBranches.map((b) => ({ branch: b, section: rawSection }));
    }

    if (!targetAllocations.length) {
      return NextResponse.json(
        { error: "Please specify at least one target branch and section." },
        { status: 400 }
      );
    }

    // Validate files
    const validFiles = parsed.files;
    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one valid file is required to upload a material." },
        { status: 400 }
      );
    }

    for (const file of validFiles) {
      if (!ALLOWED_EXTENSIONS.includes(file.ext)) {
        return NextResponse.json(
          {
            error: `File type "${file.ext}" is not supported. Supported types: PDF, PPT, Word, Excel, Code files, ZIP, TXT, and Images.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Atomically persist to disk and database for each allocation target
    const createdMaterialIds: string[] = [];

    for (const alloc of targetAllocations) {
      const branch = alloc.branch;
      const section = alloc.section || "ALL";
      const materialId = crypto.randomUUID();

      // Ensure branch, semester, regulation, and subject exist in lookup tables
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

      for (const item of validFiles) {
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
            item.filename,
            item.mimeType,
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

    const primaryMaterialId = createdMaterialIds[0] || "";

    return NextResponse.json(
      {
        success: true,
        message: "Material published successfully.",
        materialId: primaryMaterialId,
        materialIds: createdMaterialIds,
        shareUrl: `/student/materials/${primaryMaterialId}`,
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
