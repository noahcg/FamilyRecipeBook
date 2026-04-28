import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AddMemberForm } from "@/components/book/AddMemberForm";
import { getBook } from "@/lib/actions/books";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function AddMemberPage({ params }: Props) {
  const { bookId } = await params;
  const book = await getBook(bookId);

  return (
    <AppShell bookId={bookId}>
      <div className="px-5 pt-5">
        <Link
          href={`/app/books/${bookId}/members`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-5 block"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Members
        </Link>

        <h1
          className="text-2xl font-bold text-green-deep mb-2"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Add someone to this book
        </h1>
        <p className="text-ink-muted text-sm mb-8">
          Invite family to share recipes, memories, and more.
        </p>

        <AddMemberForm
          bookId={bookId}
          bookTitle={book?.title}
          onSuccessRedirect={`/app/books/${bookId}/members`}
        />
      </div>
    </AppShell>
  );
}
