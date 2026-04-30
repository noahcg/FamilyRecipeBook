"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type {
  ActionResult,
  Household,
  HouseholdMember,
  MealPlan,
  MealSlot,
} from "@/lib/types";

// ─── Household ────────────────────────────────────────────────

export async function getMyHousehold(): Promise<Household | null> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return null;

  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("id", membership.household_id)
    .single();

  return household ?? null;
}

export async function getHouseholdId(): Promise<string | null> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  return data?.household_id ?? null;
}

export async function getHouseholdMembers(
  householdId: string
): Promise<(HouseholdMember & { profile: { full_name: string | null; avatar_url: string | null } })[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("household_members")
    .select("*, profile:profiles(full_name, avatar_url)")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  return (data ?? []) as (HouseholdMember & {
    profile: { full_name: string | null; avatar_url: string | null };
  })[];
}

// ─── Meal Plans ───────────────────────────────────────────────

export async function getMealPlanWeek(
  householdId: string,
  weekStart: string
): Promise<(MealPlan & { recipe: { title: string; photo_url: string | null } | null })[]> {
  const supabase = await createClient();

  // weekStart is a YYYY-MM-DD Monday; fetch 7 days
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("meal_plans")
    .select("*, recipe:recipes(title, photo_url)")
    .eq("household_id", householdId)
    .gte("planned_date", weekStart)
    .lte("planned_date", weekEndStr)
    .order("planned_date", { ascending: true });

  return (data ?? []) as (MealPlan & {
    recipe: { title: string; photo_url: string | null } | null;
  })[];
}

export async function setMealPlan(
  householdId: string,
  recipeId: string,
  plannedDate: string,
  slot: MealSlot
): Promise<ActionResult<MealPlan>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meal_plans")
    .upsert(
      {
        household_id: householdId,
        recipe_id: recipeId,
        planned_date: plannedDate,
        meal_slot: slot,
        created_by: user.id,
      },
      { onConflict: "household_id,planned_date,meal_slot" }
    )
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Could not save meal plan." };
  }

  return { success: true, data: data as MealPlan };
}

export async function removeMealPlan(
  householdId: string,
  plannedDate: string,
  slot: MealSlot
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("meal_plans")
    .delete()
    .eq("household_id", householdId)
    .eq("planned_date", plannedDate)
    .eq("meal_slot", slot);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
