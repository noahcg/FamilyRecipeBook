import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CookbookBackLink } from "@/components/book/CookbookBackLink";
import { BookCategoriesManager } from "@/components/book/BookCategoriesManager";
import { RenameBookForm } from "@/components/book/RenameBookForm";
import { BookPreferencesForm } from "@/components/book/BookPreferencesForm";
import { SharingSettingsForm } from "@/components/book/SharingSettingsForm";
import { AISettingsForm } from "@/components/settings/AISettingsForm";
import { GroceryPreferencesForm } from "@/components/settings/GroceryPreferencesForm";
import { GuidesPreference } from "@/components/settings/GuidesPreference";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import type { BookCategory } from "@/lib/actions/categories";
import type { Profile } from "@/lib/types";
import type { AIProvider } from "@/lib/types/database";

interface GlobalSettingsPageContentProps {
  profile: Profile;
  isAdmin: boolean;
  aiSettings: {
    ai_provider: AIProvider | null;
    ai_api_key: string | null;
  };
  cloudflareConfigured: boolean;
  groceryDayLabels: boolean;
}

interface BookSettingsPageContentProps {
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
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function GlobalSettingsPageContent({
  profile,
  isAdmin,
  aiSettings,
  cloudflareConfigured,
  groceryDayLabels,
}: GlobalSettingsPageContentProps) {
  const aiSummary = aiSettings.ai_provider ? "Custom AI key set" : "Default AI";
  const grocerySummary = groceryDayLabels ? "Grocery day labels on" : "Grocery day labels off";
  const profileSummary = profile.full_name ?? "Profile";

  return (
    <AppShell>
      <div className="max-w-[940px] px-4 py-8 sm:px-5 lg:px-8">
        <header className="mb-7 border-b border-line-soft pb-6">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
              Your account
            </p>
            <h1
              className="text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {profileSummary}
              <span className="mx-2 text-line">|</span>
              {grocerySummary}
              <span className="mx-2 text-line">|</span>
              {aiSummary}
            </p>
          </div>
        </header>

        <div className="space-y-10">
          <section className="scroll-mt-6 border-b border-line-soft pb-8">
            <div className="mb-4 flex items-baseline gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Account
              </h2>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Your profile as it appears to other members of your recipe books.
            </p>
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
          </section>

          <section className="scroll-mt-6 border-b border-line-soft pb-8">
            <div className="mb-4 flex items-baseline gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Grocery List
              </h2>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
              How ingredients you bring over from the meal plan appear on your grocery list.
            </p>
            <GroceryPreferencesForm dayLabelsEnabled={groceryDayLabels} />
          </section>

          <section className="scroll-mt-6 border-b border-line-soft pb-8">
            <div className="mb-4 flex items-baseline gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Recipe AI
              </h2>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Controls optional AI features like recipe ideas and smarter cookbook photo imports.
            </p>
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
                  <span className="font-mono text-xs">Llama 3.1 8B</span>. Requests are processed on
                  Cloudflare&apos;s infrastructure and are not used to train any models.
                </p>
              </div>

              <div className="recipe-card p-5">
                <p className="mb-1 text-sm font-semibold text-ink">Use your own API key</p>
                <p className="mb-4 text-sm leading-relaxed text-ink-muted">
                  If you have your own key, it will be used instead of the default for recipe ideas,
                  and it can power optional OpenAI cleanup after free photo OCR.
                </p>
                <AISettingsForm
                  currentProvider={aiSettings.ai_provider}
                  currentKey={aiSettings.ai_api_key}
                />
              </div>
            </div>
          </section>

          <section className="scroll-mt-6 border-b border-line-soft pb-8">
            <div className="mb-4 flex items-baseline gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Tips &amp; Guides
              </h2>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
              The short walkthrough hints that appear around the app to help you get started.
            </p>
            <GuidesPreference />
          </section>

          {isAdmin && (
            <section className="scroll-mt-6 border-b border-line-soft pb-8 last:border-b-0 lg:hidden">
              <div className="mb-4 flex items-baseline gap-4">
                <h2
                  className="text-2xl font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Admin
                </h2>
                <span className="h-px flex-1 bg-line-soft" />
              </div>
              <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
                Site administration tools for managing books and members across the app.
              </p>
              <Link
                href="/app/admin"
                className="recipe-card recipe-card--interactive flex items-center gap-3 p-5 text-accent-cinnamon transition-colors hover:bg-accent-honey/15"
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
            </section>
          )}

          <section className="scroll-mt-6">
            <div className="mb-4 flex items-baseline gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-danger"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Danger zone
              </h2>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Irreversible actions that affect your entire account.
            </p>
            <DeleteAccountSection />
          </section>

        </div>
      </div>
    </AppShell>
  );
}

export function BookSettingsPageContent({
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
}: BookSettingsPageContentProps) {
  const sharingSummary = sharingEnabled ? "Sharing on" : "Private";
  const defaultSummary = isDefaultBook ? "Default cookbook" : "Not default";
  const chapterSummary = `${categories.length} ${categories.length === 1 ? "chapter" : "chapters"}`;

  return (
    <AppShell bookId={bookId} bookTitle={bookTitle}>
      <div className="max-w-[940px] px-4 py-8 sm:px-5 lg:px-8">
        <header className="mb-7 border-b border-line-soft pb-6">
          <CookbookBackLink bookId={bookId} className="mb-4" />
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
              {bookTitle}
            </p>
            <h1
              className="text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Cookbook settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {sharingSummary}
              <span className="mx-2 text-line">|</span>
              {defaultSummary}
              <span className="mx-2 text-line">|</span>
              {chapterSummary}
            </p>
          </div>
        </header>

        <div className="space-y-10">
          {isKeeper && (
            <section className="scroll-mt-6 border-b border-line-soft pb-8">
              <div className="mb-4 flex items-baseline gap-4">
                <h2
                  className="text-2xl font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Recipe Book
                </h2>
                <span className="h-px flex-1 bg-line-soft" />
              </div>
              <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
                Shared settings for this book. Only the keeper can change these.
              </p>
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
            </section>
          )}

          {canManageCategories && (
            <section className="scroll-mt-6 border-b border-line-soft pb-8 last:border-b-0">
              <div className="mb-4 flex items-baseline gap-4">
                <h2
                  className="text-2xl font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Chapters
                </h2>
                <span className="h-px flex-1 bg-line-soft" />
              </div>
              <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
                Reorder, rename, add, or remove the chapters recipes are organized into.
              </p>
              <div className="recipe-card p-5">
                <BookCategoriesManager bookId={bookId} initialCategories={categories} />
              </div>
            </section>
          )}

          {!isKeeper && !canManageCategories && (
            <div className="recipe-card p-5">
              <p className="text-sm font-bold text-green-deep">No cookbook settings available</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Ask the cookbook keeper to change book or chapter settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
