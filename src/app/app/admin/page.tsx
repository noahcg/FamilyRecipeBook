import Link from "next/link";
import { BookOpen, Database, Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { AdminShareProfiles } from "./AdminShareProfiles";

interface AdminSearchParams {
  q?: string;
}

interface AdminBookRow {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  created_at: string | null;
  owner: { full_name: string | null }[] | null;
  members: { id: string }[] | null;
  recipes: { id: string }[] | null;
}

interface AdminProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line-soft bg-white-soft/70 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black leading-none text-ink">
            {value.toLocaleString()}
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-sm bg-green-pale text-green-deep">
          {icon}
        </span>
      </div>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const query = q.trim();
  const admin = createServiceClient();

  const [
    { count: profileCount },
    { count: bookCount },
    { count: recipeCount },
    { data: books },
    { data: profiles },
    { data: allCookbooks },
    { data: allMemberships },
    { data: pendingInviteRows },
    { data: authUsers },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("recipe_books").select("id", { count: "exact", head: true }),
    admin.from("recipes").select("id", { count: "exact", head: true }),
    query
      ? admin
          .from("recipe_books")
          .select("id,title,description,owner_id,created_at,owner:profiles!owner_id(full_name),members:book_members(id),recipes(id)")
          .ilike("title", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(12)
      : admin
          .from("recipe_books")
          .select("id,title,description,owner_id,created_at,owner:profiles!owner_id(full_name),members:book_members(id),recipes(id)")
          .order("created_at", { ascending: false })
          .limit(8),
    // All profiles (search-filtered by name when a query is present).
    query
      ? admin
          .from("profiles")
          .select("id,full_name,avatar_url,created_at")
          .ilike("full_name", `%${query}%`)
          .order("created_at", { ascending: false })
      : admin
          .from("profiles")
          .select("id,full_name,avatar_url,created_at")
          .order("created_at", { ascending: false }),
    // Every cookbook for the share picker (independent of the search filter).
    admin.from("recipe_books").select("id,title").order("title", { ascending: true }),
    // Existing memberships so current members can't be re-invited.
    admin.from("book_members").select("book_id,user_id"),
    // Pending invitations so already-invited people are marked.
    admin
      .from("book_invitations")
      .select("book_id,email")
      .is("accepted_at", null)
      .gte("expires_at", new Date().toISOString()),
    // Emails live in auth.users, not profiles — fetch them to label rows.
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const bookRows = (books ?? []) as AdminBookRow[];
  const profileRows = (profiles ?? []) as AdminProfileRow[];

  const emailById = new Map<string, string>();
  for (const authUser of authUsers?.users ?? []) {
    if (authUser.email) emailById.set(authUser.id, authUser.email);
  }

  const shareProfiles = profileRows.map((profile) => ({
    id: profile.id,
    name: profile.full_name ?? "",
    email: emailById.get(profile.id) ?? null,
  }));
  const shareCookbooks = (allCookbooks ?? []).map((book) => ({
    id: book.id,
    title: book.title,
  }));
  const membershipKeys = (allMemberships ?? []).map(
    (member) => `${member.book_id}:${member.user_id}`
  );
  const pendingInviteKeys = (pendingInviteRows ?? []).map(
    (invite) => `${invite.book_id}:${invite.email.toLowerCase()}`
  );

  return (
    <div className="app-paper-bg paper-texture min-h-screen px-5 py-8">
      <main className="mx-auto max-w-[1180px]">
        <div className="mb-7 flex flex-col gap-5 border-b border-line-soft pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/app" className="text-sm font-bold text-green-deep hover:underline">
              Back to app
            </Link>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.08em] text-accent-cinnamon">
              Admin
            </p>
            <h1 className="mt-1 text-3xl font-black leading-tight text-ink">
              Support Console
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Find users and cookbooks, and invite anyone to a cookbook of your choosing.
            </p>
          </div>

          <form
            action="/app/admin"
            className="flex h-12 w-full max-w-md items-center gap-2 rounded-full border border-line-soft bg-card/90 px-4 shadow-xs"
          >
            <span className="flex shrink-0 items-center justify-center text-ink-soft">
              <Search size={16} />
            </span>
            <input
              name="q"
              defaultValue={query}
              placeholder="Search cookbook or profile name"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
            />
          </form>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Profiles" value={profileCount ?? 0} icon={<Users size={21} />} />
          <StatCard label="Cookbooks" value={bookCount ?? 0} icon={<BookOpen size={21} />} />
          <StatCard label="Recipes" value={recipeCount ?? 0} icon={<Database size={21} />} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="recipe-card flex max-h-[34rem] flex-col overflow-hidden">
            <div className="shrink-0 border-b border-line-soft px-5 py-4">
              <h2 className="text-base font-black text-ink">
                {query ? "Matching cookbooks" : "Recent cookbooks"}
              </h2>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto">
              {bookRows.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-muted">No cookbooks found.</p>
              ) : (
                bookRows.map((book) => (
                  <Link
                    key={book.id}
                    href={`/app/admin/books/${book.id}`}
                    className="block px-5 py-4 transition-colors hover:bg-green-pale/70"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-ink">{book.title}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          Owner: {book.owner?.[0]?.full_name ?? "Unknown"} · {book.members?.length ?? 0} members · {book.recipes?.length ?? 0} recipes
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-green-deep">View</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <AdminShareProfiles
            profiles={shareProfiles}
            cookbooks={shareCookbooks}
            memberships={membershipKeys}
            pendingInvites={pendingInviteKeys}
          />
        </section>
      </main>
    </div>
  );
}
