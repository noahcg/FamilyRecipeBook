import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AddMemberForm } from "@/components/book/AddMemberForm";
import { EntryShell } from "@/components/layout/EntryShell";
import { Button, EmptyState } from "@/components/ui";
import { getBook } from "@/lib/actions/books";

interface Props {
  searchParams: Promise<{ bookId?: string }>;
}

export default async function AddMemberOnboardingPage({ searchParams }: Props) {
  const { bookId } = await searchParams;
  if (!bookId) redirect("/onboarding/create-book");
  const book = await getBook(bookId);

  return (
    <EntryShell
      eyebrow="Step 3 of 3"
      title={book?.sharing_enabled ? "Add someone to this book" : "Your private cookbook is ready"}
      description={
        book?.sharing_enabled
          ? "Invite family to share recipes, memories, and more. They’ll see the recipes you’ve already added."
          : "You can turn on sharing later from cookbook settings when you are ready to invite members."
      }
      maxWidth="md"
      sideImageSrc="/images/entry/add-family.jpg"
      sideImageAlt="Family-style dinner table with shared food"
      sideTitle="Bring the people behind the recipes into the book."
      sideDescription="Invite a contributor for recipe entry or family members who just want to read, react, and remember."
      sideNote="Recipes are better when everyone can add their part."
    >
      {book?.sharing_enabled ? (
        <AddMemberForm
          bookId={bookId}
          onSuccessRedirect={`/app/books/${bookId}`}
          skipLabel="Skip for now"
          skipHref={`/app/books/${bookId}`}
        />
      ) : (
        <EmptyState
          icon={<Lock size={28} />}
          title="Sharing is off"
          description="Only you can access this cookbook right now."
          action={
            <Link href={`/app/books/${bookId}`}>
              <Button variant="primary">Open cookbook</Button>
            </Link>
          }
        />
      )}
    </EntryShell>
  );
}
