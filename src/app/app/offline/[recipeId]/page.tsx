"use client";

import { use } from "react";
import { OfflineRecipeDetail } from "@/components/recipe/OfflineRecipeDetail";

interface Props {
  params: Promise<{ recipeId: string }>;
}

export default function OfflineRecipePage({ params }: Props) {
  const { recipeId } = use(params);
  return <OfflineRecipeDetail recipeId={recipeId} />;
}
