export const RECIPE_CATEGORIES = [
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

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const IMPORT_RECIPE_CATEGORIES = ["", ...RECIPE_CATEGORIES] as const;
