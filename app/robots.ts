import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com";

const allowedPaths = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/refund",
  "/cancellation",
  "/shipping",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: allowedPaths,
      disallow: ["/app", "/admin", "/embed", "/api"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
