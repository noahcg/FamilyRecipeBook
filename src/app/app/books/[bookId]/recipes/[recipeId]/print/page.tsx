import { notFound } from "next/navigation";
import { RecipePrintPage } from "@/components/recipe/RecipePrintPage";
import { getRecipe } from "@/lib/actions/recipes";
import { requireUser } from "@/lib/auth";
import { assertFeatureAccess, EntitlementError } from "@/lib/entitlements";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ bookId: string; recipeId: string }>;
}

export default async function PrintRecipePage({ params }: Props) {
  const { bookId, recipeId } = await params;
  const user = await requireUser();
  try { await assertFeatureAccess(user.id, "recipe.pdfExport"); }
  catch (error) { if (error instanceof EntitlementError) redirect("/pricing?reason=pdf"); throw error; }

  const recipe = await getRecipe(recipeId);
  if (!recipe || recipe.book_id !== bookId) notFound();

  return <RecipePrintPage recipe={recipe} bookId={bookId} />;
}
