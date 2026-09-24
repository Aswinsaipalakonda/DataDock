import React from "react";

export interface JsonLdProps {
  primaryDomain?: string;
  alternateDomain?: string;
}

export function StructuredData({
  primaryDomain = "https://datadock.aswinsai.tech",
  alternateDomain,
}: JsonLdProps) {
  // 1. WebSite Schema with Sitelinks SearchBox Action
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${primaryDomain}/#website`,
    name: "DataDock",
    alternateName: [
      "DataDock MVGR",
      "DataDock Data Engineering",
      "MVGR DE E-Learn",
      "MVGR Data Engineering Portal",
    ],
    url: primaryDomain,
    description:
      "Centralized E-Learning and Academic Materials Portal for the Department of Data Engineering, MVGR College of Engineering (Autonomous). Access verified semester notes, lab manuals, syllabus, and question banks.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${primaryDomain}/student/materials?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-US",
  };

  // 2. EducationalOrganization / College Department Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${primaryDomain}/#organization`,
    name: "DataDock - Department of Data Engineering",
    alternateName: "Department of Data Engineering, MVGRCE",
    url: primaryDomain,
    logo: {
      "@type": "ImageObject",
      url: `${primaryDomain}/De_logo.jpg`,
      width: 512,
      height: 512,
    },
    sameAs: [
      "https://www.mvgrce.edu.in",
      "https://aswinsai.tech/",
      ...(alternateDomain ? [alternateDomain] : []),
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "MVGR College of Engineering (A), Chintalavalasa",
      addressLocality: "Vizianagaram",
      addressRegion: "Andhra Pradesh",
      postalCode: "535005",
      addressCountry: "IN",
    },
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "Maharaj Vijayaram Gajapathi Raj College of Engineering (Autonomous)",
      alternateName: "MVGRCE",
      url: "https://www.mvgrce.edu.in",
    },
    accreditation: [
      "UGC Autonomous",
      "NAAC 'A' Grade Accredited",
      "NBA Accredited Programs",
    ],
  };

  // 3. SiteNavigationElement (Produces Google Sitelinks like TCS)
  const navigationSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "SiteNavigationElement",
        position: 1,
        name: "Student Portal & Study Materials",
        description:
          "Access semester-wise verified notes, lecture presentations, lab manuals, and previous question papers.",
        url: `${primaryDomain}/login`,
      },
      {
        "@type": "SiteNavigationElement",
        position: 2,
        name: "Academic Tracks & Specializations",
        description:
          "Explore B.Tech Data Engineering specializations: Cyber Security & IoT (CIC), Data Science (CSD), and AI & ML (CSM).",
        url: `${primaryDomain}/#specializations`,
      },
      {
        "@type": "SiteNavigationElement",
        position: 3,
        name: "Autonomous Syllabi & Regulations",
        description:
          "Official UGC autonomous course structures, credit distribution, and semester syllabus from Sem 1 to 8.",
        url: `${primaryDomain}/#about`,
      },
      {
        "@type": "SiteNavigationElement",
        position: 4,
        name: "Faculty Workspace",
        description:
          "Faculty curriculum management, course content publishing, student cohort tracking, and audit logging.",
        url: `${primaryDomain}/login`,
      },
      {
        "@type": "SiteNavigationElement",
        position: 5,
        name: "About DataDock",
        description:
          "Learn about DataDock, department vision, faculty coordinators, and autonomous curriculum excellence.",
        url: `${primaryDomain}/about`,
      },
      {
        "@type": "SiteNavigationElement",
        position: 6,
        name: "Academic Help & Contact Support",
        description:
          "Get in touch with department coordinators, student grievance resolution, and technical support.",
        url: `${primaryDomain}/contact`,
      },
    ],
  };

  // 4. Course / Learning Resource Schema
  const courseResourceSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: "B.Tech in Data Engineering",
    description:
      "Four-year undergraduate engineering program covering Cyber Security & IoT, Data Science, and Artificial Intelligence & Machine Learning.",
    provider: {
      "@type": "EducationalOrganization",
      name: "MVGR College of Engineering (Autonomous)",
      url: "https://www.mvgrce.edu.in",
    },
    educationalCredentialAwarded: "Bachelor of Technology (B.Tech)",
    occupationalCategory: "Engineering / Computer Science / Data Engineering",
    hasCourse: [
      {
        "@type": "Course",
        name: "Cyber Security & IoT (CIC)",
        description: "Network defense, cryptography, IoT hardware interfacing, and digital forensics.",
        courseCode: "CIC",
      },
      {
        "@type": "Course",
        name: "Data Science (CSD)",
        description: "Big data analytics, data warehousing, predictive modeling, and business intelligence.",
        courseCode: "CSD",
      },
      {
        "@type": "Course",
        name: "AI & Machine Learning (CSM)",
        description: "Deep learning, neural networks, natural language processing, and computer vision.",
        courseCode: "CSM",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(navigationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseResourceSchema) }}
      />
    </>
  );
}
