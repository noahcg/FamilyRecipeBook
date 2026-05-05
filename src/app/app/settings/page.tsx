import { AppShell } from "@/components/layout/AppShell";
import { requireProfile, requireUser } from "@/lib/auth";
import { getFirstBookId } from "@/lib/actions/books";
import { getAISettings } from "@/lib/actions/aiSettings";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui";
import { RenameBookForm } from "@/components/book/RenameBookForm";
import { AISettingsForm } from "@/components/settings/AISettingsForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-b border-line-soft py-8 last:border-b-0 lg:grid-cols-[280px_1fr] lg:gap-12">
      <div>
        <h2
          className="text-base font-bold text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const [profile, user, bookId, supabase] = await Promise.all([
    requireProfile(),
    requireUser(),
    getFirstBookId(),
    createClient(),
  ]);

  if (!bookId) redirect("/onboarding/create-book");

  const [bookRes, memberRes, aiSettings] = await Promise.all([
    supabase.from("recipe_books").select("title").eq("id", bookId).single(),
    supabase.from("book_members").select("role").eq("book_id", bookId).eq("user_id", user.id).single(),
    getAISettings(),
  ]);

  const bookTitle = bookRes.data?.title ?? "";
  const isKeeper = memberRes.data?.role === "keeper";

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }

  const cloudflareConfigured = !!(
    process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN
  );

  return (
    <AppShell bookId={bookId} bookTitle={bookTitle}>
      <div className="mx-auto max-w-[960px] px-5 pt-8 pb-16 lg:px-10">
        <h1
          className="mb-2 text-2xl font-bold text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Settings
        </h1>
        <p className="mb-8 text-sm text-ink-muted">Manage your account and recipe book preferences.</p>

        {/* Account */}
        <SettingsSection
          title="Account"
          description="Your profile as it appears to other members of your recipe books."
        >
          <div className="recipe-card p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-bold text-xl"
                style={{ background: "var(--color-sage-soft)", color: "var(--color-deep-green)" }}
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Profile"}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(profile.full_name)
                )}
              </div>
              <div>
                <p className="font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                  {profile.full_name ?? "Your name"}
                </p>
                {profile.known_for && (
                  <p className="text-sm text-ink-muted italic">Known for: {profile.known_for}</p>
                )}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Recipe Book — keeper only */}
        {isKeeper && (
          <SettingsSection
            title="Recipe Book"
            description="Shared settings for this book. Only the keeper can change these."
          >
            <div className="recipe-card p-5">
              <RenameBookForm bookId={bookId} currentTitle={bookTitle} />
            </div>
          </SettingsSection>
        )}

        {/* Recipe AI */}
        <SettingsSection
          title="Recipe AI"
          description="Controls how recipe ideas are generated on your home page when you describe what's in your pantry."
        >
          <div className="space-y-4">
            {/* Default provider info */}
            <div className="recipe-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-semibold text-ink">Default: Cloudflare Workers AI</p>
                {cloudflareConfigured ? (
                  <span className="rounded-sm bg-green-pale px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-deep">
                    Active
                  </span>
                ) : (
                  <span className="rounded-sm bg-card-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                    Not configured
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-ink-muted">
                Recipe ideas run on{" "}
                <span className="font-medium text-ink">Cloudflare Workers AI</span> using{" "}
                <span className="font-mono text-xs">Llama 3.1 8B</span> — a free, private inference
                service. Requests are processed on Cloudflare's infrastructure and are not used to
                train any models. No account required on your end.
              </p>
            </div>

            {/* User key override */}
            <div className="recipe-card p-5">
              <p className="mb-1 text-sm font-semibold text-ink">Use your own API key</p>
              <p className="mb-4 text-sm leading-relaxed text-ink-muted">
                If you have your own key, it will be used instead of the default. Your key is
                stored privately and is only visible to you.
              </p>
              <AISettingsForm
                currentProvider={aiSettings.ai_provider}
                currentKey={aiSettings.ai_api_key}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Sign out */}
        <div className="pt-4">
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
