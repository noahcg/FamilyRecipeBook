import type { GroceryItem } from "@/lib/types";

const COMMON_INGREDIENT_PREFIXES = [
  "fresh",
  "large",
  "small",
  "medium",
  "ripe",
  "minced",
  "chopped",
  "diced",
  "sliced",
  "grated",
  "shredded",
  "crushed",
  "ground",
  "boneless",
  "skinless",
  "whole",
];

const UNIT_ALIASES: Record<string, string> = {
  teaspoon: "tsp",
  teaspoons: "tsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  ounce: "oz",
  ounces: "oz",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  milliliter: "ml",
  milliliters: "ml",
  liter: "l",
  liters: "l",
  stick: "stick",
  sticks: "stick",
  clove: "clove",
  cloves: "clove",
  can: "can",
  cans: "can",
  jar: "jar",
  jars: "jar",
  package: "package",
  packages: "package",
  pkg: "package",
  bag: "bag",
  bags: "bag",
  bunch: "bunch",
  bunches: "bunch",
  dozen: "dozen",
};

const COUNT_UNITS = new Set([
  "",
  "count",
  "ct",
  "piece",
  "pieces",
  "whole",
  "clove",
  "can",
  "jar",
  "package",
  "bag",
  "bunch",
  "dozen",
]);

interface NormalizedGroceryIngredient {
  name: string;
  quantity: string | null;
  unit: string | null;
}

interface StoreQuantity {
  quantity: string | null;
  unit: string | null;
  name: string;
}

interface Rule {
  match: string[];
  canonicalName?: string;
  conversions: Partial<Record<string, number>>;
  storageUnit: string;
  packageSize?: number;
  packageUnit?: string;
  roundToPackage?: boolean;
}

