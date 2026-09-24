import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/smooth-scroll";
import { StructuredData } from "@/components/seo/json-ld";

const PRIMARY_URL = "https://datadock.aswinsai.tech";

export const viewport: Viewport = {
  themeColor: "#0B1F3B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(PRIMARY_URL),
  title: {
    default: "DataDock • Data Engineering | MVGR College of Engineering",
    template: "%s | DataDock • Data Engineering",
  },
  description:
    "DataDock is the official centralized E-Learning and academic repository for the Department of Data Engineering, MVGR College of Engineering (Autonomous). Access verified semester lecture notes, lab manuals, autonomous syllabus, previous question papers, and study resources for CIC, CSD, and CSM branches.",
  applicationName: "DataDock",
  authors: [
    { name: "Department of Data Engineering, MVGRCE" },
    { name: "Aswinsai", url: "https://aswinsai.tech/" },
  ],
  keywords: [
    // Brand & Core
    "DataDock",
    "DataDock MVGR",
    "datadock aswinsai",
    "datadock.aswinsai.tech",
    "MVGR DE E-Learn",
    "MVGR Data Engineering",
    "Data Engineering Portal",
    // Institution
    "MVGR",
    "MVGR College of Engineering",
    "MVGR College of Engineering Autonomous",
    "MVGRCE",
    "MVGR Vizianagaram",
    "Maharaj Vijayaram Gajapathi Raj College of Engineering",
    // Specializations & Branches
    "Cyber Security and IoT",
    "CIC notes MVGR",
    "Data Science",
    "CSD notes MVGR",
    "Artificial Intelligence and Machine Learning",
    "CSM notes MVGR",
    "B.Tech Data Engineering syllabus",
    // Academic Resources & Student Search Terms
    "engineering lecture notes",
    "autonomous syllabus sem 1 to 8",
    "MVGR previous question papers",
    "lab manuals pdf MVGR",
    "mid exam question banks",
    "semester study materials",
    "data engineering course structure",
    "student study vault",
    "faculty curriculum portal",
    "academic cloud MVGR",
  ],
  creator: "Department of Data Engineering, MVGRCE",
  publisher: "MVGR College of Engineering (Autonomous)",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: PRIMARY_URL,
    languages: {
      "en-US": PRIMARY_URL,
      "en-IN": PRIMARY_URL,
    },
    types: {
      "application/rss+xml": `${PRIMARY_URL}/feed.xml`,
    },
  },
  openGraph: {
    title: "DataDock • Data Engineering | MVGR College of Engineering",
    description:
      "Official academic repository for MVGR College of Engineering Data Engineering Department. Access verified lecture notes, lab manuals, syllabus, and question banks for CIC, CSD, and CSM.",
    url: PRIMARY_URL,
    siteName: "DataDock - MVGR Data Engineering",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/De_logo.jpg",
        width: 1200,
        height: 630,
        alt: "DataDock - MVGR Department of Data Engineering Academic Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DataDock • Data Engineering | MVGR College of Engineering",
    description:
      "Official academic repository for MVGR College of Engineering Data Engineering. Access verified lecture notes, lab manuals, syllabus, and study resources.",
    images: ["/De_logo.jpg"],
    creator: "@MVGRCE_Official",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "b5F-JitCRAjHY1M5hW_fntc_oOK9kx4H3i0eKFVpi6Y",
  },
  category: "Education",
  classification: "Academic Learning Management & Study Materials Repository",
  other: {
    "ai-content-declaration": "curated-academic-learning-materials",
    "subject": "Data Engineering Academic Resources & Syllabus",
    "coverage": "MVGR College of Engineering, Vizianagaram, Andhra Pradesh, India",
    "distribution": "Global",
    "rating": "General",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <head>
        {/* Favicon & Web Application Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icon-96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Fontshare Satoshi typography */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@900,800,700,600,500,400,300&display=swap"
          rel="stylesheet"
        />
        {/* Primary Canonical Link */}
        <link rel="canonical" href={PRIMARY_URL} />
        {/* Structured Data (Schema.org JSON-LD for Google Sitelinks) */}
        <StructuredData primaryDomain={PRIMARY_URL} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC]" suppressHydrationWarning>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
