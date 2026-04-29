import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeForm } from "@/components/recipe/RecipeForm";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function NewRecipePage({ params }: Props) {
  const { bookId } = await params;

  return (
    <AppShell bookId={bookId}>
      <div className="mx-auto max-w-[920px] px-5 py-8 lg:px-8">
        <Link
          href={`/app/books/${bookId}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to book
        </Link>

        <div className="mb-6 border-b border-line-soft pb-6">
          <p className="mb-2 text-sm font-semibold text-ink-muted">The Family Table</p>
          <h1
            className="text-3xl font-bold leading-tight text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Add a recipe
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Capture the recipe and the story behind it.
          </p>
        </div>

        <div className="rounded-xl border border-line-soft bg-card px-5 pt-5 shadow-card sm:px-6">
          <RecipeForm bookId={bookId} />
        </div>
      </div>
    </AppShell>
  );
}
