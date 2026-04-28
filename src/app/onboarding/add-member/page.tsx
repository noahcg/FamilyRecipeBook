import { redirect } from "next/navigation";
import { AddMemberForm } from "@/components/book/AddMemberForm";

interface Props {
  searchParams: Promise<{ bookId?: string }>;
}

export default async function AddMemberOnboardingPage({ searchParams }: Props) {
  const { bookId } = await searchParams;
  if (!bookId) redirect("/onboarding/create-book");

  return (
    <div>
      <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
        Step 3 of 3
      </p>
      <h1
        className="text-3xl font-bold text-green-deep mb-2"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        Add someone to this book
      </h1>
      <p className="text-ink-muted mb-8">
        Invite family to share recipes, memories, and more. They&rsquo;ll see
        the recipes you&rsquo;ve already added.
      </p>

      <AddMemberForm
        bookId={bookId}
        onSuccessRedirect={`/app/books/${bookId}`}
        skipLabel="Skip for now"
        skipHref={`/app/books/${bookId}`}
      />
    </div>
  );
}
