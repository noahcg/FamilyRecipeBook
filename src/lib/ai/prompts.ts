export type AiMessage = {
  role: "system" | "user";
  content: string;
};

export const RECIPE_GENERATION_QUALITY_GUIDANCE =
  "Support every meal and course, including breakfast, brunch, lunch, dinner, dessert, snacks, appetizers, side dishes, and drinks. Honor the requested meal type rather than assuming dinner. Write an inviting 1-2 sentence description of the dish's flavor, texture, and occasion. Write a warm 1-3 sentence story about how the dish fits everyday family life, but never invent a person, family history, provenance, award, price, or verified allergy-safety claim. Give every ingredient a practical quantity and unit except an explicitly optional or to-taste item; use notes for preparation such as chopped, sliced, drained, or divided. Never relax a dietary or allergy exclusion, even when a conflicting ingredient appears in the pantry request.";

export function recipeUnitGuidance(metricUnits: boolean) {
  return metricUnits
    ? "Use metric measurements throughout the recipe: g and kg for weight, mL and L for volume, and °C for oven temperatures. Do not use cups, tablespoons, teaspoons, ounces, pounds, or °F. Countable items such as eggs may use whole counts."
    : "Use imperial/US customary measurements throughout the recipe: cups, tablespoons, teaspoons, ounces, pounds, and °F for oven temperatures. Countable items such as eggs may use whole counts.";
}

export function formatCategoryList(categories: string[]) {
  if (categories.length === 0) return "Other";
  if (categories.length === 1) return categories[0];
  return `${categories.slice(0, -1).join(", ")}, or ${categories[categories.length - 1]}`;
}

export function buildRecipeGenerationMessages(
  prompt: string,
  categories: string[],
  metricUnits = false
): AiMessage[] {
  const categoryList = formatCategoryList(categories);
  const exampleCategory = categories[0] ?? "Other";
  return [
    {
      role: "system",
      content: `You are a warm, practical family cookbook assistant. Return only valid compact JSON matching this shape: {"title":"","description":"","source_name":"AI Recipe Idea","story":"","prep_minutes":0,"cook_minutes":0,"servings":4,"category":"${exampleCategory}","tags":[""],"ingredients":[{"quantity":"","unit":"","item":"","note":""}],"instructions":[{"body":""}]}. Choose category from ${categoryList}. ${RECIPE_GENERATION_QUALITY_GUIDANCE} ${recipeUnitGuidance(metricUnits)} Use 4-8 ingredients and 3-6 concise, complete steps. Do not include markdown.`,
    },
    {
      role: "user",
      content: `Create one realistic, saveable recipe idea from this pantry request: ${prompt}`,
    },
  ];
}

export function buildRecipeDescriptionMessages(
  title: string,
  ingredients: string[]
): AiMessage[] {
  const sample = ingredients.slice(0, 8).join(", ");
  return [
    {
      role: "system",
      content:
        "You write warm, appetizing descriptions for a family cookbook. Return ONLY a short paragraph of 3-4 sentences (about 45-75 words) describing the dish — what it is, its flavors or texture, and when you'd enjoy it. No title, no quotes, no markdown, no headings, no lists, no preamble. Be inviting and homey, not flowery.",
    },
    {
      role: "user",
      content: `Recipe: ${title}${sample ? `\nKey ingredients: ${sample}` : ""}`,
    },
  ];
}

export function buildRecipeImageSearchMessages(
  title: string,
  ingredients: string[]
): AiMessage[] {
  const sample = ingredients.slice(0, 5).join(", ");
  return [
    {
      role: "system",
      content:
        "You convert recipe names into short stock photo search queries. Return ONLY a 3-5 word phrase. Focus on homemade food and natural presentation. No quotes, no punctuation, no explanation.",
    },
    {
      role: "user",
      content: `Recipe: ${title}${sample ? `\nKey ingredients: ${sample}` : ""}`,
    },
  ];
}

export function buildRecipeImageRankingMessages(
  title: string,
  query: string,
  imageDescriptions: string[]
): AiMessage[] {
  const list = imageDescriptions
    .map((description, index) => `${index + 1}. ${description}`)
    .join("\n");
  return [
    {
      role: "system",
      content:
        "You pick the best food photo for a warm family cookbook. Prefer homemade look, natural lighting, simple plating, and appetizing but not over-styled food. Avoid restaurant or studio photos. Return ONLY the number of the best image.",
    },
    {
      role: "user",
      content: `Recipe: ${title}\nSearch: ${query}\n\nImages:\n${list}`,
    },
  ];
}
