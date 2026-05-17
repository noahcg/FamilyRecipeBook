"use client";

import { use } from "react";
import { OfflineRecipesPageContent } from "@/components/recipe/OfflineRecipesPageContent";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default function OfflineRecipesPage({ params }: Props) {
  const { bookId } = use(params);
  return <OfflineRecipesPageContent bookId={bookId} />;
}
