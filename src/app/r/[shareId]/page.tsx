import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getPublicSharedRecipe } from "@/lib/actions/recipeShares";
import { PublicSharedRecipe } from "@/components/recipe/PublicSharedRecipe";

export default async function SharedRecipePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const [recipe, user] = await Promise.all([getPublicSharedRecipe(shareId), getUser()]);
  if (!recipe) notFound();
  return <PublicSharedRecipe recipe={recipe} shareId={shareId} authenticated={Boolean(user)} />;
}
