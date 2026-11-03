import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides/editorial";
import { siteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/guides", "/pricing", "/our-story", "/privacy", "/terms", ...guides.map(({ slug }) => `/guides/${slug}`)]
    .map((path) => ({ url: `${siteUrl}${path}` }));
}
