import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pool from "@/lib/db";

// Helper to determine accurate MIME type based on file extension
function getMimeTypeByExt(ext: string, fallbackMime?: string): string {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".csv": "text/csv; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".rtf": "application/rtf",
    ".zip": "application/zip",
    ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".py": "text/x-python; charset=utf-8",
    ".java": "text/x-java-source; charset=utf-8",
    ".c": "text/x-c; charset=utf-8",
    ".cpp": "text/x-c++; charset=utf-8",
    ".h": "text/x-c; charset=utf-8",
    ".cs": "text/plain; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".ts": "text/typescript; charset=utf-8",
    ".tsx": "text/typescript; charset=utf-8",
    ".jsx": "text/javascript; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".sql": "text/x-sql; charset=utf-8",
    ".ipynb": "application/json; charset=utf-8",
    ".sh": "text/x-sh; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
  };

  const cleanExt = ext.toLowerCase().trim();
  if (map[cleanExt]) return map[cleanExt];
  if (fallbackMime && fallbackMime !== "application/octet-stream" && fallbackMime !== "application/pdf") {
    return fallbackMime;
  }
  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const params = await context.params;
    let segments = params.path || [];

    if (segments.length === 0) {
      return new NextResponse("File path missing", { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    let isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";

    // If path ends with /download, strip it and mark as download
    if (segments[segments.length - 1] === "download") {
      isDownload = true;
      segments = segments.slice(0, -1);
    }

    const storageRef = segments.join("/");
    
    // Security check: reject directory traversal attempts
    if (storageRef.includes("..") || storageRef.includes(":") || storageRef.startsWith("/")) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    const uploadBaseDir = path.join(process.cwd(), "server", "uploads", "materials");
    const diskPath = path.join(uploadBaseDir, ...segments);

    if (!fs.existsSync(diskPath)) {
      return new NextResponse("File content not found on server storage.", { status: 404 });
    }

    // Lookup original filename and mime type from database
    let fileName = segments[segments.length - 1];
    let mimeType = "";

    try {
      const [records]: any = await pool.query(
        `SELECT file_name, mime_type FROM material_files 
         WHERE storage_ref = ? OR storage_path = ? OR storage_ref LIKE ? OR storage_path LIKE ?
         LIMIT 1`,
        [storageRef, storageRef, `%${fileName}`, `%${fileName}`]
      );

      if (records && records.length > 0) {
        if (records[0].file_name) fileName = records[0].file_name;
        if (records[0].mime_type) mimeType = records[0].mime_type;
      }
    } catch {
      // If DB query is unavailable, deduce from disk filename
    }

    // Override with query param filename if explicitly provided
    const queryFilename = searchParams.get("filename");
    if (queryFilename) {
      fileName = queryFilename;
    }

    const ext = path.extname(fileName) || path.extname(diskPath);
    const contentType = getMimeTypeByExt(ext, mimeType);
    const stat = fs.statSync(diskPath);
    const fileBuffer = fs.readFileSync(diskPath);

    // Sanitize filename for headers
    const safeAsciiName = fileName.replace(/[^\w.-]/g, "_");
    const encodedName = encodeURIComponent(fileName);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", String(stat.size));
    headers.set("Cache-Control", "public, max-age=3600");

    if (isDownload) {
      // Direct attachment download keeping exact original format and extension
      headers.set(
        "Content-Disposition",
        `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`
      );
    } else {
      // In-browser preview (inline)
      headers.set(
        "Content-Disposition",
        `inline; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`
      );
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("File route error:", error);
    return new NextResponse("Failed to read study file: " + error.message, { status: 500 });
  }
}
