import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  Leaf,
  LibraryBig,
  NotebookPen,
  Star,
  Users,
} from "lucide-react";
import { BrandLockup } from "@/components/ui/BrandLockup";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Save family recipes",
    body: "Capture recipes with ingredients, instructions, and photos so they’re never lost.",
  },
  {
    icon: NotebookPen,
    title: "Add stories and memories",
    body: "Every recipe has a story. Add notes, memories, and moments that make it special.",
  },
  {
    icon: Users,
    title: "Bring family into the book",
    body: "Invite family to view, add, and share their favorite recipes and memories.",
  },
  {
    icon: LibraryBig,
    title: "Build collections",
    body: "Organize recipes into collections for holidays, quick meals, Sunday dinners, and more.",
  },
];

const AVATARS = [
  { name: "M", color: "#EAC6B8" },
  { name: "G", color: "#DDE5D7" },
  { name: "L", color: "#F5D48D" },
  { name: "A", color: "#E8D5B8" },
];

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

        <section className="relative z-10 mx-auto w-full max-w-[1360px] px-4 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="rounded-[1.35rem] border border-line bg-paper-deep/70 p-4 shadow-soft sm:rounded-[2rem] sm:p-7 lg:p-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-[var(--radius-lg)] border border-line bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
                >
                  <span className="mb-6 grid size-12 place-items-center rounded-[18px] bg-green-soft text-green-deep">
                    <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
                  </span>
                  <h2
                    className="text-xl font-bold leading-tight text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {title}
                  </h2>
                  <p className="mt-3 min-h-24 text-sm leading-relaxed text-ink-muted">
                    {body}
                  </p>
                  <Link
                    href="/sign-up"
                    className="mt-6 inline-flex font-extrabold text-accent-terracotta transition hover:text-green-deep"
                  >
                    Learn more →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-[1220px] px-4 pb-16 pt-2 sm:px-8 lg:px-12">
          <div className="grid overflow-hidden rounded-[1.35rem] border border-line bg-[linear-gradient(135deg,var(--color-card),var(--color-paper-deep))] shadow-[var(--shadow-card)] sm:rounded-[2.3rem] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative p-5 sm:p-8 lg:p-10">
              <Leaf
                aria-hidden="true"
                className="mb-3 text-green-sage sm:mb-5"
                size={40}
                strokeWidth={1.25}
              />
              <blockquote
                className="max-w-xl text-xl font-semibold leading-tight text-green-deep sm:text-3xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                “A recipe has no soul. You, as the cook, must bring soul to the
                recipe.”
              </blockquote>
              <p className="mt-4 text-sm font-bold text-accent-cinnamon sm:text-base">
                – Thomas Keller
              </p>
            </div>

            <div className="relative h-[250px] p-5 sm:h-[300px] sm:p-8 lg:h-auto lg:min-h-[300px]">
              <div className="absolute left-5 right-5 top-5 h-32 overflow-hidden rounded-[18px] bg-green-soft shadow-[var(--shadow-image)] sm:left-auto sm:right-8 sm:top-8 sm:h-48 sm:w-[72%] sm:rounded-[26px] lg:h-56">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,252,246,0.9),transparent_27%),linear-gradient(135deg,#8BA888,#2F4F3F)]" />
                <Camera
                  aria-hidden="true"
                  className="absolute left-4 top-4 text-white-soft/85 sm:left-7 sm:top-7"
                  size={24}
                  strokeWidth={1.4}
                />
                <p
                  className="absolute bottom-4 left-4 right-4 text-base font-bold leading-tight text-white-soft sm:bottom-6 sm:left-7 sm:right-7 sm:text-xl"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Sunday dinner, three generations at the counter
                </p>
              </div>

              <div className="absolute bottom-5 left-5 right-10 rounded-[18px] border border-line bg-white-soft p-3 shadow-[var(--shadow-card)] sm:bottom-7 sm:left-8 sm:right-auto sm:w-[62%] sm:rotate-[-4deg] sm:rounded-[20px] sm:p-4">
                <p
                  className="text-xl leading-snug text-accent-cinnamon sm:text-2xl"
                  style={{ fontFamily: "var(--font-caveat)" }}
                >
                  Apple Pie
                </p>
                <div className="mt-2 space-y-1 text-xs text-ink-muted sm:text-sm">
                  <p>6 cups sliced apples</p>
                  <p>1 tsp ground cinnamon</p>
                  <p>Serve warm after supper.</p>
                </div>
                <div className="mt-2 flex justify-end sm:mt-3">
                  <Leaf
                    aria-hidden="true"
                    className="text-green-sage"
                    size={30}
                    strokeWidth={1.2}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
