import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MealPlanCalendar } from "@/components/meal-plan/MealPlanCalendar";
import { getHouseholdId, getMealPlanWeek } from "@/lib/actions/households";
import { getBookRecipes } from "@/lib/actions/recipes";

interface Props {
  params: Promise<{ bookId: string }>;
}

function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default async function MealPlanPage({ params }: Props) {
  const { bookId } = await params;

  const [householdId, recipes] = await Promise.all([
    getHouseholdId(),
    getBookRecipes(bookId),
  ]);

  if (!householdId) notFound();

  const weekStart = getMondayOfCurrentWeek();
  const mealPlans = await getMealPlanWeek(householdId, weekStart);

  return (
    <AppShell bookId={bookId}>
      <MealPlanCalendar
        householdId={householdId}
        initialWeekStart={weekStart}
        initialMealPlans={mealPlans}
        recipes={recipes}
      />
    </AppShell>
  );
}
