import { z } from "zod";

const ingredientSchema = z.object({
  quantity: z.string().max(20).optional(),
  unit: z.string().max(30).optional(),
  item: z.string().min(1, "Ingredient name is required").max(200),
  note: z.string().max(200).optional(),
});

const instructionSchema = z.object({
  body: z.string().min(1, "Step cannot be empty").max(2000),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1, "Recipe needs a title").max(200),
  description: z.string().max(500).optional(),
  photo_url: z.string().url().optional(),
  source_name: z.string().max(100).optional(),
  story: z.string().max(2000).optional(),
  prep_minutes: z.coerce.number().int().min(0).max(10080).optional(),
  cook_minutes: z.coerce.number().int().min(0).max(10080).optional(),
  servings: z.coerce.number().int().min(1).max(100).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  ingredients: z.array(ingredientSchema).min(1, "Add at least one ingredient"),
  instructions: z
    .array(instructionSchema)
    .min(1, "Add at least one step"),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type IngredientInput = z.infer<typeof ingredientSchema>;
export type InstructionInput = z.infer<typeof instructionSchema>;
