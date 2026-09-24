import { NextRequest, NextResponse } from "next/server";

// Protected route prefixes that strictly require an active session
const PROTECTED_PREFIXES = [
  "/admin",
  "/faculty",
  "/student",
  "/change-password",
  "/profile",
];

const ALLOWED_METHODS_STATIC = new Set(["GET", "HEAD"]);
const BANNED_METHODS = new Set(["TRACE", "TRACK", "DEBUG", "CONNECT"]);
const STATIC_EXT_RE = /\.(?:png|jpe?g|gif|svg|webp|css|js|mjs|woff2?|ttf|otf|ico|pdf|txt|xml|webmanifest)$/i;

/* ---------- In-memory sliding rate limiter bucket ---------- */
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
  }
  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
  return { allowed: bucket.count <= limit, remaining, retryAfterSec };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "0.0.0.0"
  );
}

// High-speed JWT session parser
function parseDeSession(request: NextRequest): { email: string; role: string; expired: boolean } | null {
  try {
    const token =
      request.cookies.get("de_token")?.value ??
      request.cookies.get("__Secure-session")?.value ??
      request.cookies.get("__Host-session")?.value;

    if (!token) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    const isExpired = !!(payload.exp && payload.exp * 1000 < Date.now());

    let role = (payload.role as string) || "";
    const email = (payload.email as string) || "";
    if (!role) {
      if (email.startsWith("admin")) role = "admin";
      else if (email.startsWith("faculty") || email.startsWith("testfaculty")) role = "faculty";
      else role = "student";
    }

    return { email, role, expired: isExpired };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip assets, static files, and dev HMR immediately (0ms overhead)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const method = request.method.toUpperCase();

  // 2. Method-level firewall
  if (BANNED_METHODS.has(method)) {
    return new NextResponse(null, { status: 405 });
  }

  const isApi = pathname.startsWith("/api/");
  const isLogin = pathname === "/login";
  const isStaticFile = STATIC_EXT_RE.test(pathname);
  const isContact = pathname === "/contact" || pathname.startsWith("/api/contact");
  const ALLOWED_METHODS_PAGES = new Set(["GET", "HEAD", "POST"]);

  if (isStaticFile && !ALLOWED_METHODS_STATIC.has(method)) {
    return new NextResponse(null, { status: 405 });
  }

  if (!isApi && !ALLOWED_METHODS_PAGES.has(method)) {
    return new NextResponse(null, { status: 405 });
  }

  // 3. Path normalization: strip /assets/../, /static/../
  if (pathname.match(/\/(assets|static|public|_next)\/\.\./)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl, 308);
  }

  // 4. Rate limiting: login, contact, and api
  const ip = getClientIp(request);

  if (isLogin) {
    const loginRl = checkRateLimit(`rl:ip:login:${ip}`, 20, 15 * 60 * 1000);
    if (!loginRl.allowed) {
      return new NextResponse("Too many login attempts from this network. Please try again later.", {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(loginRl.retryAfterSec),
        },
      });
    }
  }

  if (isContact && method === "POST") {
    const contactRl = checkRateLimit(`rl:ip:contact:${ip}`, 5, 60 * 60 * 1000);
    if (!contactRl.allowed) {
      return new NextResponse("Too many contact submissions. Please wait before submitting again.", {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(contactRl.retryAfterSec),
        },
      });
    }
  }

  if (isApi) {
    const apiRl = checkRateLimit(`rl:ip:api:${ip}`, 180, 60 * 1000);
    if (!apiRl.allowed) {
      return new NextResponse(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(apiRl.retryAfterSec),
        },
      });
    }
  }

  // 5. Auth + Route Enumeration Mitigation
  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const session = parseDeSession(request);
  const isAuthenticated = session && !session.expired;

  if (isAuthenticated) {
    const role = session.role;

    // Logged in user visiting login page -> redirect to role dashboard
    if (isLogin) {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }

    // Role-based Route Protection
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith("/faculty") && role === "student") {
      return NextResponse.redirect(new URL("/student", request.url));
    }
  } else if (isProtectedPath) {
    // Unauthenticated access:
    // Human browsers receive a 307 redirect to login
    // Automated crawlers, scrapers, and RSC probes receive 404
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    const isRsc = request.headers.get("rsc") === "1";
    const hasNextHint = request.nextUrl.searchParams.has("protected");

    if ((acceptsHtml && !isRsc) || hasNextHint) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl, 307);
    }

    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 6. Security headers on responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=()"
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Clean leaking server headers
  response.headers.delete("x-powered-by");
  response.headers.delete("X-Powered-By");
  response.headers.delete("platform");
  response.headers.delete("panel");
  response.headers.delete("Server");

  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|icon.*\\.png|apple-touch-icon.*\\.png|sitemap\\.xml|robots\\.txt|llms\\.txt|llms-full\\.txt|\\.well-known).*)",
  ],
};