const PACKAGE_RULES: Rule[] = [
  {
    match: ["egg"],
    canonicalName: "eggs",
    conversions: { "": 1, dozen: 12 },
    storageUnit: "count",
    packageSize: 12,
    packageUnit: "dozen",
    roundToPackage: true,
  },
  {
    match: ["butter"],
    canonicalName: "butter",
    conversions: { stick: 1, tbsp: 1 / 8, tsp: 1 / 24, cup: 2, oz: 1 / 4, lb: 4, g: 1 / 113 },
    storageUnit: "stick",
    packageSize: 4,
    packageUnit: "lb",
    roundToPackage: true,
  },
  {
    match: ["flour", "all purpose flour", "bread flour"],
    conversions: { cup: 0.265, oz: 1 / 16, lb: 1, g: 1 / 454, kg: 2.205 },
    storageUnit: "lb",
    packageSize: 5,
    packageUnit: "lb bag",
    roundToPackage: true,
  },
  {
    match: ["sugar", "granulated sugar"],
    canonicalName: "sugar",
    conversions: { cup: 0.44, oz: 1 / 16, lb: 1, g: 1 / 454, kg: 2.205 },
    storageUnit: "lb",
    packageSize: 4,
    packageUnit: "lb bag",
    roundToPackage: true,
  },
  {
    match: ["brown sugar", "powdered sugar", "confectioners sugar"],
    conversions: { cup: 0.47, oz: 1 / 16, lb: 1, g: 1 / 454, kg: 2.205 },
    storageUnit: "lb",
    packageSize: 2,
    packageUnit: "lb bag",
    roundToPackage: true,
  },
  {
    match: ["rice", "white rice", "brown rice"],
    canonicalName: "rice",
    conversions: { cup: 0.41, oz: 1 / 16, lb: 1, g: 1 / 454, kg: 2.205 },
    storageUnit: "lb",
    packageSize: 2,
    packageUnit: "lb bag",
    roundToPackage: true,
  },
  {
    match: ["oats", "rolled oats"],
    canonicalName: "oats",
    conversions: { cup: 0.2, oz: 1 / 16, lb: 1, g: 1 / 454 },
    storageUnit: "lb",
    packageSize: 1,
    packageUnit: "lb container",
    roundToPackage: true,
  },
  {
    match: ["pasta", "spaghetti", "penne", "linguine", "fettuccine", "macaroni"],
    canonicalName: "pasta",
    conversions: { oz: 1, lb: 16, g: 1 / 28.35 },
    storageUnit: "oz",
    packageSize: 16,
    packageUnit: "oz box",
    roundToPackage: true,
  },
  {
    match: ["cheese", "cheddar", "mozzarella", "parmesan", "monterey jack", "swiss cheese", "cream cheese"],
    conversions: { cup: 4, oz: 1, lb: 16, g: 1 / 28.35 },
    storageUnit: "oz",
    packageSize: 8,
    packageUnit: "oz package",
    roundToPackage: true,
  },
  {
    match: ["chocolate chips"],
    canonicalName: "chocolate chips",
    conversions: { cup: 6, oz: 1, lb: 16, g: 1 / 28.35 },
    storageUnit: "oz",
    packageSize: 12,
    packageUnit: "oz bag",
    roundToPackage: true,
  },
  {
    match: ["broth", "stock", "chicken broth", "vegetable broth", "beef broth"],
    canonicalName: "broth",
    conversions: { cup: 8, oz: 1, pint: 16, quart: 32, ml: 1 / 29.57, l: 33.814 },
    storageUnit: "oz",
    packageSize: 32,
    packageUnit: "oz carton",
    roundToPackage: true,
  },
  {
    match: ["milk", "cream", "heavy cream", "half-and-half", "buttermilk"],
    conversions: { cup: 8, oz: 1, pint: 16, quart: 32, gallon: 128, ml: 1 / 29.57, l: 33.814 },
    storageUnit: "oz",
    packageSize: 32,
    packageUnit: "oz carton",
    roundToPackage: true,
  },
  {
    match: ["olive oil", "vegetable oil", "canola oil", "oil"],
    canonicalName: "oil",
    conversions: { tsp: 1 / 6, tbsp: 0.5, cup: 8, oz: 1, ml: 1 / 29.57, l: 33.814 },
    storageUnit: "oz",
    packageSize: 16,
    packageUnit: "oz bottle",
    roundToPackage: true,
  },
  {
    match: ["vinegar", "soy sauce", "hot sauce", "fish sauce"],
    conversions: { tsp: 1 / 6, tbsp: 0.5, cup: 8, oz: 1, ml: 1 / 29.57, l: 33.814 },
    storageUnit: "oz",
    packageSize: 10,
    packageUnit: "oz bottle",
    roundToPackage: true,
  },
  {
    match: ["tomato paste"],
    conversions: { tbsp: 0.5, cup: 8, oz: 1, can: 6 },
    storageUnit: "oz",
    packageSize: 6,
    packageUnit: "oz can",
    roundToPackage: true,
  },
  {
    match: ["diced tomatoes", "tomato sauce", "crushed tomatoes", "coconut milk", "beans", "black beans", "chickpeas"],
    conversions: { cup: 8, oz: 1, can: 15 },
    storageUnit: "oz",
    packageSize: 15,
    packageUnit: "oz can",
    roundToPackage: true,
  },
];

export function normalizeGroceryName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const prefix of COMMON_INGREDIENT_PREFIXES) {
    normalized = normalized.replace(new RegExp(`^${prefix}\\s+`), "");
  }

  return normalized
    .replace(/\bcloves?\s+of\s+/g, "")
    .replace(/\bcans?\s+of\s+/g, "")
    .replace(/\bjars?\s+of\s+/g, "")
    .replace(/\bpackages?\s+of\s+/g, "")
    .replace(/\bbags?\s+of\s+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ies$/, "y")
    .replace(/([^s])s$/, "$1");
}

