"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  CalendarDays,
  Heart,
  Home,
  ListChecks,
  LogOut,
  Download,
  ShieldCheck,
  Plus,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { APP_VERSION } from "@/lib/version";
import { signOut } from "@/lib/actions/auth";
import { useBook } from "@/lib/context/BookContext";

interface AppShellProps {
  children: React.ReactNode;
  bookId: string;
  bookTitle?: string;
  mobileSideDrawer?: {
    label: string;
    ariaLabel: string;
    eyebrow: string;
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    children: React.ReactNode;
  };
}

const NAV = (bookId: string) => [
  { id: "home", href: `/app/books/${bookId}`, icon: Home, label: "Home" },
  { id: "recipes", href: `/app/books/${bookId}/recipes`, icon: UtensilsCrossed, label: "Recipes" },
  { id: "ideas", href: `/app/books/${bookId}/ideas`, icon: Sparkles, label: "Ideas" },
  { id: "collections", href: `/app/books/${bookId}/collections`, icon: ListChecks, label: "Collections" },
  { id: "meal-plan", href: `/app/books/${bookId}/meal-plan`, icon: CalendarDays, label: "Meal Plan" },
  { id: "groceries", href: `/app/books/${bookId}/groceries`, icon: ShoppingCart, label: "Groceries" },
  { id: "favorites", href: `/app/books/${bookId}/favorites`, icon: Heart, label: "Favorites" },
  { id: "members", href: `/app/books/${bookId}/members`, icon: Users, label: "Members" },
  { id: "offline", href: `/app/books/${bookId}/offline`, icon: Download, label: "Offline" },
  { id: "settings", href: `/app/books/${bookId}/settings`, icon: Settings, label: "Settings" },
  { id: "add", href: `/app/books/${bookId}/recipes/new`, icon: Plus, label: "Add", isAdd: true },
];

const DESKTOP_NAV = (bookId: string) => [
  { id: "home", href: `/app/books/${bookId}`, icon: Home, label: "Home" },
  { id: "recipes", href: `/app/books/${bookId}/recipes`, icon: UtensilsCrossed, label: "Recipes" },
  { id: "ideas", href: `/app/books/${bookId}/ideas`, icon: Sparkles, label: "Ideas" },
  { id: "collections", href: `/app/books/${bookId}/collections`, icon: ListChecks, label: "Collections" },
  { id: "meal-plan", href: `/app/books/${bookId}/meal-plan`, icon: CalendarDays, label: "Meal Plan" },
  { id: "groceries", href: `/app/books/${bookId}/groceries`, icon: ShoppingCart, label: "Groceries" },
  { id: "favorites", href: `/app/books/${bookId}/favorites`, icon: Heart, label: "Favorites" },
  { id: "members", href: `/app/books/${bookId}/members`, icon: Users, label: "Members" },
  { id: "offline", href: `/app/books/${bookId}/offline`, icon: Download, label: "Offline" },
];

