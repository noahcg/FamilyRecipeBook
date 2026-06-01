import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BookName } from "@/components/book/BookName";
import { CookbookBackLink } from "@/components/book/CookbookBackLink";
import { RecipeForm } from "@/components/recipe/RecipeForm";
import { getAISettings } from "@/lib/actions/aiSettings";
import { listCategories } from "@/lib/actions/categories";
import { getRecipeAssignmentOptions } from "@/lib/actions/recipes";
import { canContribute } from "@/lib/permissions";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function NewRecipePage({ params }: Props) {
  const { bookId } = await params;
  const [aiSettings, categories, bookOptions] = await Promise.all([
    getAISettings(),
    listCategories(bookId),
    getRecipeAssignmentOptions(),
  ]);
  const hasOpenAIKey = aiSettings.ai_provider === "openai" && !!aiSettings.ai_api_key;
  const contributableBooks = bookOptions.filter((book) => canContribute(book.role));
  if (contributableBooks.length === 0) notFound();

  return (
    <AppShell bookId={bookId}>
      <div className="px-5 py-8 lg:px-10">
        <CookbookBackLink bookId={bookId} className="mb-5" />

        <div className="mb-6 border-b border-line-soft pb-6">
          <BookName className="mb-2 block text-sm font-semibold text-ink-muted" />
          <h1
            className="text-3xl font-bold leading-tight text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Add a recipe
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Capture the recipe and the story behind it.
          </p>
        </div>

        <RecipeForm
          bookId={bookId}
          categories={categories}
          bookOptions={contributableBooks}
          hasOpenAIKey={hasOpenAIKey}
          enablePasteEntry
        />
      </div>
    </AppShell>
  );
}
