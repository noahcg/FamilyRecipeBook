import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  Heart,
  Leaf,
  LibraryBig,
  NotebookPen,
  Soup,
  Star,
  Users,
} from "lucide-react";

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
    <div className="app-paper-bg paper-texture min-h-screen overflow-hidden text-ink">
      <header className="relative z-20 mx-auto flex w-full max-w-[1360px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[18px] border border-line bg-card shadow-soft">
            <Soup
              aria-hidden="true"
              className="text-green-deep"
              size={25}
              strokeWidth={1.8}
            />
          </span>
          <span
            className="text-xl font-semibold leading-none text-green-deep sm:text-2xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Family Recipe Book
          </span>
        </Link>

        <Link
          href="/sign-in"
          className="rounded-full border border-line bg-white-soft px-5 py-3 text-sm font-bold text-green-deep shadow-soft transition hover:bg-card sm:px-6"
        >
          Sign in
        </Link>
      </header>

      <main>
        <section className="relative min-h-[680px] pb-12 pt-8 lg:min-h-[700px] lg:pb-20 lg:pt-8">
          <div className="absolute right-0 top-[-88px] z-0 h-[470px] w-full overflow-hidden opacity-95 [mask-image:linear-gradient(90deg,transparent_0%,black_22%,black_100%)] sm:h-[540px] lg:right-0 lg:top-[-104px] lg:h-[660px] lg:w-[58vw] lg:min-w-[660px]">
            <Image
              src="/images/landing-cookbook-hero.png"
              alt="Open handwritten family recipe book on a warm kitchen counter with apples, herbs, flour, spices, and coffee"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-[70%_48%]"
            />
            <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-cream via-cream/90 to-transparent lg:w-3/5" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cream via-cream/80 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cream/80 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-cream/35 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1360px] px-5 pt-[280px] sm:px-8 sm:pt-[340px] lg:px-12 lg:pt-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white-soft/75 px-4 py-2 text-sm font-bold text-accent-cinnamon shadow-soft">
                <Heart
                  aria-hidden="true"
                  className="fill-accent-terracotta text-accent-terracotta"
                  size={16}
                />
                Recipes, memories, and the people who made them
              </div>

              <h1
                className="text-[3.25rem] font-bold leading-[1.02] tracking-normal text-green-deep sm:text-[4.25rem] lg:text-[5.35rem]"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Made with love.
                <br />
                <span className="font-semibold italic text-accent-terracotta">
                  Shared for generations.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted sm:text-xl">
                Create a family recipe book, save the meals that matter, and
                bring everyone into the story.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
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

        <section className="mx-auto w-full max-w-[1180px] px-5 pb-8 sm:px-8 lg:px-12">
          <div className="grid gap-4 rounded-[var(--radius-xl)] border border-line bg-paper/80 p-4 shadow-soft sm:grid-cols-3 sm:items-center sm:p-5">
            <p
              className="text-xl font-semibold text-green-deep sm:text-2xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              12,000+ family recipes preserved
            </p>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">
              Shared across generations
            </p>
            <div className="flex items-center gap-2 sm:justify-end">
              <span className="flex text-accent-mustard">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    aria-hidden="true"
                    className="fill-current"
                    size={18}
                  />
                ))}
              </span>
              <span className="font-extrabold text-green-deep">
                4.9 average rating
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1220px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="rounded-[2rem] border border-line bg-paper-deep/70 p-5 shadow-soft sm:p-7 lg:p-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-[var(--radius-lg)] border border-line bg-card p-6 shadow-[var(--shadow-card)]"
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

        <section className="mx-auto w-full max-w-[1220px] px-5 pb-24 pt-6 sm:px-8 lg:px-12">
          <div className="grid overflow-hidden rounded-[2.3rem] border border-line bg-[linear-gradient(135deg,var(--color-card),var(--color-paper-deep))] shadow-[var(--shadow-card)] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative p-8 sm:p-12 lg:p-16">
              <Leaf
                aria-hidden="true"
                className="mb-8 text-green-sage"
                size={58}
                strokeWidth={1.25}
              />
              <blockquote
                className="max-w-xl text-3xl font-semibold leading-tight text-green-deep sm:text-4xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                “A recipe has no soul. You, as the cook, must bring soul to the
                recipe.”
              </blockquote>
              <p className="mt-7 text-lg font-bold text-accent-cinnamon">
                – Thomas Keller
              </p>
            </div>

            <div className="relative min-h-[420px] p-8 sm:p-12">
              <div className="absolute right-8 top-10 h-72 w-[72%] overflow-hidden rounded-[28px] bg-green-soft shadow-[var(--shadow-image)] sm:right-14">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,252,246,0.9),transparent_27%),linear-gradient(135deg,#8BA888,#2F4F3F)]" />
                <Camera
                  aria-hidden="true"
                  className="absolute left-8 top-8 text-white-soft/85"
                  size={36}
                  strokeWidth={1.4}
                />
                <p
                  className="absolute bottom-7 left-8 right-8 text-2xl font-bold leading-tight text-white-soft"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Sunday dinner, three generations at the counter
                </p>
              </div>

              <div className="absolute bottom-9 left-7 w-[62%] rotate-[-4deg] rounded-[20px] border border-line bg-white-soft p-6 shadow-[var(--shadow-card)] sm:left-12">
                <p
                  className="text-2xl leading-snug text-accent-cinnamon"
                  style={{ fontFamily: "var(--font-caveat)" }}
                >
                  Apple Pie
                </p>
                <div className="mt-4 space-y-3 text-sm text-ink-muted">
                  <p>6 cups sliced apples</p>
                  <p>1 tsp ground cinnamon</p>
                  <p>Grandma’s note: serve warm after supper.</p>
                </div>
                <div className="mt-5 flex justify-end">
                  <Leaf
                    aria-hidden="true"
                    className="text-green-sage"
                    size={42}
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
