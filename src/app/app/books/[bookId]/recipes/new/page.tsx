interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function NewRecipePage({ params }: Props) {
  const { bookId } = await params;
  return (
    <div className="app-paper-bg paper-texture min-h-screen">
      <div className="max-w-[760px] mx-auto px-5 pb-28 pt-6">
        <h1
          className="text-2xl font-bold text-green-deep mb-6"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Add a recipe
        </h1>
        {/* RecipeForm — built in Prompt 03 */}
      </div>
    </div>
  );
}
