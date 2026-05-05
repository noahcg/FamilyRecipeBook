import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BookName } from "@/components/book/BookName";
import { Button, EmptyState } from "@/components/ui";
import { MemberProfileCard } from "@/components/members/MemberProfileCard";
import { getBookMembers } from "@/lib/actions/members";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MemberWithProfile } from "@/lib/types";

interface Props {
  params: Promise<{ bookId: string }>;
}

const ROLE_SECTIONS: { role: string; label: string }[] = [
  { role: "keeper", label: "Keeper" },
  { role: "contributor", label: "Contributors" },
  { role: "family", label: "Family" },
];

export default async function MembersPage({ params }: Props) {
  const { bookId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [members, memberRes, recipeCounts] = await Promise.all([
    getBookMembers(bookId),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("recipes")
      .select("created_by")
      .eq("book_id", bookId),
  ]);

  const userRole = memberRes.data?.role ?? null;
  const countMap: Record<string, number> = {};
  for (const r of recipeCounts.data ?? []) {
    countMap[r.created_by] = (countMap[r.created_by] ?? 0) + 1;
  }

  const grouped = ROLE_SECTIONS.reduce<Record<string, MemberWithProfile[]>>(
    (acc, { role }) => {
      acc[role] = members.filter((m) => m.role === role);
      return acc;
    },
    {}
  );

  return (
    <AppShell bookId={bookId}>
      <div className="mx-auto max-w-[980px] px-5 py-8 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 border-b border-line-soft pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BookName className="mb-2 block text-sm font-semibold text-ink-muted" />
            <h1
              className="text-3xl font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Members
            </h1>
          </div>
          {userRole === "keeper" && (
            <Link href={`/app/books/${bookId}/members/add`}>
              <Button variant="primary" size="md" className="rounded-md">
                <Plus size={16} /> Add Someone
              </Button>
            </Link>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState
            title="Bring someone into the book."
            description="Family recipes are better when everyone can add their memories."
            action={
              userRole === "keeper" ? (
                <Link href={`/app/books/${bookId}/members/add`}>
                  <Button variant="primary" size="sm">
                    <UserPlus size={14} /> Add someone
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-8">
            {ROLE_SECTIONS.map(({ role, label }) => {
              const group = grouped[role] ?? [];
              if (group.length === 0) return null;
              return (
                <section key={role}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-3">
                    {label}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.map((m) => (
                      <Link
                        key={m.id}
                        href={`/app/books/${bookId}/members/${m.user_id}`}
                      >
                        <MemberProfileCard
                          member={m}
                          recipeCount={countMap[m.user_id] ?? 0}
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
