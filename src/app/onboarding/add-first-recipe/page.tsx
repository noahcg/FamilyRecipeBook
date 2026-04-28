import { redirect } from "next/navigation";
import { RecipeForm } from "@/components/recipe/RecipeForm";

interface Props {
  searchParams: Promise<{ bookId?: string }>;
}

export default async function AddFirstRecipePage({ searchParams }: Props) {
  const { bookId } = await searchParams;
  if (!bookId) redirect("/onboarding/create-book");

  return (
    <div>
      <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
        Step 2 of 3
      </p>
      <h1
        className="text-3xl font-bold text-green-deep mb-2"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        Add your first recipe
      </h1>
      <p className="text-ink-muted mb-8">
        Start with a family favourite. Even a title is enough for now.
      </p>

      <RecipeForm
        bookId={bookId}
        onSuccessRedirect={`/onboarding/add-member?bookId=${bookId}`}
      />
    </div>
  );
}
