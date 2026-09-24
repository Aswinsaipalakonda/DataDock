import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://datadock.aswinsai.tech";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/contact", "/login", "/terms", "/privacy", "/llms.txt", "/llms-full.txt"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
          "Bytespider",
          "cohere-ai",
        ],
        allow: ["/", "/about", "/contact", "/terms", "/privacy", "/llms.txt", "/llms-full.txt"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
