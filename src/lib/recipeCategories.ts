// Seed list used when creating a new cookbook. After creation, each cookbook
// owns its own categories in the book_categories table — this list is no
// longer the canonical taxonomy app-wide. Keep migration 014 in sync if you
// change these defaults.

export const DEFAULT_CATEGORY_SEED = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Appetizer",
  "Side Dish",
  "Dessert",
  "Snack",
  "Soup",
  "Salad",
  "Bread",
  "Drink",
  "Other",
] as const;

export const FALLBACK_CATEGORY_NAME = "Other";
