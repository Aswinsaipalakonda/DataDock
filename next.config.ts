import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
  isProd
    ? "script-src 'self' 'unsafe-inline' https://cdn.fontshare.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.fontshare.com",
  "style-src 'self' 'unsafe-inline' https://cdn.fontshare.com https://api.fontshare.com",
  "font-src 'self' https://cdn.fontshare.com https://api.fontshare.com data:",
  "img-src 'self' https: data: blob:",
  isProd
    ? "connect-src 'self' https: wss:"
    : "connect-src 'self' http: https: ws: wss:",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "manifest-src 'self'",
  "report-uri /api/csp-report",
].filter(Boolean);

const cspHeader = cspDirectives.join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()" },
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
      {
        source: "/(admin|faculty|student|change-password|profile)/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet, noarchive, noimageindex" },
        ],
      },

      {
        source: "/(favicon|icon|apple-touch-icon)(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/(manifest.webmanifest|manifest.json)",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
