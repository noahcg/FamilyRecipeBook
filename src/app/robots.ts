import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/onboarding", "/invite", "/r/", "/auth", "/api", "/dev"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
