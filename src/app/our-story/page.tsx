import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Heart, House, Leaf, UsersRound } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

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
    <div className="relative min-h-screen overflow-hidden bg-cream text-ink">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[44rem] sm:h-[50rem] lg:h-[56rem]">
        <Image src="/our-story-bkg.png" alt="" fill priority sizes="100vw" className="object-cover object-top" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(247,243,233,0.02)_0%,rgba(247,243,233,0.08)_42%,rgba(247,243,233,0.78)_78%,var(--color-cream)_100%)]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-[980px] px-5 pb-16 pt-36 text-center sm:px-8 sm:pb-24 sm:pt-40 lg:pb-28 lg:pt-44">
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-green-sage sm:text-sm">Our Story</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-[clamp(3.25rem,8vw,6.4rem)] font-bold leading-[0.94] text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Recipes deserve a home.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">Home Cooked started with a simple idea: the recipes that matter to us should be easier to keep, find, and share.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-in" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-green-forest-dark px-6 text-sm font-extrabold text-ink-inverse shadow-[var(--shadow-card)] transition hover:bg-green-deep"><BookOpen aria-hidden="true" size={17} strokeWidth={2} />Get Started</Link>
            <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-green-deep bg-paper-soft/70 px-6 text-sm font-extrabold text-green-deep transition hover:bg-paper-soft">See Pricing</Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-12">
          <div className="grid overflow-hidden rounded-[1.25rem] border border-line-soft bg-paper-soft/90 shadow-[var(--shadow-paper)] backdrop-blur-sm lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative min-h-[18rem] sm:min-h-[24rem] lg:min-h-[29rem]"><Image src="/images/home-page/app-landing.png" alt="A Home Cooked cookbook collection ready to browse" fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" /></div>
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <StoryHeading>A better place for the recipes we actually use</StoryHeading>
              <div className="mt-5 space-y-4 text-[1rem] leading-[1.75] text-ink-muted sm:text-[1.04rem]">
                <p>Recipes have a way of ending up everywhere: saved in a browser, buried in a message, scribbled on a card, or tucked away in a notebook we cannot find when we need it. The recipes themselves are often the easy part. Keeping them together is not.</p>
                <p>Home Cooked was created to make that feel simpler. It gives recipes a real home, where family favorites, dependable weeknight meals, and personal discoveries can live together in collections that feel like cookbooks—not just a list of saved links.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-accent-terracotta">The idea behind Home Cooked</p>
            <StoryHeading className="mt-3">A recipe collection should feel like yours</StoryHeading>
            <div className="mt-5 space-y-4 text-[1rem] leading-[1.75] text-ink-muted sm:text-[1.04rem]">
              <p>The best recipe apps help you cook. The best cookbooks also hold a little bit of your life. Home Cooked is being built with both of those ideas in mind: practical enough for a busy Tuesday, personal enough to preserve the recipes you would miss if they disappeared.</p>
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

        <section className="bg-paper-soft/60">
          <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-24 lg:px-12 lg:py-28">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-accent-terracotta">The person behind it</p><StoryHeading className="mt-3">Hi, I&rsquo;m Noah.</StoryHeading></div>
            <div className="max-w-2xl space-y-5 text-[1.05rem] leading-[1.8] text-ink-muted">
              <p>I built Home Cooked because it is the recipe app I wanted for myself. I wanted one place for the meals I make often, the recipes I want to remember, and the collections I would be happy to share.</p>
              <p>I also wanted it to feel less like managing information and more like keeping a personal cookbook. That idea is still at the center of Home Cooked as it grows.</p>
              <p>There is a lot of care behind the product, and there is still a lot left to build. Thank you for being here early.</p>
              <div className="pt-1 font-hand text-2xl text-accent-cinnamon">— Noah</div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="relative overflow-hidden rounded-[1.25rem] border border-[#dfe5cf] bg-[#eef1df] px-6 py-12 text-center sm:px-10 lg:px-20">
            <div aria-hidden="true" className="absolute -left-16 -top-16 size-48 rounded-full bg-[#d5dfc4]/70 blur-2xl" /><div aria-hidden="true" className="absolute -bottom-20 -right-10 size-56 rounded-full bg-[#f1d6c6]/65 blur-2xl" />
            <div className="relative">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-accent-terracotta">For the recipes worth keeping</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-[clamp(2.15rem,4.8vw,3.8rem)] font-bold leading-[1.03] text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Keep the good stuff close</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">Whether it is a family recipe, a short list of weeknight favorites, or a cookbook you want to pass along, Home Cooked is designed to make those collections easier to keep and easier to share.</p>
              <Link href="/sign-in" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-green-forest-dark px-6 text-sm font-extrabold text-ink-inverse shadow-[var(--shadow-card)] transition hover:bg-green-deep">Make a home for your recipes<ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
