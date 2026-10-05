export const ideaMealTypes = ["Any meal", "Breakfast", "Brunch", "Lunch", "Dinner", "Dessert", "Snack", "Appetizer", "Side dish", "Drink"] as const;
export type IdeaMealType = (typeof ideaMealTypes)[number];

export interface IdeaTable {
  mealType: IdeaMealType;
  servings: string;
  budget: string;
  minutes: string;
  diets: string[];
  allergies: string;
  pantry: string;
}

export const defaultIdeaTable: IdeaTable = {
  mealType: "Any meal", servings: "4", budget: "flexible", minutes: "any", diets: [], allergies: "", pantry: "",
};

export function buildIdeaTablePrompt(prompt: string, table: IdeaTable) {
  return [
    prompt.trim() || "Suggest a practical recipe idea.",
    table.mealType === "Any meal"
      ? "Honor any meal type requested above. Otherwise choose any meal or course: breakfast, brunch, lunch, dinner, dessert, snack, appetizer, side dish, or drink. Do not default to dinner."
      : `Required meal type: ${table.mealType}. Create a recipe for this meal type; use any request above as inspiration only where compatible.`,
    `Make ${table.servings} servings.`,
    table.budget === "budget"
      ? "Keep this budget friendly: prioritize inexpensive staples, a short shopping list, and ingredients that can be used again. Do not invent prices or savings. Explain the concrete budget choices in the description."
      : "",
    table.minutes !== "any" ? `Total preparation AND cooking time must be at most ${table.minutes} minutes.` : "",
    table.diets.length ? `Dietary requirements: ${table.diets.join(", ")}.` : "",
    table.allergies.trim() ? `Required allergy exclusions: ${table.allergies.trim()}. Exclude these ingredients and their derivatives, including in sauces, stocks, seasonings, and garnishes. Never relax exclusions to satisfy other preferences. Flag packaged ingredients that need label checks in ingredient notes. Never claim the recipe is allergy safe or verified.` : "",
    table.pantry.trim() ? `Use these ingredients where compatible with the dietary requirements and allergy exclusions: ${table.pantry.trim()}.` : "",
    "Briefly explain the practical choices in the description. Do not claim dietary or allergy verification.",
  ].filter(Boolean).join("\n");
}

export function describeIdeaTable(table: IdeaTable) {
  return [
    table.mealType,
    `For ${table.servings}`,
    table.budget === "budget" ? "Budget friendly" : "Flexible budget",
    table.minutes === "any" ? "Any time" : `${table.minutes} min`,
    ...table.diets,
    table.allergies.trim() ? `Avoid: ${table.allergies.trim()}` : "",
  ].filter(Boolean).join(" · ");
}
