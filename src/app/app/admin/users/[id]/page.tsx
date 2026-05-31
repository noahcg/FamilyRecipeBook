import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, Crown, Mail, ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { SendResetButton } from "./SendResetButton";

interface Props {
  params: Promise<{ id: string }>;
}

interface MembershipRow {
  role: string;
  created_at: string | null;
  book: { id: string; title: string; owner_id: string } | { id: string; title: string; owner_id: string }[] | null;
}

interface PendingInviteRow {
  role: string;
  expires_at: string;
  created_at: string | null;
  book: { title: string } | { title: string }[] | null;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function SupportStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line-soft bg-white-soft/70 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-sm bg-green-pale text-green-deep">
          {icon}
        </span>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">
            {label}
          </p>
          <p className="mt-1 text-lg font-black text-ink">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const admin = createServiceClient();

  const [{ data: profile }, { data: authData }, { count: recipeCount }, { data: membershipRows }] =
    await Promise.all([
      admin.from("profiles").select("full_name, avatar_url, known_for, created_at").eq("id", id).single(),
      admin.auth.admin.getUserById(id),
      admin.from("recipes").select("id", { count: "exact", head: true }).eq("created_by", id),
      admin
        .from("book_members")
        .select("role, created_at, book:recipe_books(id, title, owner_id)")
        .eq("user_id", id),
    ]);

  if (!profile) notFound();

  const email = authData?.user?.email ?? null;

  const { data: inviteRows } = email
    ? await admin
        .from("book_invitations")
        .select("role, expires_at, created_at, book:recipe_books(title)")
        .eq("email", email.toLowerCase())
        .is("accepted_at", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
    : { data: [] };

  const memberships = (membershipRows ?? []) as MembershipRow[];
  const pendingInvites = (inviteRows ?? []) as PendingInviteRow[];

  return (
    <div className="app-paper-bg paper-texture min-h-screen px-5 py-8">
      <main className="mx-auto max-w-[1180px]">
        <Link
          href="/app/admin"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-green-deep hover:underline"
        >
          <ArrowLeft size={15} />
          Admin
        </Link>

        <div className="mb-7 border-b border-line-soft pb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent-cinnamon">
            User
          </p>
          <h1 className="mt-1 text-3xl font-black leading-tight text-ink">
            {profile.full_name ?? "Unnamed profile"}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <Mail size={15} className="text-accent-cinnamon" />
            {email ?? "No email on file"}
          </p>
          {profile.known_for ? (
            <p className="mt-1 text-sm text-ink-muted">Known for: {profile.known_for}</p>
          ) : null}
          <p className="mt-3 text-xs text-ink-soft">ID: {id}</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <SupportStat label="Cookbooks" value={memberships.length} icon={<BookOpen size={20} />} />
          <SupportStat label="Recipes authored" value={recipeCount ?? 0} icon={<ScrollText size={20} />} />
          <SupportStat label="Joined" value={formatDate(profile.created_at)} icon={<Clock size={20} />} />
        </section>

        <section className="mt-6 recipe-card overflow-hidden">
          <div className="border-b border-line-soft px-5 py-4">
            <h2 className="text-base font-black text-ink">Account support</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Send a password reset email to help this person regain access. Only they can use the link.
            </p>
          </div>
          <div className="px-5 py-4">
            <SendResetButton userId={id} email={email} />
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="recipe-card overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <h2 className="text-base font-black text-ink">Cookbooks</h2>
            </div>
            <div className="divide-y divide-line-soft">
              {memberships.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-muted">Not a member of any cookbook.</p>
              ) : (
                memberships.map((membership, index) => {
                  const book = one(membership.book);
                  if (!book) return null;
                  const isOwner = book.owner_id === id;
                  return (
                    <Link
                      key={`${book.id}-${index}`}
                      href={`/app/admin/books/${book.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-green-pale/70"
                    >
                      <p className="min-w-0 truncate text-sm font-black text-ink">{book.title}</p>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-pale px-2.5 py-1 text-xs font-extrabold capitalize text-green-deep">
                        {isOwner ? <Crown size={12} /> : null}
                        {membership.role}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="recipe-card overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <h2 className="text-base font-black text-ink">Pending invitations</h2>
            </div>
            <div className="divide-y divide-line-soft">
              {pendingInvites.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-muted">No pending invitations.</p>
              ) : (
                pendingInvites.map((invite, index) => {
                  const book = one(invite.book);
                  return (
                    <div key={index} className="px-5 py-4">
                      <p className="truncate text-sm font-black text-ink">
                        {book?.title ?? "A cookbook"}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {invite.role} · invited {formatDate(invite.created_at)} · expires{" "}
                        {formatDate(invite.expires_at)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
