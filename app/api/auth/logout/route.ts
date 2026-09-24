import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // Clear all potential session cookies with proper path and expiration
  cookieStore.set("de_token", "", {
    maxAge: 0,
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });
  cookieStore.delete("de_token");

  cookieStore.set("__Secure-session", "", {
    maxAge: 0,
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });
  cookieStore.delete("__Secure-session");

  cookieStore.set("__Host-session", "", {
    maxAge: 0,
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });
  cookieStore.delete("__Host-session");

  const accept = req.headers.get("accept") || "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ success: true, redirectTo: "/login" });
  }

  return NextResponse.redirect(new URL("/login", req.url), 303);
}

export async function GET(req: Request) {
  const cookieStore = await cookies();

  cookieStore.set("de_token", "", {
    maxAge: 0,
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });
  cookieStore.delete("de_token");

  cookieStore.set("__Secure-session", "", {
    maxAge: 0,
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });
  cookieStore.delete("__Secure-session");

  cookieStore.set("__Host-session", "", {
    maxAge: 0,
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });
  cookieStore.delete("__Host-session");

  return NextResponse.redirect(new URL("/login", req.url));
}
