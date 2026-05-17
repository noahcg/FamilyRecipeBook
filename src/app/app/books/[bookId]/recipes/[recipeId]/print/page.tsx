import { notFound } from "next/navigation";
import { RecipePrintPage } from "@/components/recipe/RecipePrintPage";
import { getRecipe } from "@/lib/actions/recipes";
import { requireUser } from "@/lib/auth";

interface Props {
  params: Promise<{ bookId: string; recipeId: string }>;
}

export default async function PrintRecipePage({ params }: Props) {
  const { bookId, recipeId } = await params;
  await requireUser();

  const recipe = await getRecipe(recipeId);
  if (!recipe || recipe.book_id !== bookId) notFound();

  return <RecipePrintPage recipe={recipe} bookId={bookId} />;
}
