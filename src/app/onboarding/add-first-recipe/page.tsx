import { redirect } from "next/navigation";
import Link from "next/link";
import { RecipeForm } from "@/components/recipe/RecipeForm";
import { getAISettings } from "@/lib/actions/aiSettings";
import { listCategories } from "@/lib/actions/categories";
import { EntryShell } from "@/components/layout/EntryShell";

interface Props {
  searchParams: Promise<{ bookId?: string }>;
}

export default async function AddFirstRecipePage({ searchParams }: Props) {
  const { bookId } = await searchParams;
  if (!bookId) redirect("/onboarding/create-book");
  const [aiSettings, categories] = await Promise.all([
    getAISettings(),
    listCategories(bookId),
  ]);
  const hasOpenAIKey = aiSettings.ai_provider === "openai" && !!aiSettings.ai_api_key;

  return (
    <EntryShell
      eyebrow="Step 2 of 3"
      title="Add your first recipe"
      description="Start with a dish everyone knows. You can use a photo import, manual entry, or skip and come back later."
      maxWidth="xl"
      framed={false}
      sideImageSrc="/images/entry/add-first.jpg"
      sideImageAlt="Homemade dish beside handwritten recipe notes"
      sideTitle="The first recipe sets the table."
      sideDescription="Add one favorite now, then invite family to help fill the rest of the book."
      sideNote="Start with the one everyone knows."
      footer={
        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link href={`/app/books/${bookId}`} className="hover:text-ink underline underline-offset-2">
            Skip for now
          </Link>
        </p>
      }
    >
      <RecipeForm
        bookId={bookId}
        categories={categories}
        hasOpenAIKey={hasOpenAIKey}
        onSuccessRedirect={`/onboarding/add-member?bookId=${bookId}`}
      />
    </EntryShell>
  );
}
