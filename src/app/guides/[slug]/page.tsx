import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticle, GuideMasthead } from "@/components/guides/GuidesEditorial";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { guideBySlug, guides } from "@/lib/guides/editorial";

export const dynamicParams = false;
export function generateStaticParams() { return guides.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);
  if (!guide) return {};
  const url = `/guides/${guide.slug}`;
  return { title: guide.seoTitle, description: guide.metaDescription, alternates: { canonical: url }, openGraph: { type: "article", title: guide.seoTitle, description: guide.pinterestDescription, url, images: [{ url: "/guides-bkg.png", width: 1750, height: 899, alt: "Home Cooked Guides" }] }, twitter: { card: "summary_large_image", title: guide.seoTitle, description: guide.pinterestDescription, images: ["/guides-bkg.png"] } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const guide = guideBySlug.get(slug); if (!guide) notFound(); return <div className="min-h-screen bg-cream text-ink"><GuideMasthead title={guide.title} description={guide.description} /><GuideArticle guide={guide} /><SiteFooter /></div>; }
