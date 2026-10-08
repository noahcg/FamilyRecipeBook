import { displayIngredientAmount, displayRecipeTemperatures } from "@/lib/metricUnits";

type Ingredient = { quantity?: string | null; unit?: string | null; item: string };
type Instruction = { body: string };
type Fields<I extends Ingredient, S extends Instruction> = { ingredients: I[]; instructions: S[] };

// The parsed/saved recipe remains the source. This projection is only for the
// current viewer and never becomes a second, rounded source of truth.
export function projectRecipeUnits<I extends Ingredient, S extends Instruction>(source: Fields<I, S>, metric: boolean): Fields<I, S> {
  return {
    ingredients: source.ingredients.map((ingredient) => ({
      ...ingredient,
      ...displayIngredientAmount(ingredient.quantity ?? null, ingredient.unit ?? null, metric),
    })),
    instructions: source.instructions.map((instruction) => ({
      ...instruction,
      body: displayRecipeTemperatures(instruction.body, metric),
    })),
  };
}

export function hasUnitAdjustment<I extends Ingredient, S extends Instruction>(source: Fields<I, S>, metric: boolean): boolean {
  const shown = projectRecipeUnits(source, metric);
  return source.ingredients.some((ingredient, index) =>
    ingredient.quantity !== shown.ingredients[index].quantity || ingredient.unit !== shown.ingredients[index].unit
  ) || source.instructions.some((instruction, index) => instruction.body !== shown.instructions[index].body);
}

// An untouched projected field goes back to its exact source on save. A field
// the user edited becomes the new active source, so old import values cannot
// replace their work later.
export function restoreUneditedSource<I extends Ingredient, S extends Instruction>(
  current: Fields<I, S>, source: Fields<I, S>, metric: boolean
): Fields<I, S> {
  const shown = projectRecipeUnits(source, metric);
  return {
    ingredients: current.ingredients.map((ingredient, index) => {
      const original = source.ingredients[index];
      const projected = shown.ingredients[index];
      if (!original || !projected) return ingredient;
      if (ingredient.quantity !== projected.quantity || ingredient.unit !== projected.unit) return ingredient;
      return {
        ...ingredient,
        quantity: original.quantity,
        unit: original.unit,
      };
    }),
    instructions: current.instructions.map((instruction, index) => ({
      ...instruction,
      body: instruction.body === shown.instructions[index]?.body
        ? source.instructions[index].body
        : instruction.body,
    })),
  };
}
