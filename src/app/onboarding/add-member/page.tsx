import { redirect } from "next/navigation";
import { AddMemberForm } from "@/components/book/AddMemberForm";
import { EntryShell } from "@/components/layout/EntryShell";

interface Props {
  searchParams: Promise<{ bookId?: string }>;
}

export default async function AddMemberOnboardingPage({ searchParams }: Props) {
  const { bookId } = await searchParams;
  if (!bookId) redirect("/onboarding/create-book");

  return (
    <EntryShell
      eyebrow="Step 3 of 3"
      title="Add someone to this book"
      description="Invite family to share recipes, memories, and more. They’ll see the recipes you’ve already added."
      maxWidth="md"
      sideImageSrc="/images/entry/add-member.jpg"
      sideImageAlt="Family-style dinner table with shared food"
      sideTitle="Bring the people behind the recipes into the book."
      sideDescription="Invite a contributor for recipe entry or family members who just want to read, react, and remember."
      sideNote="Recipes are better when everyone can add their part."
    >
      <AddMemberForm
        bookId={bookId}
        onSuccessRedirect={`/app/books/${bookId}`}
        skipLabel="Skip for now"
        skipHref={`/app/books/${bookId}`}
      />
    </EntryShell>
  );
}
