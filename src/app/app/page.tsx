import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Heart,
  Plus,
  Refrigerator,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { TimeOfDayHeadline } from "@/components/home/TimeOfDayHeadline";
import { AppShell } from "@/components/layout/AppShell";
import { CookbookBadge } from "@/components/recipe/CookbookBadge";
import { Button } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFirstBookId } from "@/lib/actions/books";
import { getAccountRecentRecipes } from "@/lib/actions/recipes";
import { getHouseholdId, getMealPlanWeek } from "@/lib/actions/households";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const QUICK_PICK_POOL: ReadonlyArray<readonly [string, string]> = [
  ["Dinner tonight", "Something to make for dinner tonight."],
  ["Make-ahead for the week", "A meal I can make ahead and eat throughout the week."],
  ["Weekend project", "A weekend cooking project — something a bit more involved that's worth the time."],
  ["Comfort food", "Cozy comfort food."],
  ["Use what's in the fridge", "Help me use up what's already in my fridge."],
  ["Under 30 minutes", "A dinner I can put together in under 30 minutes."],
  ["Kid-friendly", "Something the whole family — including picky kids — will eat."],
  ["One-pan or one-pot", "A meal that comes together in one pan or one pot."],
  ["Sheet-pan dinner", "A sheet-pan dinner I can roast all at once."],
  ["Pantry raid", "A meal built mostly from pantry staples."],
  ["Big-batch leftovers", "Something that makes great leftovers for the next few days."],
  ["Cozy soup or stew", "A cozy soup or stew for tonight."],
  ["Slow-cooked", "A slow-cooked meal I can start early and forget about."],
  ["Try something new", "A new-to-me recipe that's a little outside our usual rotation."],
  ["Light and fresh", "Something light and fresh — lots of vegetables, not too heavy."],
  ["Bake something sweet", "A simple sweet bake or dessert."],
] as const;

function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function pickWeekly<T>(pool: ReadonlyArray<T>, seed: string, n: number): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function DashboardCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`recipe-card ${className}`}>{children}</section>;
}

function PageSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`border-b border-line-soft pb-6 last:border-b-0 ${className}`}>{children}</section>;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">{children}</p>;
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

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-4">
      <div className="shrink-0">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <h2 className="mt-1 text-xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
          {title}
        </h2>
      </div>
      <span className="h-px flex-1 bg-line-soft" />
    </div>
  );
}

