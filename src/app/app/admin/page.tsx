import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, Crown, Database, ScrollText, Search, UserRoundCheck, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { tierForBillingRecord } from "@/lib/entitlements";
import { createServiceClient } from "@/lib/supabase/service";
import { PushSubscriptionToggle } from "@/components/admin/PushSubscriptionToggle";
import { AdminShareProfiles } from "./AdminShareProfiles";
import { AdminEntitlements, type AdminEntitlementRow } from "@/components/admin/AdminEntitlements";
import { AdminCollectionsSection } from "@/components/collections/AdminCollectionsSection";
import { BookCoverArt, Button, Card, Input } from "@/components/ui";
import { resolveCoverColor } from "@/lib/bookCovers";

// PostgREST returns a to-one embed (e.g. a book's owner) as a single object, so
// reading it with [0] always misses. Normalize either shape.
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown time";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

interface AdminSearchParams {
  q?: string;
}

interface AdminBookRow {
  id: string;
  title: string;
  description: string | null;
  cover_style: string;
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
  value: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line-soft bg-white-soft/70 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">{label}</p>
          <p className="mt-1 text-2xl font-black leading-none text-ink">
            {value === null ? <span aria-label={`${label} unavailable`}>—</span> : value.toLocaleString()}
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-sm bg-green-pale text-green-deep">{icon}</span>
      </div>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const adminUser = await requireAdmin();
  const { q = "" } = await searchParams;
  const query = q.trim();
  const admin = createServiceClient();

