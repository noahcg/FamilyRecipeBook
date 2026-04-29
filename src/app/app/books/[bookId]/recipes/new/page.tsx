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
      <div className="px-5 pt-5">
        <Link
          href={`/app/books/${bookId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors mb-5 block"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to book
        </Link>

        <h1
          className="text-2xl font-bold text-green-deep mb-1"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Add a recipe
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          Capture the recipe and the story behind it.
        </p>

        <RecipeForm bookId={bookId} />
      </div>
    </AppShell>
  );
}
