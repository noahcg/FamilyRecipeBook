import { ArrowLeft, BookOpen, Crown, Lock, Mail, Settings, Users } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AddMemberForm } from "@/components/book/AddMemberForm";
import { getBook } from "@/lib/actions/books";
import { Button, EmptyState } from "@/components/ui";

interface Props {
  params: Promise<{ bookId: string }>;
}

const ROLE_GUIDE = [
  {
    label: "Keeper",
    description: "Full control — manages members, settings, and every recipe.",
    icon: Crown,
  },
  {
    label: "Contributor",
    description: "Can add and edit recipes and notes.",
    icon: BookOpen,
  },
  {
    label: "Family",
    description: "Can view, react, and add notes and memories.",
    icon: Users,
  },
];

export default async function AddMemberPage({ params }: Props) {
  const { bookId } = await params;
  const book = await getBook(bookId);

  return (
    <AppShell bookId={bookId}>
      <div className="px-4 py-8 sm:px-5 lg:px-8">
        <div className="mb-7 border-b border-line-soft pb-6">
          <Link
            href={`/app/books/${bookId}/members`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Members
          </Link>
          <h1
            className="text-3xl font-bold leading-tight text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Add someone to this book
          </h1>
          <p className="mt-2 max-w-prose text-sm text-ink-muted">
            Invite family to share recipes, memories, and more.
          </p>
        </div>

        {book?.sharing_enabled ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
            <div className="rounded-xl border border-line-soft bg-card p-5 sm:p-6">
              <AddMemberForm
                bookId={bookId}
                bookTitle={book?.title}
                onSuccessRedirect={`/app/books/${bookId}/members`}
              />
            </div>

            <aside className="space-y-5">
              <div className="rounded-xl border border-line-soft bg-card/70 p-5 sm:p-6">
                <h2 className="text-sm font-bold text-ink">How roles work</h2>
                <ul className="mt-4 space-y-4">
                  {ROLE_GUIDE.map(({ label, description, icon: Icon }) => (
                    <li key={label} className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-soft text-green-deep">
                        <Icon size={16} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{label}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                          {description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-line-soft bg-card/70 p-5 sm:p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-honey/15 text-accent-cinnamon">
                  <Mail size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">Sent by email</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    We&rsquo;ll email an invitation. They join the book as soon as
                    they accept — you can change their role anytime.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <EmptyState
            icon={<Lock size={28} />}
            title="Sharing is off"
            description="Turn on sharing for this cookbook before inviting members."
            action={
              <Link href={`/app/books/${bookId}/settings`}>
                <Button variant="primary" size="sm">
                  <Settings size={14} /> Open settings
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </AppShell>
  );
}
