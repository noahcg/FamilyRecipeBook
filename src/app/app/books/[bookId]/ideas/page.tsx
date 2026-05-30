import { AppShell } from "@/components/layout/AppShell";
import { AIRecipeIdeaPanel } from "@/components/recipe/AIRecipeIdeaPanel";
import { getRecipeAssignmentOptions } from "@/lib/actions/recipes";
import { canContribute } from "@/lib/permissions";

interface Props {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ prompt?: string; surprise?: string }>;
}

export default async function RecipeIdeasPage({ params, searchParams }: Props) {
  const { bookId } = await params;
  const { prompt, surprise } = await searchParams;
  const bookOptions = await getRecipeAssignmentOptions();
  const contributableBooks = bookOptions.filter((book) => canContribute(book.role));

  return (
    <AppShell bookId={bookId}>
      <AIRecipeIdeaPanel
        bookId={bookId}
        bookOptions={contributableBooks}
        initialPrompt={prompt}
        autoGenerate={surprise === "1"}
      />
    </AppShell>
  );
}
