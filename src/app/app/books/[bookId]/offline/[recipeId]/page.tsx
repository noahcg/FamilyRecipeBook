"use client";

import { use } from "react";
import { OfflineRecipeDetail } from "@/components/recipe/OfflineRecipeDetail";

interface Props {
  params: Promise<{ bookId: string; recipeId: string }>;
}

export default function OfflineRecipePage({ params }: Props) {
  const { bookId, recipeId } = use(params);
  return <OfflineRecipeDetail bookId={bookId} recipeId={recipeId} />;
}