function isActiveNavItem(pathname: string, href: string, id?: string) {
  if (id === "home") return pathname === href;
  if (id === "add") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const BOOK_COVER_COLORS: Record<string, { bg: string; spine: string }> = {
  sage: { bg: "#DDE7D7", spine: "#8BA888" },
  terracotta: { bg: "#FADDD6", spine: "#C86132" },
  mustard: { bg: "#FAE8C0", spine: "#D4942E" },
  forest: { bg: "#9CAF88", spine: "#3B5A45" },
  clay: { bg: "#F0DDD0", spine: "#B8754B" },
};

const FALLBACK_BOOK_COVER_COLORS = Object.values(BOOK_COVER_COLORS);

function getBookCoverColor(seed: string, coverStyle?: string | null) {
  if (coverStyle && BOOK_COVER_COLORS[coverStyle]) return BOOK_COVER_COLORS[coverStyle];
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_BOOK_COVER_COLORS[total % FALLBACK_BOOK_COVER_COLORS.length];
}

function CookbookCoverMark({
  seed,
  coverStyle,
  size = "md",
}: {
  seed: string;
  coverStyle?: string | null;
  size?: "xs" | "sm" | "md";
}) {
  const colors = getBookCoverColor(seed, coverStyle);
  const dimensions =
    size === "xs" ? "h-7 w-5" : size === "sm" ? "h-10 w-8" : "h-12 w-9";

  return (
    <span
      className={clsx(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-white-soft/70 shadow-[0_6px_14px_rgba(75,53,31,0.14)]",
        dimensions
      )}
      style={{ background: colors.bg }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-y-0 left-0 w-2"
        style={{ background: colors.spine }}
      />
      <span className="absolute right-1 top-1 h-2 w-1 rounded-full bg-white-soft/55" />
      <span className="absolute bottom-1.5 left-3 right-1 h-px bg-white-soft/55" />
      <span className="absolute bottom-3 left-3 right-1 h-px bg-white-soft/40" />
    </span>
  );
}

export function AppShell({ children, bookId, bookTitle: bookTitleProp, mobileSideDrawer }: AppShellProps) {
  const pathname = usePathname();
  const [isBookShelfOpen, setIsBookShelfOpen] = useState(false);
  const navItems = NAV(bookId);
  const { bookTitle: bookTitleCtx, books, isAdmin } = useBook();
  const bookTitle = bookTitleProp ?? bookTitleCtx;
  const visibleBooks = books.length > 0 ? books : [{ id: bookId, title: bookTitle, icon: "bowl", cover_style: "sage" }];
  const currentBook = visibleBooks.find((userBook) => userBook.id === bookId) ?? visibleBooks[0];

  return (
    <div className="app-paper-bg paper-texture min-h-dvh">
      <aside className="cookbook-sidebar fixed inset-y-4 left-4 z-30 hidden w-[280px] overflow-y-auto rounded-l-xl lg:flex lg:flex-col">
        <Link href={`/app/books/${bookId}`} className="shrink-0 px-7 pb-7 pt-9">
          <BrandLockup compact />
        </Link>

        <nav aria-label="Primary navigation" className="shrink-0 px-6">
          <div className="space-y-2.5">
            {DESKTOP_NAV(bookId).map(({ id, href, icon: Icon, label }) => {
              const isActive = isActiveNavItem(pathname, href, id);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-green-soft/70 text-green-deep shadow-xs"
                      : "text-ink hover:bg-green-soft/55 hover:text-green-deep"
                  )}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-8 shrink-0 px-6 pb-4">
          <div className="mb-3 flex items-center justify-between border-t border-line-soft pt-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">My Cookbooks</p>
            </div>
            <Link
              href="/onboarding/create-book"
              aria-label="Create a new cookbook"
              title="Create a new cookbook"
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-line-soft bg-card text-green-deep shadow-xs transition-colors hover:bg-green-pale focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              <Plus size={15} />
            </Link>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {visibleBooks.map((userBook) => {
              const isCurrent = userBook.id === bookId;
              return (
                <Link
                  key={userBook.id}
                  href={`/app/books/${userBook.id}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={clsx(
                    "group flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-[background-color,border-color,box-shadow,transform] active:translate-y-px",
                    isCurrent
                      ? "border-accent-honey/60 bg-paper-warm text-green-deep shadow-[0_8px_22px_rgba(75,53,31,0.10)]"
                      : "border-line-soft bg-white-soft/54 text-ink hover:border-accent-honey/45 hover:bg-card"
                  )}
                >
                  <CookbookCoverMark seed={userBook.id} coverStyle={userBook.cover_style} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold leading-tight">{userBook.title}</span>
                  </span>
                  {isCurrent && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent-terracotta shadow-[0_0_0_4px_rgba(194,97,50,0.12)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-auto shrink-0 border-t border-line-soft p-5">
          {isAdmin && (
            <Link
              href="/app/admin"
              className="mb-1 flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-accent-cinnamon transition-colors hover:bg-accent-honey/20 hover:text-accent-terracotta-dark"
            >
              <ShieldCheck size={17} className="shrink-0" />
              <span>Admin</span>
            </Link>
          )}
          <Link
            href={`/app/books/${bookId}/settings`}
            aria-current={isActiveNavItem(pathname, `/app/books/${bookId}/settings`, "settings") ? "page" : undefined}
            className={clsx(
              "flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors hover:bg-card/70",
              isActiveNavItem(pathname, `/app/books/${bookId}/settings`, "settings")
                ? "bg-green-soft/70 text-green-deep shadow-xs"
                : "text-ink"
            )}
          >
            <Settings size={18} className="shrink-0" />
            <span>Settings</span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-card/70 hover:text-ink"
            >
              <LogOut size={16} className="shrink-0" />
              <span>Sign out</span>
            </button>
          </form>
          <p className="mt-2 px-3 text-[11px] font-semibold text-ink-soft/80">
            v{APP_VERSION}
          </p>
        </div>
      </aside>

      <main className="cookbook-main-panel relative z-10 mx-auto min-h-dvh max-w-[760px] pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))] lg:ml-[300px] lg:my-4 lg:mr-4 lg:max-w-none lg:min-h-[calc(100dvh-2rem)] lg:rounded-xl lg:rounded-tl-none lg:rounded-bl-none lg:pb-0">
        {children}
      </main>

      {mobileSideDrawer && (
        <button
          type="button"
          aria-label={mobileSideDrawer.ariaLabel}
          aria-expanded={mobileSideDrawer.isOpen}
          onClick={() => {
            setIsBookShelfOpen(false);
            mobileSideDrawer.onOpen();
          }}
          className="fixed right-0 top-[38dvh] z-30 flex h-[92px] w-8 flex-col items-center justify-center gap-1 rounded-l-[12px] border border-r-0 border-green-sage/35 bg-card/95 text-green-deep shadow-[-4px_8px_18px_rgba(75,53,31,0.10)] backdrop-blur-md transition-[background-color,color,transform] duration-150 hover:bg-green-pale active:translate-x-0.5 lg:hidden min-[360px]:h-[98px] min-[360px]:w-9 min-[425px]:top-[29dvh] min-[425px]:h-[104px] min-[425px]:w-10"
        >
          {mobileSideDrawer.icon}
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-extrabold leading-none">
            {mobileSideDrawer.label}
          </span>
        </button>
      )}

      <button
        type="button"
        aria-label="Open cookbooks"
        aria-expanded={isBookShelfOpen}
        onClick={() => {
          mobileSideDrawer?.onClose();
          setIsBookShelfOpen(true);
        }}
        className="fixed right-0 top-[58dvh] z-30 flex h-[86px] w-8 flex-col items-center justify-center gap-1 rounded-l-[12px] border border-r-0 border-accent-cinnamon/30 bg-paper-warm/95 text-accent-cinnamon shadow-[-4px_8px_18px_rgba(75,53,31,0.10)] backdrop-blur-md transition-[background-color,color,transform] duration-150 hover:bg-card active:translate-x-0.5 lg:hidden min-[360px]:top-[52dvh] min-[360px]:h-[96px] min-[360px]:w-9 min-[360px]:rounded-l-[14px] min-[425px]:top-[42dvh] min-[425px]:h-[104px] min-[425px]:w-10 min-[425px]:gap-1.5 min-[425px]:rounded-l-[18px]"
      >
        <CookbookCoverMark seed={currentBook?.id ?? bookId} coverStyle={currentBook?.cover_style} size="xs" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-extrabold leading-none">
          Books
        </span>
      </button>

      {isBookShelfOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close cookbooks"
            className="absolute inset-0 animate-in fade-in duration-150 bg-ink/18"
            onClick={() => setIsBookShelfOpen(false)}
          />
          <section className="relative ml-auto flex h-full w-[min(86vw,360px)] animate-in slide-in-from-right-5 duration-200 flex-col border-l border-line-soft bg-card px-4 py-5 shadow-[-18px_0_48px_rgba(75,53,31,0.14)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                  Cookbooks
                </p>
                <h2
                  className="mt-1 truncate text-2xl font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Choose a book
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close cookbooks"
                onClick={() => setIsBookShelfOpen(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line-soft bg-white-soft text-green-deep"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {visibleBooks.map((userBook) => {
                const isCurrent = userBook.id === bookId;

                return (
                  <Link
                    key={userBook.id}
                    href={`/app/books/${userBook.id}`}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => setIsBookShelfOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-md border px-3 py-3 text-sm transition-[background-color,border-color,box-shadow,transform] active:translate-y-px",
                      isCurrent
                        ? "border-accent-honey/60 bg-paper-warm text-green-deep shadow-[0_8px_22px_rgba(75,53,31,0.10)]"
                        : "border-line-soft bg-white-soft/75 text-ink hover:border-accent-honey/45 hover:bg-green-pale"
                    )}
                  >
                    <CookbookCoverMark seed={userBook.id} coverStyle={userBook.cover_style} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold leading-tight">
                        {userBook.title}
                      </span>
                    </span>
                    {isCurrent && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent-terracotta shadow-[0_0_0_4px_rgba(194,97,50,0.12)]" />
                    )}
                  </Link>
                );
              })}
            </div>

            <Link
              href="/onboarding/create-book"
              onClick={() => setIsBookShelfOpen(false)}
              aria-label="Create a new cookbook"
              className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-sm border border-dashed border-accent-cinnamon/55 bg-white-soft text-sm font-extrabold text-accent-cinnamon focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              <Plus size={17} />
              New cookbook
            </Link>
          </section>
        </div>
      )}

      {mobileSideDrawer?.isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={`Close ${mobileSideDrawer.label.toLowerCase()}`}
            className="absolute inset-0 animate-in fade-in duration-150 bg-ink/18"
            onClick={mobileSideDrawer.onClose}
          />
          <section className="relative ml-auto flex h-full w-[min(86vw,360px)] animate-in slide-in-from-right-5 duration-200 flex-col border-l border-line-soft bg-card px-4 py-5 shadow-[-18px_0_48px_rgba(75,53,31,0.14)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                  {mobileSideDrawer.eyebrow}
                </p>
                <h2
                  className="mt-1 truncate text-2xl font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {mobileSideDrawer.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label={`Close ${mobileSideDrawer.label.toLowerCase()}`}
                onClick={mobileSideDrawer.onClose}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line-soft bg-white-soft text-green-deep"
              >
                <X size={18} />
              </button>
            </div>

            {mobileSideDrawer.children}
          </section>
        </div>
      )}

      {/* Bottom nav */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-40 px-2 sm:px-4 lg:hidden"
      >
        <div
          className="mx-auto flex h-[62px] max-w-[760px] items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-[30px] border border-green-deep bg-green-forest-dark p-1.5 shadow-[0_10px_28px_rgba(31,58,45,0.24),inset_0_1px_0_rgba(255,252,246,0.10)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {navItems.map(({ id, href, icon: Icon, label, isAdd }) => {
            const isActive = isActiveNavItem(pathname, href, id);

            return (
              <Link
                key={id}
                href={href}
                aria-label={isAdd ? "Add recipe" : label}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "flex h-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-2 transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-none",
                  isAdd
                    ? "min-w-[64px] bg-accent-terracotta text-ink-inverse hover:bg-accent-terracotta-dark"
                    : isActive
                      ? "min-w-[98px] bg-white-soft text-green-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_4px_12px_rgba(14,35,25,0.20)]"
                      : "min-w-[64px] text-ink-inverse hover:bg-green-deep hover:text-ink-inverse"
                )}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.75} />
                <span className="max-w-[84px] truncate text-[10px] font-bold leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
