interface Props {
  params: Promise<{ bookId: string; recipeId: string }>;
}

export default async function RecipeDetailPage({ params }: Props) {
  const { bookId, recipeId } = await params;
  return (
    <div className="app-paper-bg paper-texture min-h-screen">
      <div className="max-w-[760px] mx-auto px-5 pb-28 pt-6">
        <p className="text-ink-muted text-sm">Recipe detail — recipeId: {recipeId}</p>
        {/* RecipeDetail — built in Prompt 03 */}
      </div>
    </div>
  );
}
