import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, Mail, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

interface Props {
  params: Promise<{ bookId: string }>;
}

interface AdminBookDetail {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
  owner: { full_name: string | null }[] | null;
  members: Array<{
    id: string;
    role: string;
    created_at: string | null;
    user_id: string;
    profile: { full_name: string | null; avatar_url: string | null }[] | null;
  }> | null;
}

interface AdminRecipeRow {
  id: string;
  title: string;
  created_at: string | null;
  category: { name: string } | null;
  created_by: string;
  creator: { full_name: string | null }[] | null;
}

interface AdminInviteRow {
  id: string;
  email: string;
  role: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string | null;
}

// PostgREST returns a to-one embed (a member's profile, a recipe's creator) as a
// single object, so reading it with [0] always misses. Normalize either shape.
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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

export default async function AdminBookDetailPage({ params }: Props) {
  await requireAdmin();
  const { bookId } = await params;
  const admin = createServiceClient();

  const [{ data: book }, { data: recipes }, { data: invites }] =
    await Promise.all([
      admin
        .from("recipe_books")
        .select("id,title,description,owner_id,created_at,updated_at,owner:profiles!owner_id(full_name),members:book_members(id,role,created_at,user_id,profile:profiles(full_name,avatar_url))")
        .eq("id", bookId)
        .single(),
      admin
        .from("recipes")
        .select("id,title,created_at,created_by,creator:profiles!created_by(full_name),category:book_categories!recipes_category_id_fkey(name)")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false })
        .limit(12),
      admin
        .from("book_invitations")
        .select("id,email,role,accepted_at,expires_at,created_at")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  if (!book) notFound();

  const bookDetail = book as AdminBookDetail;
  const recipeRows = (recipes ?? []) as unknown as AdminRecipeRow[];
  const inviteRows = (invites ?? []) as AdminInviteRow[];
  const members = bookDetail.members ?? [];

  return (
    <div className="app-paper-bg paper-texture min-h-screen px-5 py-8">
      <main className="mx-auto max-w-[1180px]">
        <Link href="/app/admin" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-green-deep hover:underline">
          <ArrowLeft size={15} />
          Admin
        </Link>

        <div className="mb-7 border-b border-line-soft pb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent-cinnamon">
            Cookbook
          </p>
          <h1 className="mt-1 text-3xl font-black leading-tight text-ink">
            {bookDetail.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {bookDetail.description ?? "No description provided."}
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            ID: {bookDetail.id}
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <SupportStat label="Members" value={members.length} icon={<Users size={20} />} />
          <SupportStat label="Recipes" value={recipeRows.length} icon={<BookOpen size={20} />} />
          <SupportStat label="Created" value={formatDate(bookDetail.created_at)} icon={<Clock size={20} />} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="recipe-card overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <h2 className="text-base font-black text-ink">
                Members
              </h2>
            </div>
            <div className="divide-y divide-line-soft">
              {members.map((member) => (
                <Link
                  key={member.id}
                  href={`/app/admin/users/${member.user_id}`}
                  className="block px-5 py-4 transition-colors hover:bg-green-pale/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-ink">
                        {one(member.profile)?.full_name ?? "Unnamed member"}
                      </p>
                      <p className="mt-1 truncate text-xs text-ink-muted">{member.user_id}</p>
                    </div>
                    <span className="rounded-full bg-green-pale px-2.5 py-1 text-xs font-extrabold capitalize text-green-deep">
                      {member.role}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="recipe-card overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <h2 className="text-base font-black text-ink">
                Recent recipes
              </h2>
            </div>
            <div className="divide-y divide-line-soft">
              {recipeRows.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-muted">No recipes yet.</p>
              ) : (
                recipeRows.map((recipe) => (
                  <div key={recipe.id} className="px-5 py-4">
                    <p className="truncate text-sm font-black text-ink">{recipe.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {one(recipe.creator)?.full_name ?? "Unknown"} · {recipe.category?.name ?? "Uncategorized"} · {formatDate(recipe.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 recipe-card overflow-hidden">
          <div className="border-b border-line-soft px-5 py-4">
            <h2 className="text-base font-black text-ink">
              Recent invites
            </h2>
          </div>
          <div className="divide-y divide-line-soft">
            {inviteRows.length === 0 ? (
              <p className="px-5 py-8 text-sm text-ink-muted">No recent invites.</p>
            ) : (
              inviteRows.map((invite) => (
                <div key={invite.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-black text-ink">
                      <Mail size={15} className="shrink-0 text-accent-cinnamon" />
                      {invite.email}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {invite.role} · sent {formatDate(invite.created_at)} · expires {formatDate(invite.expires_at)}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-green-pale px-2.5 py-1 text-xs font-extrabold text-green-deep">
                    {invite.accepted_at ? "Accepted" : "Pending"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
