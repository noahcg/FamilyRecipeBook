import Link from "next/link";
import { BookOpen, Crown, Lock, Plus, Settings, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CookbookBackLink } from "@/components/book/CookbookBackLink";
import { BookName } from "@/components/book/BookName";
import { Button, EmptyState } from "@/components/ui";
import { MemberProfileCard } from "@/components/members/MemberProfileCard";
import { PendingInvitationsList } from "@/components/members/PendingInvitationsList";
import { getBookMembers, getPendingBookInvitations } from "@/lib/actions/members";
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

const ROLE_GUIDE = [
  {
    label: "Keeper",
    description: "Full control - manages members, settings, and every recipe.",
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

export default async function MembersPage({ params }: Props) {
  const { bookId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [members, memberRes, recipeCounts, bookRes, pendingInvites] = await Promise.all([
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
    supabase
      .from("recipe_books")
      .select("sharing_enabled")
      .eq("id", bookId)
      .single(),
    getPendingBookInvitations(bookId),
  ]);

  const userRole = memberRes.data?.role ?? null;
  const sharingEnabled = bookRes.data?.sharing_enabled ?? false;
  const pendingCount = pendingInvites.length;
  const countMap: Record<string, number> = {};
  for (const r of recipeCounts.data ?? []) {
    countMap[r.created_by] = (countMap[r.created_by] ?? 0) + 1;
  }
  const contributingMembers = members.filter((member) => (countMap[member.user_id] ?? 0) > 0).length;
  const memberSummary = `${members.length} ${members.length === 1 ? "member" : "members"}`;
  const pendingSummary = `${pendingCount} pending ${pendingCount === 1 ? "invite" : "invites"}`;
  const contributorSummary = `${contributingMembers} ${contributingMembers === 1 ? "recipe contributor" : "recipe contributors"}`;

  const grouped = ROLE_SECTIONS.reduce<Record<string, MemberWithProfile[]>>(
    (acc, { role }) => {
      acc[role] = members.filter((m) => m.role === role);
      return acc;
    },
    {}
  );

  return (
    <AppShell bookId={bookId}>
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 lg:px-8">
        <header className="mb-7 border-b border-line-soft pb-6">
          <CookbookBackLink bookId={bookId} className="mb-4" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                <BookName />
              </p>
              <h1
                className="text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Members
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
                {memberSummary}
                <span className="mx-2 text-line">|</span>
                {pendingSummary}
                <span className="mx-2 text-line">|</span>
                {contributorSummary}
              </p>
            </div>

            {userRole === "keeper" && sharingEnabled && (
              <Link href={`/app/books/${bookId}/members/add`} className="shrink-0">
                <Button variant="primary" size="md" className="h-12 w-full rounded-md px-5 sm:w-auto">
                  <Plus size={17} /> Add Someone
                </Button>
              </Link>
            )}
          </div>
        </header>

        {!sharingEnabled ? (
          <EmptyState
            title="This cookbook is private"
            description="Members can only be invited after the keeper turns on sharing for this cookbook."
            icon={<Lock size={28} />}
            action={
              userRole === "keeper" ? (
                <Link href={`/app/books/${bookId}/settings`}>
                  <Button variant="primary" size="sm">
                    <Settings size={14} /> Open settings
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : members.length === 0 ? (
          <EmptyState
            title="Invite someone you cook with"
            description="Share the book with family or friends so recipes, notes, and memories stay in one place."
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
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="min-w-0 space-y-10">
              {userRole === "keeper" && pendingInvites.length > 0 && (
                <PendingInvitationsList bookId={bookId} invitations={pendingInvites} />
              )}
              {ROLE_SECTIONS.map(({ role, label }) => {
                const group = grouped[role] ?? [];
                if (group.length === 0) return null;
                return (
                  <section
                    key={role}
                    className="scroll-mt-6 border-b border-line-soft pb-8 last:border-b-0"
                  >
                    <div className="mb-4 flex items-baseline gap-4">
                    <h2
                      className="text-2xl font-bold leading-tight text-green-deep"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {label}
                    </h2>
                    <span className="h-px flex-1 bg-line-soft" />
                  </div>
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
            </main>

            <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
              <div className="rounded-lg border border-line bg-card p-5 shadow-[var(--shadow-paper)]">
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
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