export function formatGroceryName(name: string): string {
  const normalized = normalizeGroceryName(name);
  if (!normalized) return name.trim();

  if (normalized === "egg") return "eggs";
  if (normalized === "tomato") return "tomatoes";
  if (normalized === "berry") return "berries";

  return normalized;
}

export function parseQuantity(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^\d+\/\d+$/.test(trimmed)) {
    const [numerator, denominator] = trimmed.split("/").map(Number);
    return denominator ? numerator / denominator : null;
  }

  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    return denominator ? whole + numerator / denominator : null;
  }

  return null;
}

export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function normalizeUnit(unit?: string | null) {
  const normalized = unit?.toLowerCase().trim() ?? "";
  return UNIT_ALIASES[normalized] ?? normalized;
}

function findRule(name: string) {
  const normalized = normalizeGroceryName(name);
  return [...PACKAGE_RULES].sort((a, b) => {
    const longestA = Math.max(...a.match.map((match) => normalizeGroceryName(match).length));
    const longestB = Math.max(...b.match.map((match) => normalizeGroceryName(match).length));
    return longestB - longestA;
  }).find((rule) =>
    rule.match.some((match) => normalized === normalizeGroceryName(match) || normalized.includes(normalizeGroceryName(match)))
  );
}

function convertByRule(quantity: number, unit: string, rule: Rule) {
  const conversion = rule.conversions[unit];
  if (conversion == null) return null;
  return quantity * conversion;
}

export function normalizeRecipeIngredientForGrocery(ingredient: {
  item: string;
  quantity: string | null;
  unit: string | null;
}): NormalizedGroceryIngredient {
  const unit = normalizeUnit(ingredient.unit);
  const quantity = parseQuantity(ingredient.quantity);
  const rule = findRule(ingredient.item);

  if (quantity != null && rule) {
    const converted = convertByRule(quantity, unit, rule);
    if (converted != null) {
      return {
        name: rule.canonicalName ?? formatGroceryName(ingredient.item),
        quantity: formatQuantity(converted),
        unit: rule.storageUnit === "count" ? null : rule.storageUnit,
      };
    }
  }

  if (unit === "dozen" && quantity != null) {
    return { name: formatGroceryName(ingredient.item), quantity: formatQuantity(quantity * 12), unit: null };
  }

  if (quantity != null && COUNT_UNITS.has(unit)) {
    return {
      name: formatGroceryName(ingredient.item),
      quantity: formatQuantity(quantity),
      unit: unit && unit !== "count" && unit !== "ct" && unit !== "whole" ? unit : null,
    };
  }

  return { name: formatGroceryName(ingredient.item), quantity: null, unit: null };
}

export function canMergeQuantities(existing: GroceryItem, next: { quantity: string | null; unit: string | null }) {
  if (!next.quantity) return false;
  const existingQuantity = parseQuantity(existing.quantity);
  if (existing.quantity && existingQuantity == null) return false;
  return (existing.unit ?? "") === (next.unit ?? "");
}

export function formatStoreQuantity(item: GroceryItem): StoreQuantity {
  const quantity = parseQuantity(item.quantity);
  const rule = findRule(item.name);

  if (quantity == null || !rule || !rule.packageSize || !rule.packageUnit) {
    return { quantity: item.quantity, unit: item.unit, name: item.name };
  }

  if ((item.unit ?? "") !== (rule.storageUnit === "count" ? "" : rule.storageUnit)) {
    return { quantity: item.quantity, unit: item.unit, name: item.name };
  }

  const packageQuantity = rule.roundToPackage
    ? Math.ceil(quantity / rule.packageSize)
    : quantity / rule.packageSize;

  const packageUnit =
    packageQuantity === 1 || rule.packageUnit === "dozen" || rule.packageUnit === "lb"
      ? rule.packageUnit
      : `${rule.packageUnit}s`;

  return {
    quantity: formatQuantity(packageQuantity),
    unit: packageUnit,
    name: rule.canonicalName ?? item.name,
  };
}
