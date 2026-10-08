import Image from "next/image";
import Link from "next/link";
import { Sacramento } from "next/font/google";
import { ArrowRight, BookOpen, Heart, House, Leaf, UsersRound } from "lucide-react";
import { PublicMasthead } from "@/components/layout/PublicMasthead";
import { SiteFooter } from "@/components/layout/SiteFooter";
import styles from "./OurStoryFounder.module.css";

const sacramento = Sacramento({ weight: "400", subsets: ["latin"], variable: "--font-sacramento", display: "swap" });

export const metadata = {
  title: "Our Story",
  description: "Why Noah built Home Cooked: a real home for the recipes that matter.",
};

function StoryHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-[clamp(2rem,4.6vw,3.45rem)] font-bold leading-[1.06] text-green-deep ${className}`} style={{ fontFamily: "var(--font-playfair)" }}>
      {children}
    </h2>
  );
}

const principles = [
  { icon: Heart, tone: "bg-[#f6d7cb] text-accent-terracotta", title: "Keep what matters", body: "Easy to organize and easy to return to." },
  { icon: UsersRound, tone: "bg-[#dfe8d7] text-green-deep", title: "Share with care", body: "Collections made for the people you care about." },
  { icon: Leaf, tone: "bg-[#f7e2ae] text-accent-cinnamon", title: "Keep it focused", body: "Practical enough for a busy Tuesday." },
  { icon: House, tone: "bg-[#d8e6ed] text-[#286273]", title: "Give it a home", body: "A personal cookbook that feels genuinely yours." },
];

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <PublicMasthead
        eyebrow="OUR STORY"
        title="Recipes deserve a home."
        description="Home Cooked started with a simple idea: the recipes that matter to us should be easier to keep, find, and share."
        background="/our-story-bkg.png"
      >
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/sign-in" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-green-forest-dark px-6 text-sm font-extrabold text-ink-inverse shadow-[var(--shadow-card)] transition hover:bg-green-deep"><BookOpen aria-hidden="true" size={17} strokeWidth={2} />Get Started</Link>
          <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-green-deep bg-paper-soft/70 px-6 text-sm font-extrabold text-green-deep transition hover:bg-paper-soft">See Pricing</Link>
        </div>
      </PublicMasthead>

      <main className="relative z-10">
        <section className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-12">
          <div className="grid overflow-hidden rounded-[1.25rem] border border-line-soft bg-paper-soft/90 shadow-[var(--shadow-paper)] backdrop-blur-sm lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative min-h-[18rem] sm:min-h-[24rem] lg:min-h-[29rem]"><Image src="/images/home-page/app-landing.png" alt="A Home Cooked cookbook collection ready to browse" fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" /></div>
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <StoryHeading>A better place for the recipes we actually use</StoryHeading>
              <div className="mt-5 space-y-4 text-[1rem] leading-[1.75] text-ink-muted sm:text-[1.04rem]">
                <p>Recipes have a way of ending up everywhere: saved in a browser, buried in a message, scribbled on a card, or tucked away in a notebook we can&rsquo;t find when we need it. The recipes themselves are often the easy part. Keeping them together isn&rsquo;t.</p>
                <p>Home Cooked was created to make that feel simpler. It gives recipes a real home, where family favorites, dependable weeknight meals, and personal discoveries can live together in collections that feel like cookbooks, not just a list of saved links.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-accent-terracotta">The idea behind Home Cooked</p>
            <StoryHeading className="mt-3">A recipe collection should feel like yours</StoryHeading>
            <div className="mt-5 space-y-4 text-[1rem] leading-[1.75] text-ink-muted sm:text-[1.04rem]">
              <p>The best recipe apps help you cook. The best cookbooks also hold a little bit of your life. Home Cooked is being built with both of those ideas in mind: practical enough for a busy Tuesday, personal enough to preserve the recipes you&rsquo;d miss if they disappeared.</p>
              <p>That means making recipes easy to organize, easy to return to, and easy to share with the people you care about. It also means keeping the experience focused. Home Cooked is here to help you build a collection that feels useful, familiar, and genuinely yours.</p>
            </div>
          </div>

          <div className="mt-14 grid border-y border-line-soft sm:grid-cols-2 lg:grid-cols-4">
            {principles.map(({ icon: Icon, tone, title, body }, index) => (
              <div key={title} className={`px-5 py-8 text-center sm:px-6 lg:py-9 ${index > 0 ? "border-t border-line-soft lg:border-l lg:border-t-0" : ""}`}>
                <span className={`mx-auto grid size-14 place-items-center rounded-full ${tone}`}><Icon aria-hidden="true" size={25} strokeWidth={1.8} /></span>
                <h3 className="mx-auto mt-4 max-w-[12rem] text-lg font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>{title}</h3>
                <p className="mx-auto mt-2 max-w-[13rem] text-sm leading-relaxed text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.founder} aria-labelledby="noah-story-heading">
          <div className={styles.spread}>
            <div className={styles.heading}>
              <p className={styles.eyebrow}>The story behind Home Cooked</p>
              <h2 id="noah-story-heading">Hi, I&rsquo;m Noah.</h2>
              <p className={styles.intro}>I built Home Cooked because I wanted it to exist.</p>
              <span className={styles.rule} aria-hidden="true" />
            </div>
            <div className={styles.collage}>
              <Image src="/images/our-story-collage-facing-right.png" alt="Noah facing right beside cookbooks, handwritten recipes, brownies, and a recipe shared by text" width={1301} height={1209} sizes="(min-width: 1100px) 42vw, (min-width: 700px) 70vw, 100vw" className={styles.collageImage} />
            </div>
            <div className={styles.story}>
              <p>My recipes were everywhere: cookbooks with loose printouts tucked inside, browser bookmarks, screenshots, handwritten notes, texts and emails from family, and more recently, recipes I was creating with AI. I wanted one place for all of them, but I didn&rsquo;t want another folder of links. I wanted something that felt like a cookbook of my own.</p>
              <p>Then I bought a cookbook that made me look at the whole idea differently. It wasn&rsquo;t just a collection of recipes. It told stories about the people behind the food, why they made it, who they made it for, and what those recipes meant to them. I remember holding it and thinking, <strong className="font-bold text-ink">&ldquo;Why can&rsquo;t I make something like this with my own recipes?&rdquo;</strong></p>
              <p>That idea became Home Cooked.</p>
              <p>At first, it was simply going to be my own beautiful place to save recipes and share them with people I love. Then it started growing. What if family members could contribute their recipes too? What if a cookbook could become something everyone adds to over time, instead of something owned by just one person?</p>
              <p>There&rsquo;s a more personal reason that matters to me. My grandmother has been gone for about 20 years, and nobody has her chicken soup recipe. I&rsquo;ll never taste it again. It&rsquo;s a small reminder of how easily a recipe, and a little piece of someone&rsquo;s story, can disappear.</p>
              <p>Home Cooked still gives me the organized recipe collection I originally wanted. But I hope it can also give families a place to cook from, contribute to, and build together. Something they&rsquo;ll be happy they kept.</p>
              <p className={`${styles.signature} ${sacramento.variable}`}>Noah</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="relative overflow-hidden rounded-[1.25rem] border border-[#dfe5cf] bg-[#eef1df] px-6 py-12 text-center sm:px-10 lg:px-20">
            <div aria-hidden="true" className="absolute -left-16 -top-16 size-48 rounded-full bg-[#d5dfc4]/70 blur-2xl" /><div aria-hidden="true" className="absolute -bottom-20 -right-10 size-56 rounded-full bg-[#f1d6c6]/65 blur-2xl" />
            <div className="relative">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-accent-terracotta">For the recipes worth keeping</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-[clamp(2.15rem,4.8vw,3.8rem)] font-bold leading-[1.03] text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Keep the good stuff close</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">Whether it&rsquo;s a family recipe, a short list of weeknight favorites, or a cookbook you want to pass along, Home Cooked is designed to make those collections easier to keep and easier to share.</p>
              <Link href="/sign-in" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-green-forest-dark px-6 text-sm font-extrabold text-ink-inverse shadow-[var(--shadow-card)] transition hover:bg-green-deep">Make a home for your recipes<ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
