import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AIRecipeIdeaPanel } from "@/components/recipe/AIRecipeIdeaPanel";
import { getFirstBookId } from "@/lib/actions/books";

interface Props {
  searchParams: Promise<{ prompt?: string; surprise?: string }>;
}

export default async function IdeasPage({ searchParams }: Props) {
  const { prompt, surprise } = await searchParams;
  // Ideas are account-level; generated recipes save into the active (default)
  // cookbook. The app layout guarantees the user has at least one book.
  const bookId = await getFirstBookId();
  if (!bookId) redirect("/onboarding");

  return (
    <AppShell>
      <AIRecipeIdeaPanel bookId={bookId} initialPrompt={prompt} autoGenerate={surprise === "1"} />
    </AppShell>
  );
}
