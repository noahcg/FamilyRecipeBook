import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GroceryList } from "@/components/grocery/GroceryList";
import { getHouseholdId } from "@/lib/actions/households";
import { getGroceryItems } from "@/lib/actions/grocery";
import { assertFeatureAccess, EntitlementError } from "@/lib/entitlements";
import { requireUser } from "@/lib/auth";

function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default async function GroceriesPage() {
  const user = await requireUser();
  try { await assertFeatureAccess(user.id, "grocery"); }
  catch (error) { if (error instanceof EntitlementError) redirect("/pricing"); throw error; }
  const householdId = await getHouseholdId();
  if (!householdId) notFound();

  const items = await getGroceryItems(householdId);

  return (
    <AppShell>
      <GroceryList
        householdId={householdId}
        initialItems={items}
        currentWeekStart={getMondayOfCurrentWeek()}
      />
    </AppShell>
  );
}
