import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { PublicMasthead } from "@/components/layout/PublicMasthead";
import { GuideTableOfContents } from "@/components/guides/GuideTableOfContents";
import type { EditorialGuide } from "@/lib/guides/editorial";
import { guideBySlug } from "@/lib/guides/editorial";

const display = { fontFamily: "var(--font-playfair)" };

export function GuideMasthead({ eyebrow = "GUIDE", title, description }: { eyebrow?: string; title: string; description: string }) {
  return <PublicMasthead eyebrow={eyebrow} title={title} description={description} background="/guides-bkg.png" />;
}

function GuideDirectoryLinks({ guides }: { guides: EditorialGuide[] }) {
  return (
    <ol>
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link href={`/guides/${guide.slug}`} className="block min-h-12 px-5 py-3 text-[.98rem] leading-snug text-ink-muted transition-[background-color,color,padding] duration-200 hover:bg-green-pale/75 hover:px-7 hover:text-green-deep sm:px-7 sm:hover:px-9">
            {guide.title}
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function GuideDirectoryRail({ guides }: { guides: EditorialGuide[] }) {
  return (
    <aside className="lg:sticky lg:top-5 lg:self-start" aria-label="Guide library">
      <details className="overflow-hidden bg-paper-soft/68 lg:hidden">
        <summary className="flex min-h-20 list-none items-center px-5 text-[1.65rem] font-bold text-green-deep marker:hidden sm:px-7" style={display}>Browse the Guides</summary>
        <nav className="pb-5" aria-label="Guide pages">
          <GuideDirectoryLinks guides={guides} />
        </nav>
      </details>
      <div className="hidden min-h-[48rem] overflow-hidden bg-paper-soft/68 lg:block">
        <h2 className="flex min-h-20 items-center px-7 text-[1.65rem] font-bold text-green-deep" style={display}>Browse the Guides</h2>
        <nav className="pb-5" aria-label="Guide pages">
          <GuideDirectoryLinks guides={guides} />
        </nav>
      </div>
    </aside>
  );
}

export function GuideCard({ guide, featured = false }: { guide: EditorialGuide; featured?: boolean }) {
  if (featured) {
    return (
      <article className="grid items-center gap-9 border-y border-line py-10 md:grid-cols-[1.05fr_.95fr] md:py-16 lg:gap-16">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image src="/images/landing-cookbook-hero.png" alt="An open handwritten cookbook surrounded by apples and baking ingredients" fill sizes="(min-width: 768px) 52vw, 100vw" className="object-cover object-[67%_center] transition duration-500 hover:scale-[1.015] motion-reduce:transform-none" />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.24em] text-accent-terracotta">Featured guide</p>
          <h2 className="mt-4 text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-[1] text-green-deep" style={display}>{guide.title}</h2>
          <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">{guide.description}</p>
          <Link href={`/guides/${guide.slug}`} className="mt-7 inline-flex min-h-12 items-center gap-2 border-b-2 border-accent-terracotta text-sm font-extrabold text-green-deep">Read the guide <ArrowRight aria-hidden="true" size={17} /></Link>
        </div>
      </article>
    );
  }

  return (
    <article className="group border-t border-line py-8 sm:py-10">
      <Link href={`/guides/${guide.slug}`} className="grid min-h-20 grid-cols-[1fr_auto] items-center gap-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-accent-terracotta">Guide</p>
          <h2 className="mt-2 max-w-3xl text-[clamp(1.65rem,3vw,2.5rem)] font-bold leading-[1.12] text-green-deep transition group-hover:text-green-forest-dark" style={display}>{guide.title}</h2>
          <p className="mt-3 max-w-3xl text-[.98rem] leading-relaxed text-ink-muted">{guide.description}</p>
        </div>
        <ArrowRight aria-hidden="true" className="text-green-sage transition-transform group-hover:translate-x-1 motion-reduce:transform-none" size={24} />
      </Link>
    </article>
  );
}

function EditorialHeading({ children }: { children: React.ReactNode }) {
  return <div><h2 className="text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.04] text-green-deep" style={display}>{children}</h2><div aria-hidden="true" className="mt-4 h-px w-20 bg-green-sage/60" /></div>;
}

function OpeningSection({ guide }: { guide: EditorialGuide }) {
  const section = guide.sections[0];
  return (
    <section id={section.id} className="scroll-mt-8">
      <EditorialHeading>{section.heading}</EditorialHeading>
      <div className="mt-5 max-w-[48rem] space-y-4 text-[1.08rem] leading-[1.72] text-ink-muted sm:text-[1.18rem]">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      {section.bullets && <ul className="mt-6 max-w-[46rem] list-disc space-y-2 pl-6 text-[1.05rem] leading-relaxed text-ink-muted marker:text-green-sage sm:text-[1.12rem]">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
      <div className="relative mt-8">
        <div className="relative aspect-[16/8.7] min-h-[20rem]">
          <Image src="/guide-recipes.png" alt="Family recipes gathered around an open cookbook" fill sizes="(min-width: 1024px) 800px, 100vw" className="object-cover object-[66%_center]" />
        </div>
        <div className="absolute -bottom-10 left-3 z-10 grid aspect-[1105/1423] w-[13rem] place-items-center rotate-[-2deg] bg-[url('/paper-texture.png')] bg-[length:100%_100%] bg-no-repeat px-5 py-7 text-center drop-shadow-[0_10px_12px_rgba(54,42,28,0.22)] sm:-bottom-12 sm:left-6 sm:w-[15.5rem] sm:px-7 sm:py-8">
          <div className="rotate-[-4deg]">
            <p className="text-[1.05rem] font-medium leading-[1.22] text-green-deep sm:text-[1.3rem]" style={{ fontFamily: "var(--font-note-handwriting)" }}>{guide.quote}</p>
            <Heart aria-hidden="true" className="mx-auto mt-2 text-accent-terracotta" size={20} />
          </div>
        </div>
      </div>
    </section>
  );
}

function GuideFeature() {
  return (
    <section id="home-cooked" className="scroll-mt-8 border-y border-line py-10 sm:py-14">
      <div className="grid items-center gap-8 lg:grid-cols-[.95fr_1.05fr] lg:gap-12">
        <div className="relative aspect-[4/3]"><Image src="/images/home-page/app-landing.png" alt="Home Cooked cookbook collection interface" fill sizes="(min-width: 1024px) 35vw, 100vw" className="object-cover object-left" /></div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-accent-terracotta">A simpler way to keep everything together</p>
          <h2 className="mt-3 text-[clamp(2.2rem,4vw,3.4rem)] font-bold leading-[1.04] text-green-deep" style={display}>Give the recipes you love a real home</h2>
          <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-muted">Home Cooked lets you collect recipes into cookbooks, add the notes that make them yours, and share individual recipes or a whole cookbook when the plan and your family’s needs make that a good fit.</p>
          <Link href="/sign-in" className="mt-6 inline-flex min-h-12 items-center gap-2 border-b-2 border-accent-terracotta text-sm font-extrabold text-green-deep">Create your cookbook <ArrowRight aria-hidden="true" size={17} /></Link>
        </div>
      </div>
    </section>
  );
}

function RelatedGuides({ guide }: { guide: EditorialGuide }) {
  const related = guide.related.map((slug) => guideBySlug.get(slug)).filter((item): item is EditorialGuide => Boolean(item));
  return <section aria-labelledby="related-guides"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-accent-terracotta">Keep exploring</p><h2 id="related-guides" className="mt-2 text-[clamp(2.25rem,4vw,3.5rem)] font-bold text-green-deep" style={display}>Related guides</h2><div className="mt-6 border-b border-line">{related.map((item) => <GuideCard key={item.slug} guide={item} />)}</div></section>;
}

function GuideCta() {
  return (
    <section className="relative isolate overflow-hidden border-y border-line px-6 py-16 text-center sm:px-10 lg:py-20">
      <Image src="/guides-bkg.png" alt="" fill sizes="1200px" className="-z-20 object-cover object-[58%_center]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-paper-soft/38" />
      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-accent-terracotta">For the recipes worth keeping</p>
      <h2 className="mx-auto mt-3 max-w-3xl text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-[.98] text-green-deep" style={display}>Ready to give your recipes a home?</h2>
      <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">Organize the recipes you love into beautiful cookbooks you can keep and share.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/pricing" className="inline-flex min-h-12 items-center justify-center border-b-2 border-green-deep px-5 text-sm font-extrabold text-green-deep">View Pricing</Link><Link href="/sign-in" className="inline-flex min-h-12 items-center justify-center gap-2 border-b-2 border-accent-terracotta px-5 text-sm font-extrabold text-green-deep">Get Started Free <ArrowRight aria-hidden="true" size={17} /></Link></div>
    </section>
  );
}

export function GuideArticle({ guide }: { guide: EditorialGuide }) {
  return (
    <main id="main-content" className="mx-auto w-full max-w-[1260px] px-5 pb-20 sm:px-8 lg:px-12">
      <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <GuideTableOfContents guide={guide} />
        <article className="min-w-0">
          <OpeningSection guide={guide} />
          <div className="mt-16 space-y-14">
            {guide.sections.slice(1).map((section, index) => <section id={section.id} key={section.id} className="scroll-mt-8"><EditorialHeading>{section.heading}</EditorialHeading><div className="mt-5 max-w-[48rem] space-y-4 text-[1.06rem] leading-[1.78] text-ink-muted sm:text-[1.12rem]">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>{section.bullets && <ul className="mt-6 max-w-[46rem] list-disc space-y-2 pl-6 text-[1.04rem] leading-relaxed text-ink-muted marker:text-green-sage sm:text-[1.1rem]">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{index === 0 && <aside className="mt-7 border-y border-green-sage/45 py-6 text-[1.05rem] italic leading-relaxed text-green-deep"><span className="font-bold not-italic">A note to keep close:</span> {guide.callout}</aside>}</section>)}
          </div>
          <div className="mt-16"><GuideFeature /></div>
        </article>
      </div>
      <div className="mt-20"><RelatedGuides guide={guide} /></div>
      <div className="mt-20"><GuideCta /></div>
    </main>
  );
}
