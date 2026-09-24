import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let reportData = null;

    if (contentType.includes("application/csp-report") || contentType.includes("application/json")) {
      reportData = await req.json();
    } else {
      const text = await req.text();
      try {
        reportData = JSON.parse(text);
      } catch {
        reportData = { raw: text };
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn("[CSP Violation Report]:", JSON.stringify(reportData));
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse(null, { status: 204 });
  }
}
