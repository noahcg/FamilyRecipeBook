"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { PrintableRecipe } from "./PrintableRecipe";
import type { RecipeWithRelations } from "@/lib/types";

interface RecipePrintPageProps {
  recipe: RecipeWithRelations;
  bookId: string;
}

export function RecipePrintPage({ recipe, bookId }: RecipePrintPageProps) {
  return (
    <main className="min-h-dvh bg-paper px-4 py-5 sm:px-6 lg:px-8">
      <div className="print-preview-actions mx-auto mb-5 flex max-w-[980px] items-center justify-between gap-3">
        <Link
          href={`/app/books/${bookId}/recipes/${recipe.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line-soft bg-card px-3 text-sm font-extrabold text-green-deep shadow-xs transition hover:bg-green-pale"
        >
          <ArrowLeft size={17} />
          Recipe
        </Link>
        <Button type="button" variant="primary" size="sm" onClick={() => window.print()}>
          <Printer size={15} />
          Print
        </Button>
      </div>

      <div className="mx-auto max-w-[980px] rounded-xl border border-line bg-card p-5 shadow-[var(--shadow-paper)] print-preview-shell sm:p-7">
        <PrintableRecipe recipe={recipe} />
      </div>
    </main>
  );
}
