"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ActionResult, GroceryItem } from "@/lib/types";

// ─── Category inference ───────────────────────────────────────
// Isolated so it can be swapped for an AI call later without
// touching any other logic. Matches standardized store-section
// names used in the GroceryItem.category field.

const CATEGORY_RULES: [string, string[]][] = [
  ["Produce",        ["apple","banana","carrot","onion","garlic","tomato","lettuce","spinach","potato","pepper","celery","cucumber","lemon","lime","orange","berry","berries","mushroom","broccoli","zucchini","eggplant","avocado","kale","arugula","cabbage","corn","pea","asparagus","herb","basil","parsley","cilantro","mint","thyme","rosemary","sage","ginger","jalapeño","scallion","shallot","leek","fennel","radish","beet","turnip","squash","pumpkin"]],
  ["Meat & Seafood", ["chicken","beef","pork","lamb","turkey","salmon","shrimp","fish","tuna","steak","ground","bacon","sausage","ham","crab","lobster","scallop","clam","mussel","anchovy","prosciutto","pancetta","chorizo","duck","veal","bison"]],
  ["Dairy & Eggs",   ["milk","cheese","butter","egg","cream","yogurt","sour cream","heavy cream","half-and-half","parmesan","mozzarella","cheddar","ricotta","feta","brie","gouda","cream cheese","whipped cream","ghee","kefir","buttermilk"]],
  ["Bakery & Bread", ["bread","baguette","roll","bagel","muffin","croissant","tortilla","pita","naan","sourdough","rye","ciabatta","flour tortilla"]],
  ["Pantry",         ["flour","sugar","salt","pepper","oil","vinegar","pasta","rice","bread","broth","stock","sauce","can","beans","lentils","chickpea","oat","honey","maple syrup","vanilla","baking powder","baking soda","cornstarch","yeast","spice","seasoning","soy sauce","mustard","ketchup","mayo","mayonnaise","hot sauce","worcestershire","coconut milk","tomato paste","tomato sauce","diced tomato","olive","caper","pickle","jam","peanut butter","almond butter","tahini","curry","cumin","paprika","turmeric","oregano","cinnamon","nutmeg","chili powder","bay leaf","bouillon","miso","fish sauce"]],
  ["Frozen",         ["frozen","ice cream","gelato","sorbet"]],
  ["Beverages",      ["juice","sparkling water","soda","wine","beer","cider","coffee","tea","kombucha","lemonade","sports drink"]],
  ["Snacks",         ["chip","cracker","pretzel","popcorn","granola bar","trail mix","nut","almond","cashew","walnut","pecan","pistachio","peanut","sunflower seed","pumpkin seed"]],
];

function inferCategory(itemName: string): string {
  const name = itemName.toLowerCase();
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((k) => name.includes(k))) return category;
  }
  return "Other";
}

// ─── Queries ─────────────────────────────────────────────────

export async function getGroceryItems(householdId: string): Promise<GroceryItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("grocery_items")
    .select("*")
    .eq("household_id", householdId)
    .order("checked", { ascending: true })
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return (data ?? []) as GroceryItem[];
}

// ─── Mutations ───────────────────────────────────────────────

export async function addGroceryItem(
  householdId: string,
  item: { name: string; quantity?: string; unit?: string; notes?: string; category?: string }
): Promise<ActionResult<GroceryItem>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grocery_items")
    .insert({
      household_id: householdId,
      name: item.name.trim(),
      quantity: item.quantity?.trim() || null,
      unit: item.unit?.trim() || null,
      notes: item.notes?.trim() || null,
      category: item.category ?? inferCategory(item.name),
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Could not add item." };
  }

  return { success: true, data: data as GroceryItem };
}

export async function toggleGroceryItem(
  householdId: string,
  itemId: string,
  checked: boolean
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("grocery_items")
    .update({
      checked,
      checked_by: checked ? user.id : null,
      checked_at: checked ? new Date().toISOString() : null,
    })
    .eq("id", itemId)
    .eq("household_id", householdId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteGroceryItem(
  householdId: string,
  itemId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("grocery_items")
    .delete()
    .eq("id", itemId)
    .eq("household_id", householdId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function clearCheckedItems(householdId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("grocery_items")
    .delete()
    .eq("household_id", householdId)
    .eq("checked", true);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// ─── Import from meal plan ────────────────────────────────────

export async function importFromMealPlan(
  householdId: string,
  weekStart: string
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const user = await requireUser();
  const supabase = await createClient();

  // Get this week's planned recipes
  const weekEnd = new Date(weekStart + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const { data: plans } = await supabase
    .from("meal_plans")
    .select("recipe_id")
    .eq("household_id", householdId)
    .gte("planned_date", weekStart)
    .lte("planned_date", weekEndStr)
    .not("recipe_id", "is", null);

  if (!plans?.length) {
    return { success: false, error: "No recipes are planned for this week." };
  }

  const recipeIds = [...new Set(plans.map((p) => p.recipe_id as string))];

  // Fetch all ingredients for those recipes
  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("item, quantity, unit, recipe_id")
    .in("recipe_id", recipeIds)
    .order("position", { ascending: true });

  if (!ingredients?.length) {
    return { success: false, error: "The planned recipes have no ingredients listed." };
  }

  // Get existing unchecked items to avoid duplicates
  const { data: existing } = await supabase
    .from("grocery_items")
    .select("name")
    .eq("household_id", householdId)
    .eq("checked", false);

  const existingNames = new Set(
    (existing ?? []).map((e) => e.name.toLowerCase().trim())
  );

  // De-duplicate ingredients by name (case-insensitive), skip already listed
  const seen = new Set<string>();
  const toInsert: {
    household_id: string;
    name: string;
    quantity: string | null;
    unit: string | null;
    category: string;
    recipe_id: string;
    created_by: string;
  }[] = [];

  for (const ing of ingredients) {
    const key = ing.item.toLowerCase().trim();
    if (seen.has(key) || existingNames.has(key)) continue;
    seen.add(key);
    toInsert.push({
      household_id: householdId,
      name: ing.item,
      quantity: ing.quantity || null,
      unit: ing.unit || null,
      category: inferCategory(ing.item),
      recipe_id: ing.recipe_id as string,
      created_by: user.id,
    });
  }

  const skipped = ingredients.length - toInsert.length;

  if (!toInsert.length) {
    return {
      success: true,
      data: { added: 0, skipped },
    };
  }

  const { error } = await supabase.from("grocery_items").insert(toInsert);
  if (error) return { success: false, error: error.message };

  return { success: true, data: { added: toInsert.length, skipped } };
}
