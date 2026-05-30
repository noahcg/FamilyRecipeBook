import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Heart,
  Library,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CookbookBadge } from "@/components/recipe/CookbookBadge";
import { EmptyState } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllUserRecipes } from "@/lib/actions/recipes";
import { getHouseholdId, getMealPlanWeek } from "@/lib/actions/households";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const RECENT_LIMIT = 6;

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

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(fullName: string | null | undefined): string | null {
  const trimmed = fullName?.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : null;
}

export default async function AppHomePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, recipes, householdId, favoritesCountRes] = await Promise.all([
    getProfile(),
    getAllUserRecipes(),
    getHouseholdId(),
    supabase
      .from("recipe_reactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "favorite"),
  ]);

  const weekStart = getMondayOfCurrentWeek();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekMealPlans = householdId ? await getMealPlanWeek(householdId, weekStart) : [];
  const plannedDates = new Set(weekMealPlans.map((m) => m.planned_date));
  const totalMealsPlanned = weekMealPlans.length;
  const openDays = 7 - weekDates.filter((d) => plannedDates.has(d)).length;
  const hasAnyMealPlanned = totalMealsPlanned > 0;

  const recentlyAdded = [...recipes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, RECENT_LIMIT);
  const bookCount = new Set(recipes.map((r) => r.bookId)).size;
  const favoritesCount = favoritesCountRes.count ?? 0;
  const name = firstName(profile?.full_name);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">Home Cooked</p>
          <h1
            className="mt-2 text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {greeting()}{name ? `, ${name}` : ""}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
            {recipes.length > 0
              ? `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} across ${bookCount} ${bookCount === 1 ? "cookbook" : "cookbooks"}. Here's what's cooking.`
              : "Your kitchen at a glance. Add recipes to any cookbook and they'll gather here."}
          </p>
        </header>

        {recipes.length === 0 ? (
          <EmptyState
            title="Add your first recipe"
            description="Open a cookbook and save a recipe — everything you add shows up here and in My Recipes."
            icon={<UtensilsCrossed size={32} />}
            action={
              <Link
                href="/app/cookbooks"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-green-deep px-5 text-sm font-bold text-ink-inverse transition-colors hover:bg-green-forest-dark"
              >
                <Library size={16} /> Go to your cookbooks
              </Link>
            }
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0">
              <section className="recipe-card p-5 sm:p-6">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h2
                    className="text-2xl font-bold text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    Recently added
                  </h2>
                  <Link
                    href="/app/recipes"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-green-deep hover:underline"
                  >
                    My Recipes <ChevronRight size={15} />
                  </Link>
                </div>
                <ol className="divide-y divide-line-soft">
                  {recentlyAdded.map((recipe) => (
                    <li key={recipe.id}>
                      <Link
                        href={`/app/books/${recipe.bookId}/recipes/${recipe.id}`}
                        className="group grid gap-2 py-3.5 outline-none transition-colors hover:bg-card/50 focus-visible:bg-card/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <span className="min-w-0">
                          <span
                            className="block truncate text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-green-deep group-focus-visible:text-green-deep"
                            style={{ fontFamily: "var(--font-playfair)" }}
                          >
                            {recipe.title}
                          </span>
                          {recipe.category && (
                            <span className="text-sm text-ink-muted">{recipe.category}</span>
                          )}
                        </span>
                        <CookbookBadge title={recipe.bookTitle} className="sm:justify-self-end" />
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            </main>

            <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              <section className="recipe-card p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">Weekly snapshot</p>
                <h3
                  className="mt-1 text-xl font-bold leading-snug text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  The week ahead
                </h3>
                <p className="mt-2 text-sm text-ink">
                  {hasAnyMealPlanned
                    ? `${totalMealsPlanned} meal${totalMealsPlanned === 1 ? "" : "s"} planned · ${openDays} open day${openDays === 1 ? "" : "s"}`
                    : "No meals planned this week yet."}
                </p>
                <div className="mt-4 grid grid-cols-7 gap-1.5">
                  {weekDates.map((date, index) => {
                    const planned = plannedDates.has(date);
                    return (
                      <Link
                        key={date}
                        href="/app/meal-plan"
                        className={`flex aspect-square items-center justify-center rounded-sm text-xs font-bold ${
                          planned
                            ? "bg-green-deep text-ink-inverse"
                            : "border border-dashed border-line text-ink-soft"
                        }`}
                      >
                        {DAY_LETTERS[index]}
                      </Link>
                    );
                  })}
                </div>
                <Link
                  href="/app/meal-plan"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-green-deep hover:underline"
                >
                  {hasAnyMealPlanned ? "Open meal plan" : "Plan a meal"}
                  <ChevronRight size={15} />
                </Link>
              </section>

              <section className="recipe-card p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">Quick links</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {[
                    { href: "/app/recipes", label: "My Recipes", icon: UtensilsCrossed },
                    { href: "/app/meal-plan", label: "Meal Plan", icon: CalendarDays },
                    { href: "/app/groceries", label: "Groceries", icon: ShoppingCart },
                    { href: "/app/favorites", label: `Favorites${favoritesCount ? ` (${favoritesCount})` : ""}`, icon: Heart },
                  ].map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex min-h-11 items-center gap-2.5 rounded-md border border-line-soft bg-white-soft/70 px-3 text-sm font-bold text-green-deep transition-colors hover:border-green-sage/40 hover:bg-green-pale"
                    >
                      <Icon size={16} strokeWidth={1.9} className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
