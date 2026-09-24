import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MealPlanCalendar } from "@/components/meal-plan/MealPlanCalendar";
import { getHouseholdId, getMealPlanWeek } from "@/lib/actions/households";
import { getAllUserRecipes } from "@/lib/actions/recipes";
import { assertFeatureAccess, EntitlementError } from "@/lib/entitlements";
import { requireUser } from "@/lib/auth";

function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default async function MealPlanPage() {
  const user = await requireUser();
  try { await assertFeatureAccess(user.id, "mealPlanner"); }
  catch (error) { if (error instanceof EntitlementError) redirect("/pricing"); throw error; }
  const [householdId, recipes] = await Promise.all([getHouseholdId(), getAllUserRecipes()]);

  if (!householdId) notFound();

  const weekStart = getMondayOfCurrentWeek();
  const mealPlans = await getMealPlanWeek(householdId, weekStart);

  // The planner spans every cookbook; carry each recipe's book so detail links
  // resolve to the right place.
  const pickerRecipes = recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    photo_url: recipe.photo_url,
    category: recipe.category,
    bookId: recipe.bookId,
  }));

  return (
    <AppShell>
      <MealPlanCalendar
        householdId={householdId}
        initialWeekStart={weekStart}
        initialMealPlans={mealPlans}
        recipes={pickerRecipes}
      />
    </AppShell>
  );
}
