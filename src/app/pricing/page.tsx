import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { BillingButton } from "@/components/billing/BillingButton";

const freeFeatures = [
  "Create one cookbook of your own",
  "Save up to 50 recipes",
  "Share individual recipes with family and friends",
  "Keep your favorite recipes close",
  "Get AI-inspired recipe ideas",
];

const plusFeatures = [
  "Create unlimited cookbooks and save unlimited recipes",
  "Share entire cookbooks with family and friends",
  "Import recipes from websites, PDFs, Paprika, and more",
  "Paste a recipe and let Home Cooked organize it for you",
  "Plan meals and build your grocery list",
  "Get more AI-inspired recipe ideas",
  "Share recipes as polished PDFs",
];

function FeatureRow({ children, premium = false }: { children: React.ReactNode; premium?: boolean }) {
  return (
    <li className="flex items-start gap-3 text-[0.92rem] leading-relaxed text-ink-muted sm:text-[0.98rem]">
      <Check
        aria-hidden="true"
        className={premium ? "mt-1 shrink-0 text-accent-terracotta" : "mt-1 shrink-0 text-green-deep"}
        size={16}
        strokeWidth={3}
      />
      <span>{children}</span>
    </li>
  );
}

export const metadata = {
  title: "Pricing",
  description:
    "Start your recipe collection for free, or unlock every Home Cooked feature for $14.99 a year.",
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ upgrade?: string }> }) {
  const params = await searchParams;
  const resumeCheckout = params.upgrade === "1";
  return (
    <div className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden overflow-y-visible bg-cream text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-0 w-screen max-w-[100vw]"
      >
        <Image
          src="/pricing-bkg.png"
          alt=""
          width={1750}
          height={899}
          priority
          sizes="100vw"
          className="block h-auto w-full max-w-full"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[38%]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(247,243,233,0) 0%, rgba(247,243,233,0.3) 38%, rgba(247,243,233,0.82) 78%, var(--color-cream) 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <PublicHeader />

        <main>
          <section className="mx-auto max-w-[980px] px-4 pb-6 pt-28 text-center sm:px-8 sm:pb-8 sm:pt-32 lg:pt-36">
            <h1
              className="text-[clamp(2.4rem,5.3vw,4.5rem)] font-bold leading-[1.04] text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              A better way to keep your recipes.
              <span className="block font-semibold italic text-accent-terracotta">
                For every kitchen, at every stage.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[1rem] leading-relaxed text-ink-muted sm:text-[1.15rem]">
              Start for free, or unlock the full Home Cooked experience. Either
              way, you&rsquo;ll be one step closer to a more organized, delicious life.
            </p>
          </section>

          <section className="mx-auto grid max-w-[960px] gap-5 px-4 pb-10 sm:px-8 sm:pb-12 lg:grid-cols-2 lg:gap-6 lg:px-0">
            <article className="flex min-h-[490px] flex-col rounded-[1.1rem] border border-white/75 bg-white/90 p-7 shadow-[0_12px_34px_rgba(79,61,38,0.12)] backdrop-blur-sm sm:p-8">
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-sage">Free</p>
              <h2 className="mt-2 text-[2rem] font-bold leading-none text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                Get Started
              </h2>
              <p className="mt-3 text-[0.98rem] text-ink-muted">Everything you need to start making your recipe collection yours.</p>
              <div className="mt-5 flex items-baseline gap-2 border-b border-line-soft pb-5">
                <span className="text-[3.1rem] font-bold leading-none text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>$0</span>
                <span className="text-sm text-ink-muted">forever</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {freeFeatures.map((feature) => <FeatureRow key={feature}>{feature}</FeatureRow>)}
              </ul>
              <Link href="/sign-in" className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-green-deep px-5 text-sm font-extrabold text-green-deep transition hover:bg-green-pale">
                Create Free Account
              </Link>
            </article>

            <article className="flex min-h-[490px] flex-col rounded-[1.1rem] border border-white/80 bg-[#fffaf0]/95 p-7 shadow-[0_12px_34px_rgba(79,61,38,0.14)] backdrop-blur-sm sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-accent-terracotta">Plus</p>
                  <h2 className="mt-2 text-[2rem] font-bold leading-none text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                    All the Good Stuff
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-[0.98rem] text-ink-muted">Everything you love about Home Cooked, with more ways to save, share, and plan.</p>
              <div className="mt-5 flex items-baseline gap-2 border-b border-line-soft pb-5">
                <span className="text-[3.1rem] font-bold leading-none text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>$14.99</span>
                <span className="text-sm text-ink-muted">/ year</span>
              </div>
              <ul className="mt-5 space-y-2.5 pb-5">
                {plusFeatures.map((feature) => <FeatureRow key={feature} premium>{feature}</FeatureRow>)}
              </ul>
              <div className="mt-auto"><BillingButton intent="plus" autoStart={resumeCheckout} className="w-full !rounded-full">Get Plus for $14.99 / Year</BillingButton><p className="mt-2 text-center text-xs text-ink-soft">Create your account, then confirm payment through Stripe Checkout.</p></div>
            </article>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
