type ChapterRecipe = {
  title: string;
  category: string | null;
  categoryPosition: number | null;
};

export function groupRecipesByChapter<T extends ChapterRecipe>(recipes: T[], fallback: string) {
  const grouped = new Map<string, { position: number | null; recipes: T[] }>();

  for (const recipe of recipes) {
    const category = recipe.category?.trim() || fallback;
    const chapter = grouped.get(category);
    if (chapter) {
      chapter.recipes.push(recipe);
      if (chapter.position === null) chapter.position = recipe.categoryPosition;
    } else {
      grouped.set(category, { position: recipe.categoryPosition, recipes: [recipe] });
    }
  }

  return Array.from(grouped.entries())
    .sort(([nameA, a], [nameB, b]) =>
      (a.position ?? Infinity) - (b.position ?? Infinity) || nameA.localeCompare(nameB)
    )
    .map(([category, chapter], index) => ({
      category,
      number: String(index + 1).padStart(2, "0"),
      recipes: chapter.recipes.sort((a, b) => a.title.localeCompare(b.title)),
    }));
}

export function getAdjacentRecipes<T extends ChapterRecipe & { id: string }>(recipes: T[], recipeId: string, fallback: string) {
  const ordered = groupRecipesByChapter(recipes, fallback).flatMap((chapter) => chapter.recipes);
  const index = ordered.findIndex((recipe) => recipe.id === recipeId);
  return {
    previous: index > 0 ? ordered[index - 1] : null,
    next: index >= 0 ? ordered[index + 1] ?? null : null,
  };
}