export default async function AppHomePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [recent, householdId, firstBookId, favoritesCountRes] = await Promise.all([
    getAccountRecentRecipes(6),
    getHouseholdId(),
    getFirstBookId(),
    supabase
      .from("recipe_reactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "favorite"),
  ]);

  const latestRecipe = recent[0] ?? null;
  const hasRecipes = latestRecipe !== null;
  const featuredHref = latestRecipe
    ? `/app/books/${latestRecipe.bookId}/recipes/${latestRecipe.id}`
    : "/app/ideas";
  const featuredImage = latestRecipe?.photo_url ?? "/images/entry/add-first.jpg";
  const addRecipeHref = firstBookId ? `/app/books/${firstBookId}/recipes/new` : "/onboarding/create-book";

  // Real meal-plan data for Weekly snapshot + Helpful cues
  const weekStart = getMondayOfCurrentWeek();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekMealPlans = householdId ? await getMealPlanWeek(householdId, weekStart) : [];
  const plannedDates = new Set(weekMealPlans.map((m) => m.planned_date));
  const daysWithMeals = weekDates.filter((d) => plannedDates.has(d)).length;
  const totalMealsPlanned = weekMealPlans.length;
  const openDays = 7 - daysWithMeals;
  const hasAnyMealPlanned = totalMealsPlanned > 0;
  const totalFavorites = favoritesCountRes.count ?? 0;

  const mealPlanCue = !hasAnyMealPlanned
    ? { title: "Your week is wide open.", body: "Plan a meal so the table feels less rushed." }
    : openDays > 0
    ? {
        title: `${openDays} day${openDays === 1 ? "" : "s"} still open this week.`,
        body: "Fill the gap before the week catches up.",
      }
    : { title: "The week is fully planned.", body: "Open the meal plan if you need to swap something." };

  const recipeCue = !hasRecipes
    ? { title: "You haven't added a recipe yet.", body: "Add one everyone asks for so your collection can start growing." }
    : totalFavorites === 0
    ? { title: "No favorites marked yet.", body: "Save the recipes you'll cook again so they're easy to find." }
    : {
        title: `${totalFavorites} favorite${totalFavorites === 1 ? "" : "s"} saved.`,
        body: "Open one to add it to this week's plan.",
      };

  const weeklyQuickPicks = pickWeekly(QUICK_PICK_POOL, weekStart, 4);

  return (
    <AppShell>
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
                <Link href="/app" className="-mt-2 mb-7 block w-[8.75rem] opacity-90 lg:hidden" aria-label="Home Cooked home">
                  <Image src="/images/homecooked.svg" alt="" width={180} height={96} className="h-auto w-full" />
                </Link>
                <SectionEyebrow>Home Cooked</SectionEyebrow>
                <TimeOfDayHeadline />

                <div className="mt-5 flex flex-wrap gap-2 min-[425px]:mt-7 min-[425px]:gap-2.5">
                  {weeklyQuickPicks.map(([label, promptText], index) => (
                    <Link
                      key={label}
                      href={`/app/ideas?prompt=${encodeURIComponent(promptText)}`}
                      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-extrabold shadow-xs transition-colors min-[425px]:min-h-10 min-[425px]:px-3.5 ${
                        index === 0
                          ? "border-green-deep bg-green-deep text-ink-inverse hover:bg-green-forest-dark"
                          : "border-line bg-white-soft/80 text-green-deep hover:bg-card"
                      }`}
                    >
                      {label} <span className="ml-2" aria-hidden="true">→</span>
                    </Link>
                  ))}
                  <Link
                    href="/app/ideas?surprise=1"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent-cinnamon/40 bg-accent-honey/15 px-3 text-xs font-extrabold text-accent-cinnamon shadow-xs transition-colors hover:bg-accent-honey/25 min-[425px]:min-h-10 min-[425px]:px-3.5"
                  >
                    <Sparkles size={13} aria-hidden="true" />
                    Get Inspired
                  </Link>
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
                      <SectionEyebrow>{hasRecipes ? "Recipe pick" : "Welcome"}</SectionEyebrow>
                      <h2
                        className="mt-2 max-w-2xl text-[1.35rem] font-bold leading-tight text-green-deep min-[425px]:text-2xl sm:text-3xl lg:text-4xl"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {hasRecipes ? latestRecipe!.title : "Your kitchen is ready"}
                      </h2>
                      {hasRecipes && (
                        <div className="mt-3">
                          <CookbookBadge title={latestRecipe!.bookTitle} />
                        </div>
                      )}
                      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted min-[425px]:mt-3">
                        {hasRecipes
                          ? "The most recent recipe you added — pick up right where you left off, adjust what you need, and keep moving."
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
                          <Link href={addRecipeHref}>
                            <Button variant="primary" size="sm" className="rounded-md">
                              <Plus size={17} />
                              Add a recipe
                            </Button>
                          </Link>
                          <Link href="/app/ideas">
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
                    <img src={featuredImage} alt="" className="h-full w-full object-cover" aria-hidden="true" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-sm bg-card/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon backdrop-blur-sm">
                      {hasRecipes ? "Most recent" : "A fresh start"}
                    </span>
                  </div>
                </div>
              </DashboardCard>

              <div className="grid gap-9 border-y border-line-soft py-9 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10">
                <section className="border-line-soft lg:border-r lg:pr-10">
                  <SectionHeader eyebrow="Smart kitchen notes" title="Helpful cues" />
                  <div className="mt-5 space-y-5">
                    <div className="flex gap-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent-honey/20 text-accent-cinnamon">
                        <CalendarDays size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">{mealPlanCue.title}</p>
                        <p className="mt-0.5 text-sm text-ink-muted">{mealPlanCue.body}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-green-soft text-green-deep">
                        <Heart size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">{recipeCue.title}</p>
                        <p className="mt-0.5 text-sm text-ink-muted">{recipeCue.body}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="lg:pl-1">
                  <SectionHeader eyebrow="Pick up where you left off" title="Continue cooking" />
                  {hasRecipes ? (
                    <div className="mt-5 flex w-full min-w-0 max-w-full flex-nowrap items-start gap-5 overflow-hidden">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-green-pale">
                        {latestRecipe!.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={latestRecipe!.photo_url} alt="" className="h-full w-full object-cover" aria-hidden="true" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpenFallback />
                          </div>
                        )}
                      </div>
                      <div className="w-[calc(100%-6.25rem)] min-w-0 max-w-[calc(100%-6.25rem)] overflow-hidden">
                        <h3 className="block w-full max-w-full text-xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                          {latestRecipe!.title}
                        </h3>
                        <div className="mt-1.5">
                          <CookbookBadge title={latestRecipe!.bookTitle} />
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                          {latestRecipe!.description}
                        </p>
                        <Link href={featuredHref} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-green-deep hover:underline">
                          Continue <ChevronRight size={15} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex w-full min-w-0 max-w-full flex-nowrap items-start gap-5 overflow-hidden">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-green-pale">
                        <BookOpenFallback />
                      </div>
                      <div className="w-[calc(100%-6.25rem)] min-w-0 max-w-[calc(100%-6.25rem)] overflow-hidden">
                        <h3 className="block w-full max-w-full text-xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                          Nothing to continue yet
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                          Add a recipe and we&rsquo;ll keep the most recent one handy here.
                        </p>
                        <Link href={addRecipeHref} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-green-deep hover:underline">
                          Add a recipe <ChevronRight size={15} />
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <PageSection>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <SectionEyebrow>Browse by effort</SectionEyebrow>
                    <h2 className="mt-2 text-xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                      Find a recipe that fits the day
                    </h2>
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[min(520px,100%)]">
                    {[
                      ["Quick", "under 30 minutes", "quick"],
                      ["Few Steps", "easy to follow", "few-steps"],
                      ["Few Ingredients", "short shopping list", "few-ingredients"],
                    ].map(([label, hint, filter]) => (
                      <Link
                        key={label}
                        href={`/app/recipes?filter=${filter}`}
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
                  <QuickAction href={addRecipeHref} icon={<Plus size={19} />} label="Add Recipe" detail="Save something worth finding again" />
                  <QuickAction href="/app/ideas" icon={<Sparkles size={19} />} label="Get Ideas" detail="Turn a loose craving into a recipe" />
                  <QuickAction href="/app/meal-plan" icon={<CalendarDays size={19} />} label="Plan Week" detail="Pick the meals you want ready" />
                  <QuickAction href="/app/groceries" icon={<ShoppingCart size={19} />} label="Groceries" detail="Review what your recipes need" />
                </div>
              </PageSection>

              <PageSection>
                <SectionHeader eyebrow="Weekly snapshot" title="The week ahead" />
                {hasAnyMealPlanned ? (
                  <p className="mt-2 text-xl font-bold leading-snug text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                    {totalMealsPlanned} meal{totalMealsPlanned === 1 ? "" : "s"} planned · {openDays} open day{openDays === 1 ? "" : "s"}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    No meals planned this week yet. Set one up so the table feels less rushed.
                  </p>
                )}
                <div className="mt-4 grid grid-cols-7 gap-1.5">
                  {weekDates.map((date, index) => {
                    const planned = plannedDates.has(date);
                    return (
                      <Link
                        key={date}
                        href="/app/meal-plan"
                        className={`flex aspect-square items-center justify-center rounded-sm text-xs font-bold ${
                          planned ? "bg-green-deep text-ink-inverse" : "border border-dashed border-line text-ink-soft"
                        }`}
                      >
                        {DAY_LETTERS[index]}
                      </Link>
                    );
                  })}
                </div>
                {!hasAnyMealPlanned && (
                  <Link href="/app/meal-plan" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-green-deep hover:underline">
                    Plan a meal <ChevronRight size={15} />
                  </Link>
                )}
              </PageSection>
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
