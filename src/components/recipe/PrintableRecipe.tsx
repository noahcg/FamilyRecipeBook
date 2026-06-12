import { Fragment } from "react";
import { scaleIngredientQuantity } from "@/lib/ingredientScaling";
import { formatDuration } from "@/lib/formatDuration";
import type { RecipeWithRelations } from "@/lib/types";

interface PrintableRecipeProps {
  recipe: RecipeWithRelations;
  servingScale?: number;
}

function formatMinutes(label: string, minutes: number | null) {
  return minutes ? `${label}: ${formatDuration(minutes)}` : null;
}

export function PrintableRecipe({ recipe, servingScale = 1 }: PrintableRecipeProps) {
  // Only a real, human-written story prints in the handwriting style; a plain
  // description prints as normal text below it.
  const story = recipe.story ?? recipe.stories?.[0]?.body ?? null;
  const servings = recipe.servings ? recipe.servings * servingScale : null;
  const details = [
    servings ? `Serves ${servings}` : null,
    servingScale > 1 ? `Scaled ${servingScale}x` : null,
    formatMinutes("Prep", recipe.prep_minutes),
    formatMinutes("Cook", recipe.cook_minutes),
    recipe.category?.name,
  ].filter(Boolean);

  // Collapse ingredients into contiguous group runs (null label = ungrouped).
  const ingredientGroups = recipe.ingredients.reduce<
    { label: string | null; items: RecipeWithRelations["ingredients"] }[]
  >((groups, ingredient) => {
    const label = ingredient.group_label?.trim() ? ingredient.group_label.trim() : null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(ingredient);
    else groups.push({ label, items: [ingredient] });
    return groups;
  }, []);

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

        {recipe.description && recipe.description !== story && (
          <p className="recipe-print-description">{recipe.description}</p>
        )}

        <div className="recipe-print-grid">
          <section>
            <h2>Ingredients</h2>
            <ul className="recipe-print-ingredients">
              {ingredientGroups.map((group, groupIndex) => (
                <Fragment key={group.label ?? `ungrouped-${groupIndex}`}>
                  {group.label && (
                    <li className="recipe-print-ingredient-group">{group.label}</li>
                  )}
                  {group.items.map((ingredient) => (
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
                </Fragment>
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
