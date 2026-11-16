import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { CollectionRecipe } from "@/components/collections/CollectionRecipe";
import { getCollectionRecipe, getOfficialCollectionLibrary } from "@/lib/officialCollections";

export default async function OfficialRecipePage({ params }: { params: Promise<{ collectionId: string; recipeId: string }> }) {
  const { collectionId, recipeId } = await params;
  const [library, recipe] = await Promise.all([getOfficialCollectionLibrary(), getCollectionRecipe(collectionId, recipeId)]);
  const collection = library.find((item) => item.id === collectionId && item.published);
  if (!collection || !recipe) notFound();
  return <AppShell><CollectionRecipe collection={collection} recipe={recipe} /></AppShell>;
}
