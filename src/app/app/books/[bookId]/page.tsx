import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Lightbulb,
  Plus,
  Refrigerator,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { TimeOfDayHeadline } from "@/components/home/TimeOfDayHeadline";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { getBookPageData } from "@/lib/actions/books";
import type { Recipe } from "@/lib/types";

interface Props {
  params: Promise<{ bookId: string }>;
}

interface HomeRecipe extends Recipe {
  creator: { full_name: string } | null;
  loveCount?: number;
}

const RECIPE_THEMES = ["quick weeknights", "family favorites", "make-ahead", "something new", "comfort meals"];
const WEEK_DAYS = [
  { day: "M", planned: true },
  { day: "T", planned: true },
  { day: "W", planned: false },
  { day: "T", planned: true },
  { day: "F", planned: false },
  { day: "S", planned: false },
  { day: "S", planned: true },
];

function DashboardCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`recipe-card ${className}`}>
      {children}
    </section>
  );
}

function PageSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-line-soft pb-6 last:border-b-0 ${className}`}>
      {children}
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
      {children}
    </p>
  );
}

function QuickAction({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 border-b border-line-soft px-1 py-3 transition-colors last:border-b-0 hover:text-green-deep"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-paper-warm text-green-deep">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-ink">{label}</span>
        <span className="block truncate text-xs text-ink-muted">{detail}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-baseline gap-4">
      <div className="shrink-0">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <h2
          className="mt-1 text-xl font-bold leading-tight text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h2>
      </div>
      <span className="h-px flex-1 bg-line-soft" />
    </div>
  );
}

export default async function BookHomePage({ params }: Props) {
  const { bookId } = await params;
  const data = await getBookPageData(bookId);
  if (!data) notFound();

  const { book, recent } = data;
  const latestRecipe = (recent as HomeRecipe[])[0] ?? null;
  const hasRecipes = latestRecipe !== null;
  const featuredTitle = latestRecipe?.title ?? "";
  const featuredHref = latestRecipe
    ? `/app/books/${bookId}/recipes/${latestRecipe.id}`
    : `/app/books/${bookId}/ideas`;
  const featuredImage = latestRecipe?.photo_url ?? "/images/entry/add-first.jpg";

  return (
    <AppShell bookId={bookId}>
      <div className="relative min-h-dvh overflow-hidden px-2.5 py-5 min-[360px]:px-3 min-[425px]:px-4 sm:px-5 lg:rounded-tr-xl lg:px-8 lg:py-8">
        <div
          className="pointer-events-none absolute right-0 top-0 z-0 h-[430px] w-full overflow-hidden sm:h-[500px] lg:right-[-8rem] lg:top-[-9rem] lg:h-[470px] lg:w-[55vw] lg:min-w-[660px]"
          style={{
            maskImage: [
              "linear-gradient(to right, transparent 0%, black 22%)",
              "linear-gradient(to top, transparent 0%, black 18%)",
            ].join(", "),
            WebkitMaskImage: [
              "linear-gradient(to right, transparent 0%, black 22%)",
              "linear-gradient(to top, transparent 0%, black 18%)",
            ].join(", "),
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            maskSize: "100% 100%, 100% 100%",
            maskRepeat: "no-repeat",
          }}
        >
          <Image
            src="/images/landing-cookbook-hero.png"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover object-[74%_34%] opacity-[0.42] sm:object-[70%_48%] min-[993px]:opacity-80"
            aria-hidden="true"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(247,243,233,0.08)_0%,rgba(247,243,233,0.38)_24%,rgba(247,243,233,0.82)_48%,var(--color-cream)_76%)] min-[993px]:bg-[linear-gradient(to_bottom,rgba(247,243,233,0)_0%,rgba(247,243,233,0.16)_58%,var(--color-cream)_100%)] lg:hidden"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden bg-[linear-gradient(to_right,var(--color-cream)_0%,rgba(247,243,233,0.58)_24%,rgba(247,243,233,0)_56%),linear-gradient(to_bottom,rgba(247,243,233,0)_0%,rgba(247,243,233,0)_48%,rgba(247,243,233,0.72)_78%,var(--color-cream)_100%)] lg:block"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-cream)_0%,rgba(247,243,233,0.92)_20%,rgba(247,243,233,0.42)_58%,rgba(247,243,233,0.04)_100%)] sm:hidden"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-[1240px]">
          <header className="mb-3">
            <div className="relative min-h-[300px] py-4 min-[425px]:min-h-[340px] min-[425px]:py-5 sm:px-6 lg:min-h-[300px] lg:px-2 lg:py-7">
              <div className="relative max-w-[980px]">
                <Link
                  href={`/app/books/${bookId}`}
                  className="-mt-2 mb-7 block w-[8.75rem] opacity-90 lg:hidden"
                  aria-label="Home Cooked home"
                >
                  <Image
                    src="/images/homecooked.svg"
                    alt=""
                    width={180}
                    height={96}
                    className="h-auto w-full"
                  />
                </Link>
                <SectionEyebrow>{book.title}</SectionEyebrow>
                <TimeOfDayHeadline />

                <div className="mt-5 flex flex-wrap gap-2 min-[425px]:mt-7 min-[425px]:gap-3">
                  {[
                    ["Cook with what I have", `/app/books/${bookId}/ideas`],
                    ["Quick meals", `/app/books/${bookId}/ideas`],
                    ["Plan the week", `/app/books/${bookId}/meal-plan`],
                    ["Surprise me", `/app/books/${bookId}/ideas`],
                  ].map(([label, href], index) => (
                    <Link
                      key={label}
                      href={href}
                      className={`inline-flex min-h-10 items-center rounded-full border px-3 text-xs font-extrabold shadow-xs transition-colors min-[425px]:min-h-11 min-[425px]:px-4 min-[425px]:text-sm ${
                        index === 0
                          ? "border-green-deep bg-green-deep text-ink-inverse hover:bg-green-forest-dark"
                          : "border-line bg-white-soft/80 text-green-deep hover:bg-card"
                      }`}
                    >
                      {label} <span className="ml-2" aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <div className="space-y-6">
              <DashboardCard className="overflow-hidden">
                <div className="grid lg:min-h-[320px] lg:grid-cols-[minmax(0,1fr)_38%]">
                  <div className="flex flex-col justify-between p-3.5 min-[425px]:p-4 sm:p-6">
                    <div>
                      <SectionEyebrow>
                        {hasRecipes ? "Recipe pick" : "Welcome"}
                      </SectionEyebrow>
                      <h2
                        className="mt-2 max-w-2xl text-[1.35rem] font-bold leading-tight text-green-deep min-[425px]:text-2xl sm:text-3xl lg:text-4xl"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {hasRecipes ? featuredTitle : "Your cookbook is ready"}
                      </h2>
                      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted min-[425px]:mt-3">
                        {hasRecipes
                          ? "A practical choice to get you cooking without digging through the whole book. Open it, adjust what you need, and keep moving."
                          : "Save the dishes your family keeps asking for, or ask for an idea to get the first page started."}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 min-[425px]:mt-5">
                      {hasRecipes ? (
                        <Link href={featuredHref}>
                          <Button variant="primary" size="sm" className="rounded-md">
                            <UtensilsCrossed size={17} />
                            Start cooking
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Link href={`/app/books/${bookId}/recipes/new`}>
                            <Button variant="primary" size="sm" className="rounded-md">
                              <Plus size={17} />
                              Add a recipe
                            </Button>
                          </Link>
                          <Link href={`/app/books/${bookId}/ideas`}>
                            <Button variant="secondary" size="sm" className="rounded-md">
                              <Sparkles size={17} />
                              Get an idea
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative h-44 max-h-[240px] overflow-hidden bg-green-pale min-[425px]:h-48 sm:h-60 lg:h-auto lg:max-h-none lg:min-h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImage}
                      alt=""
                      className="h-full w-full object-cover"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-sm bg-card/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon backdrop-blur-sm">
                      {hasRecipes ? "Featured recipe" : "A fresh start"}
                    </span>
                  </div>
                </div>
              </DashboardCard>

              {hasRecipes && (
                <div className="grid gap-9 border-y border-line-soft py-9 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10">
                  <section className="border-line-soft lg:border-r lg:pr-10">
                    <SectionHeader eyebrow="Smart kitchen notes" title="Helpful cues" />
                    <div className="mt-5 space-y-5">
                      <div className="flex gap-4">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent-honey/20 text-accent-cinnamon">
                          <CalendarDays size={17} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-ink">A planning gap is coming up.</p>
                          <p className="mt-0.5 text-sm text-ink-muted">Choose one reliable recipe before the week fills in.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-green-soft text-green-deep">
                          <ShoppingCart size={17} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-ink">One saved favorite is ready to shop.</p>
                          <p className="mt-0.5 text-sm text-ink-muted">Review the list before your next grocery run.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="lg:pl-1">
                    <SectionHeader eyebrow="Pick up where you left off" title="Continue cooking" />
                    <div className="mt-5 flex w-full min-w-0 max-w-full flex-nowrap items-start gap-5 overflow-hidden">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-green-pale">
                        {latestRecipe?.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={latestRecipe.photo_url} alt="" className="h-full w-full object-cover" aria-hidden="true" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpenFallback />
                          </div>
                        )}
                      </div>
                      <div className="w-[calc(100%-6.25rem)] min-w-0 max-w-[calc(100%-6.25rem)] overflow-hidden">
                        <h3
                          className="block w-full max-w-full text-xl font-bold text-green-deep"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          {latestRecipe?.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                          {latestRecipe?.description}
                        </p>
                        <Link href={featuredHref} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-green-deep hover:underline">
                          Continue <ChevronRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              <PageSection>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <SectionEyebrow>Browse by feel</SectionEyebrow>
                    <h2
                      className="mt-2 text-xl font-bold text-green-deep"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      Find the right kind of recipe
                    </h2>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[min(520px,100%)]">
                    {[
                      ["Comfort", "warm and cozy"],
                      ["Quick", "under 30"],
                      ["Fresh", "bright and light"],
                      ["Something New", "surprise me"],
                    ].map(([label, hint]) => (
                      <Link
                        key={label}
                        href={`/app/books/${bookId}/ideas`}
                        className="rounded-sm border border-line-soft bg-white-soft/70 px-3 py-3 text-sm font-bold text-green-deep transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-green-sage/40 hover:bg-green-pale"
                      >
                        {label}
                        <span className="mt-0.5 block text-xs font-semibold text-ink-soft">{hint}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </PageSection>
            </div>

            <aside className="space-y-6 xl:border-l xl:border-line-soft xl:pl-6">
              <PageSection>
                <SectionHeader eyebrow="Quick actions" title="Next move" />
                <div className="mt-4 space-y-1">
                  <QuickAction href={`/app/books/${bookId}/recipes/new`} icon={<Plus size={19} />} label="Add Recipe" detail="Save something worth finding again" />
                  <QuickAction href={`/app/books/${bookId}/ideas`} icon={<Sparkles size={19} />} label="Get Ideas" detail="Turn a loose craving into a recipe" />
                  <QuickAction href={`/app/books/${bookId}/meal-plan`} icon={<CalendarDays size={19} />} label="Plan Week" detail="Pick the meals you want ready" />
                  <QuickAction href={`/app/books/${bookId}/groceries`} icon={<ShoppingCart size={19} />} label="Groceries" detail="Review what your recipes need" />
                </div>
              </PageSection>

              <PageSection>
                <SectionHeader eyebrow="Recipe paths" title="Start somewhere useful" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {RECIPE_THEMES.map((item) => (
                    <span key={item} className="rounded-sm bg-green-pale px-3 py-1 text-sm font-semibold text-green-deep">
                      {item}
                    </span>
                  ))}
                </div>
                <Link href={`/app/books/${bookId}/ideas`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-green-deep hover:underline">
                  Browse recipe ideas <ChevronRight size={15} />
                </Link>
              </PageSection>

              {hasRecipes && (
                <PageSection>
                  <SectionHeader eyebrow="Weekly snapshot" title="The week ahead" />
                  <p className="mt-2 text-xl font-bold leading-snug text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                    3 meals planned · 2 open days
                  </p>
                  <div className="mt-4 grid grid-cols-7 gap-1.5">
                    {WEEK_DAYS.map((item, index) => (
                      <Link
                        key={`${item.day}-${index}`}
                        href={`/app/books/${bookId}/meal-plan`}
                        className={`flex aspect-square items-center justify-center rounded-sm text-xs font-bold ${
                          item.planned
                            ? "bg-green-deep text-ink-inverse"
                            : "border border-dashed border-line text-ink-soft"
                        }`}
                      >
                        {item.day}
                      </Link>
                    ))}
                  </div>
                </PageSection>
              )}

              <DashboardCard className="overflow-hidden">
                <div className="p-5">
                  <SectionEyebrow>Inspiration</SectionEyebrow>
                  <h2
                    className="mt-2 text-xl font-bold leading-tight text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    Make Sunday feel special
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    Ask for a slow, generous dinner that still leaves room for leftovers.
                  </p>
                  <Link href={`/app/books/${bookId}/ideas`}>
                    <Button variant="secondary" size="sm" className="mt-4 rounded-md">
                      <Lightbulb size={15} />
                      Get inspired
                    </Button>
                  </Link>
                </div>
                <div className="h-2 bg-gradient-to-r from-accent-honey via-accent-terracotta to-green-sage" />
              </DashboardCard>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function BookOpenFallback() {
  return <Refrigerator size={28} strokeWidth={1.3} className="text-green-sage" />;
}
