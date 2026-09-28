import type { Metadata } from "next";
import Image from "next/image";
import { BookOpen, Camera, Heart, UsersRound } from "lucide-react";
import { GuideDirectoryRail, GuideMasthead } from "@/components/guides/GuidesEditorial";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { guides } from "@/lib/guides/editorial";

export const metadata: Metadata = {
  title: "Guides",
  description: "Practical Home Cooked guides for collecting, organizing, preserving, and sharing the recipes that become part of a family story.",
  alternates: { canonical: "/guides" },
  openGraph: { title: "Home Cooked Guides", description: "Practical guides for the recipes that matter.", url: "/guides" },
};

const lessons = [
  { icon: BookOpen, label: "Preserve cherished recipes", tone: "bg-[#f2d2a6] text-[#81532f]" },
  { icon: Camera, label: "Capture family stories and traditions", tone: "bg-[#cbdde3] text-[#245f70]" },
  { icon: UsersRound, label: "Organize everything in one place", tone: "bg-[#c8d7bf] text-green-deep" },
  { icon: Heart, label: "Create a legacy to share with generations", tone: "bg-[#f1c8bb] text-[#d85f43]" },
];

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <GuideMasthead
        eyebrow="HOME COOKED GUIDES"
        title="Ideas for keeping the recipes that matter."
        description="Practical guides for collecting, organizing, preserving, and sharing the recipes that become part of a family’s story."
      />

      <main id="main-content" className="mx-auto w-full max-w-[1420px] px-5 pb-20 sm:px-8 lg:px-12">
        <div className="grid gap-10 pb-14 pt-6 sm:pb-16 sm:pt-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-16 lg:pb-20 lg:pt-0">
          <GuideDirectoryRail guides={guides} />

          <article className="min-w-0">
            <section aria-labelledby="why-family-cookbook">
              <h2 id="why-family-cookbook" className="text-[clamp(2.65rem,4.25vw,4rem)] font-bold leading-[1.02] text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Why a Family Cookbook?</h2>
              <div aria-hidden="true" className="mt-4 h-px w-24 bg-green-sage/60" />
              <p className="mt-5 max-w-[58rem] text-[1.08rem] leading-[1.62] text-ink-muted sm:text-[1.2rem]">
                Recipes are more than just instructions—they&rsquo;re stories, traditions, and a connection to the people we love. Creating a family cookbook is a beautiful way to preserve those memories and keep them alive for future generations.
              </p>

              <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-[1rem] bg-[#d7c39e] shadow-[0_14px_34px_rgba(79,61,38,0.14)] sm:aspect-video">
                <Image src="/guide-books.png" alt="A stack of family cookbooks beside wooden spoons in a sunlit kitchen" fill priority sizes="(min-width: 1024px) 920px, 100vw" className="object-cover" />
              </div>
            </section>

            <section className="mt-7 rounded-[1.25rem] bg-[#e5e9dd] px-6 py-7 sm:px-10 sm:py-8" aria-labelledby="what-you-will-learn">
              <h2 id="what-you-will-learn" className="text-[clamp(2.2rem,3.5vw,3rem)] font-bold leading-[1.04] text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>What You&rsquo;ll Learn</h2>
              <p className="mt-4 max-w-4xl text-left text-[1.02rem] leading-[1.55] text-[#5f685d] sm:text-[1.12rem]" style={{ fontFamily: "var(--font-playfair)" }}>
                In this guide, we&rsquo;ll walk through the simple steps to create your own family cookbook, including how to gather recipes, organize them, add photos and stories, and share them with the people you love.
              </p>
              <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4">
                {lessons.map(({ icon: Icon, label, tone }, index) => (
                  <li key={label} className={`px-4 py-3 text-center ${index > 0 ? "border-t border-[#bac7b1] sm:border-l sm:border-t-0" : ""}`}>
                    <span className={`mx-auto grid size-14 place-items-center rounded-full ${tone}`}><Icon aria-hidden="true" size={27} strokeWidth={1.7} /></span>
                    <p className="mx-auto mt-3 max-w-[11rem] text-[.96rem] leading-snug text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>{label}</p>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
