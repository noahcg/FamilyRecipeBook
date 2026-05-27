import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { BookCategoriesManager } from "@/components/book/BookCategoriesManager";
import { RenameBookForm } from "@/components/book/RenameBookForm";
import { BookPreferencesForm } from "@/components/book/BookPreferencesForm";
import { SharingSettingsForm } from "@/components/book/SharingSettingsForm";
import { AISettingsForm } from "@/components/settings/AISettingsForm";
import { signOut } from "@/lib/actions/auth";
import type { BookCategory } from "@/lib/actions/categories";
import type { Profile } from "@/lib/types";
import type { AIProvider } from "@/lib/types/database";

interface SettingsPageContentProps {
  profile: Profile;
  bookId: string;
  bookTitle: string;
  bookCoverStyle: string;
  sharingEnabled: boolean;
  sharingBlockerCount: number;
  isDefaultBook: boolean;
  bookPreferencesReady: boolean;
  sharingPreferencesReady: boolean;
  isKeeper: boolean;
  canManageCategories: boolean;
  categories: BookCategory[];
  isAdmin: boolean;
  aiSettings: {
    ai_provider: AIProvider | null;
    ai_api_key: string | null;
  };
  cloudflareConfigured: boolean;
}

function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "grid grid-cols-1 gap-4 border-b border-line-soft py-8 last:border-b-0 lg:grid-cols-[280px_1fr] lg:gap-12",
        className
      )}
    >
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

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function SettingsPageContent({
  profile,
  bookId,
  bookTitle,
  bookCoverStyle,
  sharingEnabled,
  sharingBlockerCount,
  isDefaultBook,
  bookPreferencesReady,
  sharingPreferencesReady,
  isKeeper,
  canManageCategories,
  categories,
  isAdmin,
  aiSettings,
  cloudflareConfigured,
}: SettingsPageContentProps) {
  return (
    <AppShell bookId={bookId} bookTitle={bookTitle}>
      <div className="mx-auto max-w-[960px] px-4 pt-8 pb-16 sm:px-5 lg:px-10">
        <h1
          className="mb-2 text-2xl font-bold text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Settings
        </h1>
        <p className="mb-8 text-sm text-ink-muted">
          Manage your account and recipe book preferences.
        </p>

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

        {isKeeper && (
          <SettingsSection
            title="Recipe Book"
            description="Shared settings for this book. Only the keeper can change these."
          >
            <div className="recipe-card p-5">
              <div className="space-y-6">
                <RenameBookForm bookId={bookId} currentTitle={bookTitle} />
                {sharingPreferencesReady ? (
                  <SharingSettingsForm
                    bookId={bookId}
                    sharingEnabled={sharingEnabled}
                    blockerCount={sharingBlockerCount}
                  />
                ) : (
                  <div className="rounded-lg border border-accent-honey/45 bg-paper-warm/60 p-4">
                    <p className="text-sm font-bold text-green-deep">
                      Cookbook sharing needs the latest database migration.
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      Apply migration 012_cookbook_sharing.sql to enable private and shared cookbooks.
                    </p>
                  </div>
                )}
                {bookPreferencesReady ? (
                  <BookPreferencesForm
                    bookId={bookId}
                    bookTitle={bookTitle}
                    currentCoverStyle={bookCoverStyle}
                    isDefault={isDefaultBook}
                  />
                ) : (
                  <div className="rounded-lg border border-accent-honey/45 bg-paper-warm/60 p-4">
                    <p className="text-sm font-bold text-green-deep">
                      Cookbook preferences need the latest database migration.
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      Apply migration 008_book_preferences.sql to enable default cookbook selection.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SettingsSection>
        )}

        {canManageCategories && (
          <SettingsSection
            title="Chapters"
            description="Reorder, rename, add, or remove the chapters recipes are organized into. Every cookbook starts with the same defaults — change them to fit how you cook."
          >
            <div className="recipe-card p-5">
              <BookCategoriesManager bookId={bookId} initialCategories={categories} />
            </div>
          </SettingsSection>
        )}

        <SettingsSection
          title="Recipe AI"
          description="Controls optional AI features like recipe ideas and smarter cookbook photo imports."
        >
          <div className="space-y-4">
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
                service. Requests are processed on Cloudflare&apos;s infrastructure and are not used to
                train any models. No account required on your end.
              </p>
            </div>

            <div className="recipe-card p-5">
              <p className="mb-1 text-sm font-semibold text-ink">Use your own API key</p>
              <p className="mb-4 text-sm leading-relaxed text-ink-muted">
                If you have your own key, it will be used instead of the default for recipe ideas,
                and it can power optional OpenAI cleanup after free photo OCR. Photo imports never
                use the app owner&apos;s OpenAI key.
              </p>
              <AISettingsForm
                currentProvider={aiSettings.ai_provider}
                currentKey={aiSettings.ai_api_key}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Admin entry — mobile only; desktop reaches Admin from the sidebar. */}
        {isAdmin && (
          <SettingsSection
            title="Admin"
            description="Site administration tools for managing books and members across the app."
            className="lg:hidden"
          >
            <Link
              href="/app/admin"
              className="recipe-card flex items-center gap-3 p-5 text-accent-cinnamon transition-colors hover:bg-accent-honey/15"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-honey/20 text-accent-cinnamon">
                <ShieldCheck size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-green-deep">Open Admin</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">
                  Manage books and members across the app.
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-ink-soft" />
            </Link>
          </SettingsSection>
        )}

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
