import { z } from "zod";

export const importedRecipeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500),
  source_name: z.string().max(100),
  story: z.string().max(2000),
  prep_minutes: z.number().int().min(0).max(10080),
  cook_minutes: z.number().int().min(0).max(10080),
  servings: z.number().int().min(0).max(100),
  // Free-text — server resolves to the book's matching category (case-insensitive),
  // falling back to that book's "Other" chapter when nothing matches.
  category: z.string().max(60).default(""),
  tags: z.array(z.string().max(30)).max(10),
  ingredients: z.array(
    z.object({
      quantity: z.string().max(20),
      unit: z.string().max(30),
      item: z.string().min(1).max(200),
      note: z.string().max(200),
    })
  ).min(1).max(80),
  instructions: z.array(
    z.object({
      body: z.string().min(1).max(2000),
    })
  ).min(1).max(80),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string().max(160)).max(6),
});

export type ImportedRecipe = z.infer<typeof importedRecipeSchema>;

export const importedRecipeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "source_name",
    "story",
    "prep_minutes",
    "cook_minutes",
    "servings",
    "category",
    "tags",
    "ingredients",
    "instructions",
    "confidence",
    "warnings",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    source_name: { type: "string" },
    story: { type: "string" },
    prep_minutes: { type: "integer" },
    cook_minutes: { type: "integer" },
    servings: { type: "integer" },
    category: { type: "string" },
    tags: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
    },
    ingredients: {
      type: "array",
      minItems: 1,
      maxItems: 80,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quantity", "unit", "item", "note"],
        properties: {
          quantity: { type: "string" },
          unit: { type: "string" },
          item: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    instructions: {
      type: "array",
      minItems: 1,
      maxItems: 80,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["body"],
        properties: {
          body: { type: "string" },
        },
      },
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    warnings: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
  },
};

export function normalizeImportedRecipe(recipe: ImportedRecipe): ImportedRecipe {
  return {
    ...recipe,
    title: recipe.title.trim(),
    description: recipe.description.trim(),
    source_name: recipe.source_name.trim(),
    story: recipe.story.trim(),
    category: recipe.category,
    tags: recipe.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
    ingredients: recipe.ingredients
      .map((ingredient) => ({
        quantity: ingredient.quantity.trim(),
        unit: ingredient.unit.trim(),
        item: ingredient.item.trim(),
        note: ingredient.note.trim(),
      }))
      .filter((ingredient) => ingredient.item)
      .slice(0, 80),
    instructions: recipe.instructions
      .map((instruction) => ({ body: instruction.body.trim() }))
      .filter((instruction) => instruction.body)
      .slice(0, 80),
    warnings: recipe.warnings.map((warning) => warning.trim()).filter(Boolean).slice(0, 6),
  };
}
