import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChefHat, ShoppingCart, Sparkles } from "lucide-react";
import { BrandLockup } from "@/components/ui/BrandLockup";

function FeatureCopy({
  icon: Icon,
  tone,
  titleLead,
  titleAccent,
  body,
}: {
  icon: typeof BookOpen;
  tone: string;
  titleLead: string;
  titleAccent: string;
  body: string;
}) {
  return (
    <div className="max-w-[28rem]">
      <span className={`mb-4 grid size-12 place-items-center rounded-full ${tone}`}>
        <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
      </span>
      <h3
        className="text-[clamp(1.9rem,3.8vw,2.5rem)] font-bold leading-[1.06] text-green-deep"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {titleLead}{" "}
        <span className="font-semibold italic text-accent-terracotta">
          {titleAccent}
        </span>
      </h3>
      <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-muted sm:text-[1.08rem]">
        {body}
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative app-paper-bg paper-texture min-h-screen overflow-hidden text-ink">
      <div
        className="absolute top-0 right-0 z-0 h-[520px] w-full overflow-hidden sm:h-[640px] lg:h-[820px] lg:w-[58vw] lg:min-w-[660px]"
        style={{
          maskImage: [
            'linear-gradient(to right, transparent 0%, black 22%)',
            'linear-gradient(to top, transparent 0%, black 18%)',
          ].join(', '),
          WebkitMaskImage: [
            'linear-gradient(to right, transparent 0%, black 22%)',
            'linear-gradient(to top, transparent 0%, black 18%)',
          ].join(', '),
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
          maskSize: '100% 100%, 100% 100%',
          maskRepeat: 'no-repeat',
        }}
      >
        <Image
          src="/images/landing-cookbook-hero.png"
          alt="Open handwritten recipe book on a warm kitchen counter with apples, herbs, flour, spices, and coffee"
          fill
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover object-[74%_34%] sm:object-[70%_48%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(247,243,233,0.08)_0%,rgba(247,243,233,0.38)_24%,rgba(247,243,233,0.82)_48%,var(--color-cream)_76%)] sm:bg-[linear-gradient(to_bottom,rgba(247,243,233,0)_0%,rgba(247,243,233,0.16)_58%,var(--color-cream)_100%)] lg:hidden"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-cream)_0%,rgba(247,243,233,0.92)_20%,rgba(247,243,233,0.42)_58%,rgba(247,243,233,0.04)_100%)] sm:hidden"
        />
      </div>

      <header className="relative z-20 mx-auto flex w-full max-w-[1360px] items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5 lg:px-12 lg:py-8">
        <Link href="/" className="shrink-0">
          <BrandLockup className="brand-lockup--homepage" />
        </Link>
      </header>

      <main>
        <section className="relative min-h-[480px] pb-4 pt-8 sm:min-h-[520px] lg:min-h-[560px] lg:pb-6 lg:pt-8">
          <div className="relative z-10 mx-auto w-full max-w-[1360px] px-4 sm:px-8 lg:px-12">
            <div className="max-w-2xl">
              <h1
                className="text-[clamp(2.25rem,11vw,2.85rem)] font-bold leading-[1.02] tracking-normal text-green-deep sm:text-[4.25rem] lg:text-[5.35rem]"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Made with love.
                <br />
                <span className="font-semibold italic text-accent-terracotta">
                  Shared for generations.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted sm:mt-6 sm:text-xl">
                Create a Home Cooked recipe book, save the meals that matter, and
                bring everyone into the story.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-green-forest-dark px-6 text-base font-extrabold text-ink-inverse shadow-[var(--shadow-card)] transition hover:bg-green-deep"
                >
                  <BookOpen aria-hidden="true" size={18} strokeWidth={2} />
                  Start your recipe book
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex min-h-13 items-center justify-center rounded-full border border-line bg-card px-6 text-base font-extrabold text-green-deep shadow-soft transition hover:bg-white-soft"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-[1360px] px-4 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-10 lg:px-12 lg:pb-28 lg:pt-12">
          <div className="text-center">
            <h2
              className="text-[clamp(2.5rem,6.5vw,5rem)] font-semibold italic leading-[1.02] tracking-normal text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              More than recipes.
              <span className="mt-1 block text-accent-terracotta">
                It&rsquo;s your story.
              </span>
            </h2>
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-8 sm:pb-28 lg:px-12 lg:pb-36">
          <div className="space-y-24 sm:space-y-32 lg:space-y-40">
            <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
              <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
                <div className="relative w-full overflow-hidden rounded-[14px] border border-[rgba(36,79,59,0.14)] bg-paper shadow-[0_24px_60px_rgba(57,45,25,0.14)]">
                  <Image
                    src="/images/homecooked-landing.png"
                    alt="Home Cooked cookbook home screen with recipes, meal plan, and quick actions"
                    width={1507}
                    height={760}
                    sizes="(min-width: 1024px) 640px, 100vw"
                    className="h-auto w-full"
                  />
                </div>
              </div>
              <div className="order-1 flex justify-center lg:order-2 lg:justify-start">
                <FeatureCopy
                  icon={BookOpen}
                  tone="bg-green-soft/80 text-green-deep"
                  titleLead="Your cookbooks,"
                  titleAccent="all in one place."
                  body="Every recipe, idea, and meal plan lives in your own private cookbook — ready when you are."
                />
              </div>
            </div>

            <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
              <div className="order-1 flex justify-center lg:justify-end">
                <FeatureCopy
                  icon={Sparkles}
                  tone="bg-[#dde5d7]/80 text-green-forest-dark"
                  titleLead="Let AI help"
                  titleAccent="spark the idea."
                  body="Describe what you're in the mood for and Home Cooked drafts a recipe you can tweak, save, and put on the table tonight."
                />
              </div>
              <div className="order-2 flex justify-center lg:justify-end">
                <div className="relative w-full overflow-hidden rounded-[14px] border border-[rgba(36,79,59,0.14)] bg-paper shadow-[0_24px_60px_rgba(57,45,25,0.14)]">
                  <Image
                    src="/images/homecooked-ideas.png"
                    alt="The Home Cooked recipe ideas screen, turning a short description into a draft recipe"
                    width={1508}
                    height={658}
                    sizes="(min-width: 1024px) 640px, 100vw"
                    className="h-auto w-full"
                  />
                </div>
              </div>
            </div>

            <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
              <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
                <div className="relative w-full overflow-hidden rounded-[14px] border border-[rgba(36,79,59,0.14)] bg-paper shadow-[0_24px_60px_rgba(57,45,25,0.14)]">
                  <Image
                    src="/images/homecooked-recipe.png"
                    alt="A recipe page in Home Cooked showing photo, ingredients, and step-by-step method"
                    width={1507}
                    height={763}
                    sizes="(min-width: 1024px) 640px, 100vw"
                    className="h-auto w-full"
                  />
                </div>
              </div>
              <div className="order-1 flex justify-center lg:order-2 lg:justify-start">
                <FeatureCopy
                  icon={ChefHat}
                  tone="bg-[#f3d7cc] text-accent-terracotta"
                  titleLead="Recipes that"
                  titleAccent="read like a story."
                  body="Beautiful, easy-to-follow pages with photos, ingredients, and step-by-step instructions anyone can cook from."
                />
              </div>
            </div>

            <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
              <div className="order-1 flex justify-center lg:justify-end">
                <FeatureCopy
                  icon={ShoppingCart}
                  tone="bg-[#f5df9e]/70 text-accent-cinnamon"
                  titleLead="Grocery lists,"
                  titleAccent="made smart."
                  body="Build your list straight from the week's meal plan, then find the closest stores to shop at."
                />
              </div>
              <div className="order-2 flex justify-center lg:justify-end">
                <div className="relative w-full overflow-hidden rounded-[14px] border border-[rgba(36,79,59,0.14)] bg-paper shadow-[0_24px_60px_rgba(57,45,25,0.14)]">
                  <Image
                    src="/images/homecooked-groceries.png"
                    alt="The grocery list in Home Cooked with categorized items and nearby store suggestions"
                    width={1507}
                    height={761}
                    sizes="(min-width: 1024px) 640px, 100vw"
                    className="h-auto w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-[1140px] px-4 pb-24 text-center sm:px-8 sm:pb-28 lg:px-12 lg:pb-32">
          <h2
            className="text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.05] text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Start your{" "}
            <span className="font-semibold italic text-accent-terracotta">
              recipe book.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[1.05rem] leading-relaxed text-ink-muted">
            It only takes a minute. Save the recipes that matter — and the
            moments behind them.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-green-forest-dark px-6 text-base font-extrabold text-ink-inverse shadow-[var(--shadow-card)] transition hover:bg-green-deep"
            >
              <BookOpen aria-hidden="true" size={18} strokeWidth={2} />
              Start your recipe book
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex min-h-13 items-center justify-center rounded-full border border-line bg-card px-6 text-base font-extrabold text-green-deep shadow-soft transition hover:bg-white-soft"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