  const [
    { count: profileCount, error: profileCountError },
    { count: bookCount, error: bookCountError },
    { count: recipeCount, error: recipeCountError },
    { count: completedSignupCount, error: completedSignupError },
    { data: firstSignupRows, error: firstSignupError },
    { data: signupTrackingConfig },
    { data: books, error: bookSearchError },
    { data: profiles, error: profilesError },
    { data: allCookbooks },
    { data: allMemberships },
    { data: pendingInviteRows },
    { data: authUsers },
    { data: billingRows, error: billingError },
    { data: auditRows, error: auditError },
    { data: collectionSourceBooks, error: collectionSourceError },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("recipe_books").select("id", { count: "exact", head: true }),
    admin.from("recipes").select("id", { count: "exact", head: true }),
    admin.from("signup_conversion_tracking").select("user_id", { count: "exact", head: true }),
    admin.from("signup_conversion_tracking").select("user_id,completed_at").order("completed_at", { ascending: true }).order("user_id", { ascending: true }).limit(50),
    admin.from("signup_conversion_config").select("started_at").eq("singleton", true).maybeSingle(),
    query
      ? admin
          .from("recipe_books")
          .select("id,title,description,cover_style,owner_id,created_at,owner:profiles!owner_id(full_name),members:book_members(id),recipes(id)")
          .ilike("title", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(12)
      : admin
          .from("recipe_books")
          .select("id,title,description,cover_style,owner_id,created_at,owner:profiles!owner_id(full_name),members:book_members(id),recipes(id)")
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
    // Only cookbooks the admin personally keeps — being an admin does not grant
    // the right to share other users' private books.
    admin
      .from("book_members")
      .select("role, recipe_books(id, title)")
      .eq("user_id", adminUser.id)
      .eq("role", "keeper"),
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
    admin.from("billing_accounts").select("user_id,status,plan,grandfathered_plus,stripe_subscription_id,refunded_subscription_id,cancel_at_period_end,current_period_end").order("updated_at", { ascending: false }),
    // Recent privileged actions for the audit log feed.
    admin
      .from("admin_actions")
      .select("id, action, summary, created_at, actor:profiles!actor_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(25),
    // Collection publishing belongs to the source owner. Keep this list
    // independent of the dashboard search and the recent-cookbook limit.
    admin.from("recipe_books").select("id,title,cover_style,official_collections(published,publisher_id)").eq("owner_id", adminUser.id).order("title", { ascending: true }),
  ]);

  const bookRows = (books ?? []) as AdminBookRow[];
  const profileRows = (profiles ?? []) as AdminProfileRow[];
  const collectionBooks = (collectionSourceBooks ?? []).map((book) => {
    const collection = one(book.official_collections);
    return {
      id: book.id,
      title: book.title,
      coverStyle: book.cover_style,
      configured: Boolean(collection),
      published: collection?.published === true && collection.publisher_id === adminUser.id,
    };
  });

  const emailById = new Map<string, string>();
  for (const authUser of authUsers?.users ?? []) {
    if (authUser.email) emailById.set(authUser.id, authUser.email);
  }

  const shareProfiles = profileRows.map((profile) => ({
    id: profile.id,
    name: profile.full_name ?? "",
    email: emailById.get(profile.id) ?? null,
  }));
  const billingByUser = new Map((billingRows ?? []).map((row) => [row.user_id, row]));
  const firstSignupIds = new Map((firstSignupRows ?? []).map((row, index) => [row.user_id, index + 1]));
  const firstSignupGrantCount = (firstSignupRows ?? []).filter((row) => billingByUser.get(row.user_id)?.grandfathered_plus === true).length;
  const entitlementRows: AdminEntitlementRow[] = profileRows.map((profile) => {
    const billing = billingByUser.get(profile.id);
    const tier = tierForBillingRecord(billing ?? null);
    return { id: profile.id, name: profile.full_name ?? "Unnamed profile", email: emailById.get(profile.id) ?? null, tier, launchSignupNumber: firstSignupIds.get(profile.id) ?? null };
  });
  const shareCookbooks = (allCookbooks ?? [])
    .map((row) => {
      const book = Array.isArray(row.recipe_books)
        ? row.recipe_books[0]
        : row.recipe_books;
      return book ? { id: book.id as string, title: book.title as string } : null;
    })
    .filter((book): book is { id: string; title: string } => book !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
  const membershipKeys = (allMemberships ?? []).map(
    (member) => `${member.book_id}:${member.user_id}`
  );
  const pendingInviteKeys = (pendingInviteRows ?? []).map(
    (invite) => `${invite.book_id}:${invite.email.toLowerCase()}`
  );
  const auditEntries = (auditRows ?? []) as Array<{
    id: string;
    action: string;
    summary: string;
    created_at: string | null;
    actor: { full_name: string | null }[] | null;
  }>;

  return (
    <div className="app-paper-bg paper-texture min-h-screen px-5 py-8">
      <main className="mx-auto max-w-[1180px]">
        <div className="mb-6 flex flex-col gap-5 border-b border-line-soft pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/app" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-green-deep hover:underline">
              <ArrowLeft size={15} aria-hidden="true" /> Back to app
            </Link>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
              Admin
            </p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
              Support Console
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Find users and cookbooks for support, and invite people to cookbooks you keep.
            </p>
            <Link href="/app/admin/moderation" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-green-deep hover:underline">
              Open privacy-preserving moderation queue
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <form action="/app/admin" className="flex w-full max-w-md items-end gap-2">
            <div className="min-w-0 flex-1"><Input label="Search cookbooks and profiles" name="q" defaultValue={query} placeholder="Search by name" rightElement={<Search size={17} aria-hidden="true" className="text-ink-soft" />} /></div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>

        <section aria-labelledby="admin-overview-heading">
          <div>
            <div className="pb-3">
              <h2 id="admin-overview-heading" className="text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Overview</h2>
              <p className="mt-1 text-sm text-ink-muted">Your Home Cooked community at a glance.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Profiles" value={profileCountError ? null : profileCount ?? 0} icon={<Users size={16} />} />
              <StatCard label="Cookbooks" value={bookCountError ? null : bookCount ?? 0} icon={<BookOpen size={16} />} />
              <StatCard label="Recipes" value={recipeCountError ? null : recipeCount ?? 0} icon={<Database size={16} />} />
              <StatCard label="Completed signups" value={completedSignupError ? null : completedSignupCount ?? 0} icon={<UserRoundCheck size={16} />} />
            </div>
            <p className="py-3 text-xs leading-relaxed text-ink-muted">
              {completedSignupError
                ? "Signup tracking is unavailable. Reload the page or check the signup tracking setup."
                : `Completed signups since ${signupTrackingConfig?.started_at ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(signupTrackingConfig.started_at)) : "tracking began"}. Compare with public visitors in Vercel Web Analytics for the same period and production environment.`}
              {(profileCountError || bookCountError || recipeCountError) && " Some counts could not be loaded. Reload the page to try again."}
            </p>
          </div>
        </section>

        <section className="mt-5 recipe-card p-5" aria-labelledby="launch-plus-heading">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-accent-cinnamon" />
            <h2 id="launch-plus-heading" className="text-base font-black text-ink">First 50 Plus grants</h2>
          </div>
          {firstSignupError || completedSignupError || billingError ? (
            <p className="mt-3 text-sm text-danger">The signup or grant count is unavailable. Check the signup tracking migration and billing data, then reload this page.</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <StatCard label="Grants remaining" value={Math.max(0, 50 - firstSignupGrantCount)} icon={<Crown size={21} />} />
                <StatCard label="Granted in first 50" value={firstSignupGrantCount} icon={<UserRoundCheck size={21} />} />
                <StatCard label="Signups in cohort" value={firstSignupRows?.length ?? 0} icon={<Users size={21} />} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                The first 50 completed new sign-ins since tracking began form this cohort. Grants are manual: use Account tiers below for people marked “First 50.” The remaining count falls only when a cohort member has an active lifetime Plus grant; revoking one restores a spot. Paid Plus alone and older grandfathered accounts do not consume a spot.
              </p>
            </>
          )}
        </section>

        <div className="mt-6"><AdminCollectionsSection books={collectionBooks} error={Boolean(collectionSourceError)} /></div>

        <section className="mt-4">
          <PushSubscriptionToggle />
        </section>

        {profilesError || billingError || firstSignupError ? (
          <section className="mt-6" aria-labelledby="account-tiers-error-heading">
            <Card>
              <h2 id="account-tiers-error-heading" className="text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Account tiers</h2>
              <p role="alert" className="mt-2 text-sm text-danger">Account tiers could not be loaded. Refresh the page to try again.</p>
            </Card>
          </section>
        ) : <AdminEntitlements rows={entitlementRows} />}

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <Card padded={false} className="flex max-h-[34rem] flex-col overflow-hidden">
            <div className="shrink-0 border-b border-line-soft px-4 py-4 sm:px-6">
              <h2 className="text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                {query ? "Matching cookbooks" : "Recent cookbooks"}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">Open a cookbook to help its members.</p>
            </div>
            <div role="region" aria-label={query ? "Matching cookbooks" : "Recent cookbooks"} tabIndex={0} className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto">
              {bookSearchError ? (
                <p role="alert" className="px-4 py-6 text-sm text-danger sm:px-6">Cookbooks could not be loaded. Refresh the page to try again.</p>
              ) : bookRows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-muted sm:px-6">No cookbooks found.</p>
              ) : (
                bookRows.map((book) => (
                  <Link key={book.id} href={`/app/admin/books/${book.id}`} className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-green-pale/70 sm:px-6">
                    <BookCoverArt title={book.title} seed={book.id} color={resolveCoverColor(book.cover_style, book.id)} className="w-10 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-green-deep">{book.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-muted">Owner: {one(book.owner)?.full_name ?? "Unknown"} · {book.members?.length ?? 0} members · {book.recipes?.length ?? 0} recipes</span>
                    </span>
                    <ArrowUpRight size={17} aria-hidden="true" className="shrink-0 text-green-deep" />
                  </Link>
                ))
              )}
            </div>
          </Card>

          <AdminShareProfiles
            profiles={shareProfiles}
            cookbooks={shareCookbooks}
            memberships={membershipKeys}
            pendingInvites={pendingInviteKeys}
          />
        </section>

        <section className="mt-6" aria-labelledby="admin-activity-heading">
          <Card padded={false} className="flex max-h-[34rem] flex-col overflow-hidden">
            <div className="shrink-0 border-b border-line-soft px-4 py-4 sm:px-6">
              <h2 id="admin-activity-heading" className="text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Admin activity</h2>
              <p className="mt-1 text-sm text-ink-muted">Recent privileged actions taken from this panel.</p>
            </div>
            <div role="region" aria-label="Admin activity" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
              {auditError ? (
                <p role="alert" className="py-6 text-sm text-danger">Admin activity could not be loaded. Refresh the page to try again.</p>
              ) : auditEntries.length === 0 ? (
                <p className="py-6 text-sm text-ink-muted">No admin actions recorded yet.</p>
              ) : (
                <div className="grid gap-x-6 sm:grid-cols-2">
                  {auditEntries.map((entry) => (
                    <div key={entry.id} className="flex min-w-0 items-start gap-3 border-b border-line-soft py-3.5">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-green-pale text-green-deep"><ScrollText size={16} aria-hidden="true" /></span>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-ink">{entry.summary}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{one(entry.actor)?.full_name ?? "Admin"} · {formatDateTime(entry.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
