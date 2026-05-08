import { AppShell } from "@/components/layout/AppShell";
import { AIRecipeIdeaPanel } from "@/components/recipe/AIRecipeIdeaPanel";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function RecipeIdeasPage({ params }: Props) {
  const { bookId } = await params;

  return (
    <AppShell bookId={bookId}>
      <AIRecipeIdeaPanel bookId={bookId} />
    </AppShell>
  );
}
