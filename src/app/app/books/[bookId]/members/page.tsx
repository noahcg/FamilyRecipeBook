import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { MemberProfileCard } from "@/components/members/MemberProfileCard";
import { getBookMembers } from "@/lib/actions/members";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ bookId: string }>;
}

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

  return (
    <AppShell bookId={bookId}>
      <div className="px-5 pt-5 pb-6">
        <Link
          href={`/app/books/${bookId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4 block"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to book
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-xl font-bold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Members
          </h1>
          {userRole === "keeper" && (
            <Link href={`/app/books/${bookId}/members/add`}>
              <Button variant="primary" size="sm">
                <Plus size={14} /> Add someone
              </Button>
            </Link>
          )}
        </div>

        <div className="space-y-3">
          {members.map((m) => (
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
      </div>
    </AppShell>
  );
}
