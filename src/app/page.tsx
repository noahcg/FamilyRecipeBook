import Image from "next/image";
import Link from "next/link";
import {
  BookHeart,
  BookMarked,
  BookOpen,
  Check,
  FolderHeart,
  HeartHandshake,
  Paperclip,
  Star,
  Utensils,
} from "lucide-react";
import { BrandLockup } from "@/components/ui/BrandLockup";

const AVATARS = [
  { name: "M", color: "#EAC6B8" },
  { name: "G", color: "#DDE5D7" },
  { name: "L", color: "#F5D48D" },
  { name: "A", color: "#E8D5B8" },
];

const COLLECTIONS = [
  "Sunday Dinners",
  "Holiday Favorites",
  "Quick & Easy",
  "Desserts",
];

function LeafLine({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 130 58"
      className={className}
      fill="none"
    >
      <path
        d="M18 48C42 28 68 15 113 11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M39 31c-13-2-22 3-27 14 13 2 22-3 27-14Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M57 22c-8-10-18-12-29-6 8 10 18 12 29 6Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M78 16c-9-8-19-8-28 0 9 8 19 8 28 0Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M101 12c-6-10-15-14-27-10 6 11 16 14 27 10Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function HeartSwoosh({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 95 54"
      className={className}
      fill="none"
    >
      <path
        d="M16 22c8-9 18 0 14 9-3 7-12 12-12 12S7 35 6 27c-1-9 9-12 16-5Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39 36c16 4 33-1 48-14"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BotanicalSprig({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 92 128"
      className={className}
      fill="none"
    >
      <path d="M18 116C31 75 45 42 75 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 88C15 84 7 72 5 54c16 4 25 15 25 34Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.4" />
      <path d="M42 63C27 56 21 43 24 27c14 7 21 20 18 36Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.4" />
      <path d="M55 43c-1-16 7-27 23-34 1 17-7 29-23 34Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.4" />
      <path d="M24 102c15-1 27 6 36 21-17 0-29-7-36-21Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function FeatureCopy({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: typeof BookHeart;
  tone: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-[25rem]">
      <span className={`mb-5 grid size-14 place-items-center rounded-full ${tone}`}>
        <Icon aria-hidden="true" size={24} strokeWidth={1.75} />
      </span>
      <h3
        className="text-[1.55rem] font-bold leading-[1.08] text-green-deep sm:text-[1.8rem]"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {title}
      </h3>
      <p className="mt-3 text-[1rem] leading-relaxed text-ink-muted sm:text-[1.08rem]">
        {body}
      </p>
      <Link
        href="/sign-up"
        className="mt-5 inline-flex text-[1rem] font-extrabold text-accent-terracotta transition hover:text-green-deep"
      >
        Learn more →
      </Link>
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
          alt="Open handwritten family recipe book on a warm kitchen counter with apples, herbs, flour, spices, and coffee"
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
        <section className="relative min-h-[560px] pb-4 pt-8 sm:min-h-[580px] lg:min-h-[600px] lg:pb-6 lg:pt-8">
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

              <div className="mt-7 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-center">
                <div className="flex -space-x-3">
                  {AVATARS.map((avatar) => (
                    <span
                      key={avatar.name}
                      className="grid size-10 place-items-center rounded-full border-[3px] border-paper text-sm font-black text-green-forest-dark shadow-soft"
                      style={{ backgroundColor: avatar.color }}
                    >
                      {avatar.name}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-green-deep">
                    Loved by families everywhere
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold text-ink-muted">
                    <span className="flex text-accent-mustard">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          aria-hidden="true"
                          className="fill-current"
                          size={15}
                        />
                      ))}
                    </span>
                    4.9 (320+ reviews)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-[50px] mx-auto w-full max-w-[1360px] px-4 pb-10 pt-14 sm:px-8 sm:pt-18 lg:px-12">
          <div className="text-center">
            <LeafLine className="mx-auto mb-4 h-10 w-24 text-green-sage" />
            <h2
              className="text-[clamp(2.75rem,7vw,5.5rem)] font-semibold italic leading-[0.98] tracking-normal text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              More than recipes.
              <span className="relative mt-1 block text-accent-terracotta">
                It&rsquo;s your story.
                <HeartSwoosh className="absolute left-[calc(50%+8.5rem)] top-2 hidden h-12 w-20 text-accent-terracotta sm:block lg:left-[calc(50%+13rem)] lg:top-5" />
              </span>
            </h2>
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-[1360px] px-4 pb-12 sm:px-8 lg:px-12">
          <div className="grid overflow-hidden rounded-[2rem] border border-[rgba(36,79,59,0.12)] bg-[rgba(255,250,240,0.46)] shadow-[0_18px_45px_rgba(57,45,25,0.10)] lg:grid-cols-2">
            <article className="relative grid gap-8 p-6 sm:p-9 md:grid-cols-[0.92fr_1fr] md:items-center lg:min-h-[370px] lg:border-r lg:border-b lg:border-[rgba(36,79,59,0.18)] lg:p-10">
              <div className="relative mx-auto w-full max-w-[250px] rotate-[-3deg] rounded-[12px] border border-[rgba(36,79,59,0.12)] bg-paper p-3 pb-8 shadow-[0_18px_45px_rgba(57,45,25,0.10)]">
                <span className="absolute -left-5 -top-4 z-10 h-10 w-24 rotate-[-13deg] rounded-[3px] bg-[#eadbc6]/85 shadow-sm" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-[8px] bg-paper-deep">
                  <Image
                    src="/images/recipes/apple-pie.png"
                    alt="Apple pie recipe page"
                    fill
                    sizes="250px"
                    className="object-cover"
                  />
                </div>
              </div>

              <FeatureCopy
                icon={BookHeart}
                tone="bg-green-soft/80 text-green-deep"
                title="Save family recipes"
                body="Capture recipes with ingredients, instructions, and photos so they’re never lost."
              />
            </article>

            <article className="relative grid gap-8 border-t border-dotted border-[rgba(36,79,59,0.22)] p-6 sm:p-9 md:grid-cols-[1fr_0.94fr] md:items-center lg:min-h-[370px] lg:border-t-0 lg:border-b lg:p-10">
              <FeatureCopy
                icon={BookMarked}
                tone="bg-[#f3d7cc] text-accent-terracotta"
                title="Add stories and memories"
                body="Every recipe has a story. Add notes, memories, and moments that make it special."
              />

              <div className="relative mx-auto max-w-[285px] rotate-[3deg]">
                <Paperclip
                  aria-hidden="true"
                  className="absolute -left-1 -top-6 z-20 rotate-[-18deg] text-green-sage drop-shadow-sm"
                  size={38}
                  strokeWidth={1.6}
                />
                <div
                  className="relative border border-[rgba(36,79,59,0.12)] bg-[#fff4dc] px-6 py-8 shadow-[0_18px_45px_rgba(57,45,25,0.10)]"
                  style={{
                    clipPath:
                      "polygon(0 4%, 9% 2%, 18% 5%, 29% 1%, 41% 4%, 53% 1%, 64% 4%, 76% 1%, 88% 5%, 100% 3%, 98% 100%, 3% 98%)",
                  }}
                >
                  <p
                    className="text-[1.65rem] leading-[1.18] text-accent-cinnamon"
                    style={{ fontFamily: "var(--font-caveat)" }}
                  >
                    This was the first dessert I learned to make with Grandma. Now I
                    make it for my kids.
                  </p>
                  <HeartSwoosh className="ml-auto mt-2 h-9 w-14 text-accent-terracotta" />
                </div>
              </div>
            </article>

            <article className="relative grid gap-8 border-t border-dotted border-[rgba(36,79,59,0.22)] p-6 sm:p-9 md:grid-cols-[0.92fr_1fr] md:items-center lg:min-h-[370px] lg:border-r lg:border-t-0 lg:p-10">
              <div className="relative mx-auto w-full max-w-[270px] rotate-[2deg] rounded-[12px] border border-[rgba(36,79,59,0.12)] bg-paper p-3 pb-8 shadow-[0_18px_45px_rgba(57,45,25,0.10)]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[8px] bg-paper-deep">
                  <Image
                    src="/images/landing-cookbook-hero.png"
                    alt="Family cooking together"
                    fill
                    sizes="270px"
                    className="object-cover object-[44%_56%]"
                  />
                </div>
                <div
                  className="absolute -bottom-5 -left-4 rotate-[-5deg] rounded-[8px] border border-[rgba(36,79,59,0.12)] bg-green-soft px-4 py-3 text-center text-[1.35rem] leading-none text-green-deep shadow-[0_10px_22px_rgba(57,45,25,0.10)]"
                  style={{ fontFamily: "var(--font-caveat)" }}
                >
                  Grandma, Mom &amp; Ava ♡
                </div>
              </div>

              <FeatureCopy
                icon={HeartHandshake}
                tone="bg-[#f5df9e]/70 text-accent-cinnamon"
                title="Bring family into the book"
                body="Invite family to view, add, and share their favorite recipes and memories."
              />
            </article>

            <article className="relative grid gap-8 border-t border-dotted border-[rgba(36,79,59,0.22)] p-6 sm:p-9 md:grid-cols-[1fr_0.95fr] md:items-center lg:min-h-[370px] lg:p-10">
              <FeatureCopy
                icon={FolderHeart}
                tone="bg-green-soft/80 text-green-deep"
                title="Build collections"
                body="Organize recipes into collections for holidays, quick meals, Sunday dinners, and more."
              />

              <div className="relative mx-auto w-full max-w-[295px]">
                <BotanicalSprig className="absolute -right-8 -top-10 h-24 w-20 rotate-12 text-green-sage/75" />
                <div className="relative space-y-3">
                  {COLLECTIONS.map((collection, index) => (
                    <div
                      key={collection}
                      className={`flex min-h-13 items-center gap-3 rounded-full border border-[rgba(36,79,59,0.12)] px-5 text-[1rem] font-extrabold text-green-deep shadow-[0_10px_22px_rgba(57,45,25,0.07)] ${
                        index === 1 ? "bg-green-soft" : "bg-paper"
                      }`}
                    >
                      {index === 1 ? (
                        <Check aria-hidden="true" size={18} strokeWidth={2.2} />
                      ) : (
                        <Utensils aria-hidden="true" size={18} strokeWidth={1.8} />
                      )}
                      {collection}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
