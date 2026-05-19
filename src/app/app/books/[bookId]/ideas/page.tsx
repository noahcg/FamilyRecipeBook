import { AppShell } from "@/components/layout/AppShell";
import { AIRecipeIdeaPanel } from "@/components/recipe/AIRecipeIdeaPanel";

interface Props {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ prompt?: string }>;
}

export default async function RecipeIdeasPage({ params, searchParams }: Props) {
  const { bookId } = await params;
  const { prompt } = await searchParams;

  return (
    <AppShell bookId={bookId}>
      <AIRecipeIdeaPanel bookId={bookId} initialPrompt={prompt} />
    </AppShell>
  );
}
