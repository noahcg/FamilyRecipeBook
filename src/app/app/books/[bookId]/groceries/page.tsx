import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GroceryList } from "@/components/grocery/GroceryList";
import { getHouseholdId } from "@/lib/actions/households";
import { getGroceryItems } from "@/lib/actions/grocery";

interface Props {
  params: Promise<{ bookId: string }>;
}

function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default async function GroceriesPage({ params }: Props) {
  const { bookId } = await params;

  const householdId = await getHouseholdId();
  if (!householdId) notFound();

  const [items] = await Promise.all([getGroceryItems(householdId)]);

  return (
    <AppShell bookId={bookId}>
      <GroceryList
        householdId={householdId}
        initialItems={items}
        currentWeekStart={getMondayOfCurrentWeek()}
      />
    </AppShell>
  );
}
