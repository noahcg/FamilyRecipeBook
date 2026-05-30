import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AIRecipeIdeaPanel } from "@/components/recipe/AIRecipeIdeaPanel";
import { getFirstBookId } from "@/lib/actions/books";
import { getRecipeAssignmentOptions } from "@/lib/actions/recipes";
import { canContribute } from "@/lib/permissions";

interface Props {
  searchParams: Promise<{ prompt?: string; surprise?: string }>;
}

export default async function IdeasPage({ searchParams }: Props) {
  const { prompt, surprise } = await searchParams;
  // Ideas are account-level; generated recipes save into the active (default)
  // cookbook. The app layout guarantees the user has at least one book.
  const [bookId, bookOptions] = await Promise.all([
    getFirstBookId(),
    getRecipeAssignmentOptions(),
  ]);
  if (!bookId) redirect("/onboarding");
  const contributableBooks = bookOptions.filter((book) => canContribute(book.role));
  if (contributableBooks.length === 0) redirect("/onboarding");

  return (
    <AppShell>
      <AIRecipeIdeaPanel
        bookId={bookId}
        bookOptions={contributableBooks}
        initialPrompt={prompt}
        autoGenerate={surprise === "1"}
      />
    </AppShell>
  );
}
