import { scaleIngredientQuantity } from "@/lib/ingredientScaling";
import type { RecipeWithRelations } from "@/lib/types";

interface PrintableRecipeProps {
  recipe: RecipeWithRelations;
  servingScale?: number;
}

function formatMinutes(label: string, minutes: number | null) {
  return minutes ? `${label}: ${minutes} min` : null;
}

export function PrintableRecipe({ recipe, servingScale = 1 }: PrintableRecipeProps) {
  const story = recipe.story ?? recipe.stories?.[0]?.body ?? recipe.description;
  const servings = recipe.servings ? recipe.servings * servingScale : null;
  const details = [
    servings ? `Serves ${servings}` : null,
    servingScale > 1 ? `Scaled ${servingScale}x` : null,
    formatMinutes("Prep", recipe.prep_minutes),
    formatMinutes("Cook", recipe.cook_minutes),
    recipe.category,
  ].filter(Boolean);

  return (
    <section className="recipe-print-sheet">
      <div className="recipe-print-page">
        <header className="recipe-print-header">
          <p className="recipe-print-kicker">Home Cooked Recipe</p>
          <h1>{recipe.title}</h1>
          {details.length > 0 && (
            <p className="recipe-print-meta">{details.join(" · ")}</p>
          )}
          {recipe.source_name && (
            <p className="recipe-print-source">From {recipe.source_name}</p>
          )}
        </header>

        {story && (
          <blockquote className="recipe-print-story">
            {story}
          </blockquote>
        )}

        <div className="recipe-print-grid">
          <section>
            <h2>Ingredients</h2>
            <ul className="recipe-print-ingredients">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  <span className="recipe-print-checkbox" aria-hidden="true" />
                  <span className="recipe-print-ingredient-text">
                    <span>
                      {[
                        scaleIngredientQuantity(ingredient.quantity, servingScale),
                        ingredient.unit,
                        ingredient.item,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                    {ingredient.note && <em>{ingredient.note}</em>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Steps</h2>
            <ol className="recipe-print-steps">
              {recipe.instructions.map((instruction, index) => (
                <li key={instruction.id}>
                  <span className="recipe-print-step-number">{index + 1}</span>
                  <span>{instruction.body}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </section>
  );
}
