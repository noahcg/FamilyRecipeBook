"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  canMergeQuantities,
  formatQuantity,
  normalizeGroceryName,
  normalizeRecipeIngredientForGrocery,
  parseQuantity,
} from "@/lib/grocery/packaging";
import type { ActionResult, GroceryItem, NearbyStore } from "@/lib/types";

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

export async function clearAllItems(householdId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("grocery_items")
    .delete()
    .eq("household_id", householdId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function addRecipeIngredientsToGrocery(
  recipeId: string,
  options: { force?: boolean } = {}
): Promise<ActionResult<{ added: number; updated: number; skipped: number; needsConfirmation?: boolean }>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  const householdId = membership?.household_id;
  if (!householdId) {
    return { success: false, error: "Create or join a household before using the grocery list." };
  }

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("item, quantity, unit")
    .eq("recipe_id", recipeId)
    .order("position", { ascending: true });

  if (!ingredients?.length) {
    return { success: false, error: "This recipe has no ingredients to add." };
  }

  const { data: existingItems } = await supabase
    .from("grocery_items")
    .select("*")
    .eq("household_id", householdId)
    .eq("checked", false);

  const recipeAlreadyOnList = ((existingItems ?? []) as GroceryItem[]).some(
    (item) => item.recipe_id === recipeId
  );

  if (recipeAlreadyOnList && !options.force) {
    return {
      success: true,
      data: { added: 0, updated: 0, skipped: 0, needsConfirmation: true },
    };
  }

  const existingByKey = new Map(
    ((existingItems ?? []) as GroceryItem[]).map((item) => [
      normalizeGroceryName(item.name),
      item,
    ])
  );

  const plannedByKey = new Map<
    string,
    { name: string; quantity: string | null; unit: string | null; recipe_id: string }
  >();
  let skipped = 0;

  for (const ingredient of ingredients) {
    const normalized = normalizeRecipeIngredientForGrocery(ingredient);
    const key = normalizeGroceryName(normalized.name);
    if (!key) {
      skipped += 1;
      continue;
    }

    const pending = plannedByKey.get(key);
    if (!pending) {
      plannedByKey.set(key, { ...normalized, recipe_id: recipeId });
      continue;
    }

    if (
      normalized.quantity &&
      pending.quantity &&
      (pending.unit ?? "") === (normalized.unit ?? "")
    ) {
      const pendingQuantity = parseQuantity(pending.quantity);
      const nextQuantity = parseQuantity(normalized.quantity);
      if (pendingQuantity != null && nextQuantity != null) {
        pending.quantity = formatQuantity(pendingQuantity + nextQuantity);
      }
    }
  }

  let added = 0;
  let updated = 0;
  const toInsert: {
    household_id: string;
    name: string;
    quantity: string | null;
    unit: string | null;
    category: string;
    recipe_id: string;
    created_by: string;
  }[] = [];

  for (const [key, item] of plannedByKey) {
    const existing = existingByKey.get(key);

    if (!existing) {
      toInsert.push({
        household_id: householdId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: inferCategory(item.name),
        recipe_id: item.recipe_id,
        created_by: user.id,
      });
      continue;
    }

    if (canMergeQuantities(existing, item)) {
      const existingQuantity = parseQuantity(existing.quantity) ?? 0;
      const nextQuantity = parseQuantity(item.quantity) ?? 0;
      const { error } = await supabase
        .from("grocery_items")
        .update({
          quantity: formatQuantity(existingQuantity + nextQuantity),
          recipe_id: existing.recipe_id ?? recipeId,
        })
        .eq("id", existing.id)
        .eq("household_id", householdId);

      if (error) return { success: false, error: error.message };
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  if (toInsert.length) {
    const { error } = await supabase.from("grocery_items").insert(toInsert);
    if (error) return { success: false, error: error.message };
    added = toInsert.length;
  }

  return { success: true, data: { added, updated, skipped } };
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

// ─── Nearby grocery store search (Google Places API New) ──────

interface PlacesApiPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { openNow?: boolean };
  googleMapsUri?: string;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchNearbyGroceryStores(input: {
  query?: string;
  latitude?: number;
  longitude?: number;
}): Promise<ActionResult<NearbyStore[]>> {
  await requireUser();

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Grocery store search is not configured yet.",
    };
  }

  const hasCoords =
    typeof input.latitude === "number" && typeof input.longitude === "number";
  const trimmedQuery = input.query?.trim() ?? "";
  const hasQuery = trimmedQuery.length > 0;

  if (!hasCoords && !hasQuery) {
    return {
      success: false,
      error: "Enter an address or use your location to search.",
    };
  }

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.regularOpeningHours.openNow",
    "places.googleMapsUri",
  ].join(",");

  let url: string;
  let body: Record<string, unknown>;

  if (hasCoords) {
    url = "https://places.googleapis.com/v1/places:searchNearby";
    body = {
      includedTypes: ["supermarket", "grocery_store"],
      maxResultCount: 15,
      locationRestriction: {
        circle: {
          center: { latitude: input.latitude, longitude: input.longitude },
          radius: 8000,
        },
      },
    };
  } else {
    url = "https://places.googleapis.com/v1/places:searchText";
    body = {
      textQuery: `grocery stores near ${trimmedQuery}`,
      maxResultCount: 15,
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        "[searchNearbyGroceryStores] Places API error:",
        response.status,
        text
      );
      return {
        success: false,
        error: "Could not load nearby grocery stores. Please try again.",
      };
    }

    const data = (await response.json()) as { places?: PlacesApiPlace[] };
    const places = data.places ?? [];

    const origin = hasCoords
      ? { lat: input.latitude!, lng: input.longitude! }
      : null;

    const stores: NearbyStore[] = places.map((p) => {
      const lat = p.location?.latitude ?? 0;
      const lng = p.location?.longitude ?? 0;
      return {
        id: p.id,
        name: p.displayName?.text ?? "Unnamed store",
        address: p.formattedAddress ?? "",
        latitude: lat,
        longitude: lng,
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        openNow: p.regularOpeningHours?.openNow ?? null,
        googleMapsUri: p.googleMapsUri ?? null,
        distanceMeters: origin
          ? haversineMeters(origin.lat, origin.lng, lat, lng)
          : null,
      };
    });

    // Sort by distance when we have an origin, otherwise leave Places order.
    if (origin) {
      stores.sort((a, b) => {
        const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
        const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
    }

    return { success: true, data: stores };
  } catch (error) {
    console.error("[searchNearbyGroceryStores] exception:", error);
    return {
      success: false,
      error: "Could not load nearby grocery stores. Please try again.",
    };
  }
}
