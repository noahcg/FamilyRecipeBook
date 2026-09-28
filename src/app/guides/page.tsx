import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GuideCard, GuideMasthead } from "@/components/guides/GuidesEditorial";
import { guides } from "@/lib/guides/editorial";

export const metadata: Metadata = {
  title: "Guides",
  description: "Practical Home Cooked guides for collecting, organizing, preserving, and sharing the recipes that become part of a family story.",
  alternates: { canonical: "/guides" },
  openGraph: { title: "Home Cooked Guides", description: "Practical guides for the recipes that matter.", url: "/guides" },
};

export default function GuidesPage() {
  const [featured, ...rest] = guides;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <GuideMasthead
        eyebrow="HOME COOKED GUIDES"
        title="Ideas for keeping the recipes that matter."
        description="Practical guides for collecting, organizing, preserving, and sharing the recipes that become part of a family’s story."
      />
      <main id="main-content" className="mx-auto w-full max-w-[1240px] px-5 pb-20 sm:px-8 lg:px-12">
        <GuideCard guide={featured} featured />
        <section className="py-16 sm:py-20" aria-labelledby="all-guides">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-accent-terracotta">The Home Cooked library</p>
            <h2 id="all-guides" className="mt-3 text-[clamp(2.25rem,4.6vw,3.75rem)] font-bold leading-[1.05] text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>From a single recipe card to a collection worth passing on</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">Clear, thoughtful help for the practical work of keeping recipes—and the personal stories that make them worth keeping.</p>
          </div>
          <div className="mt-10 grid gap-x-14 md:grid-cols-2">
            {rest.map((guide) => <GuideCard key={guide.slug} guide={guide} />)}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
