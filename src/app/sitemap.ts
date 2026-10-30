import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides/editorial";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
  return ["/", "/guides", "/pricing", "/our-story", "/privacy", "/terms", ...guides.map(({ slug }) => `/guides/${slug}`)]
    .map((path) => ({ url: `${base}${path}` }));
}
