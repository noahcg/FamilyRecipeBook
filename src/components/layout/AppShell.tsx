"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  CalendarDays,
  Heart,
  History,
  Home,
  ListChecks,
  LogOut,
  Plus,
  Settings,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { CookbookIcon } from "@/components/ui/CookbookIcon";
import { APP_VERSION } from "@/lib/version";
import { signOut } from "@/lib/actions/auth";
import { useBook } from "@/lib/context/BookContext";

interface AppShellProps {
  children: React.ReactNode;
  bookId: string;
  bookTitle?: string;
}

const NAV = (bookId: string) => [
  { id: "home", href: `/app/books/${bookId}`, icon: Home, label: "Home" },
  { id: "recipes", href: `/app/books/${bookId}/recipes`, icon: UtensilsCrossed, label: "Recipes" },
  { id: "ideas", href: `/app/books/${bookId}/ideas`, icon: Sparkles, label: "Ideas" },
  { id: "collections", href: `/app/books/${bookId}/collections`, icon: ListChecks, label: "Collections" },
  { id: "meal-plan", href: `/app/books/${bookId}/meal-plan`, icon: CalendarDays, label: "Meal Plan" },
  { id: "groceries", href: `/app/books/${bookId}/groceries`, icon: ShoppingCart, label: "Groceries" },
  { id: "favorites", href: `/app/books/${bookId}/favorites`, icon: Heart, label: "Favorites" },
  { id: "activity", href: `/app/books/${bookId}/members`, icon: History, label: "Activity" },
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
  { id: "activity", href: `/app/books/${bookId}/members`, icon: History, label: "Activity" },
];

function isActiveNavItem(pathname: string, href: string, id?: string) {
  if (id === "home") return pathname === href;
  if (id === "add") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, bookId, bookTitle: bookTitleProp }: AppShellProps) {
  const pathname = usePathname();
  const [isBookShelfOpen, setIsBookShelfOpen] = useState(false);
  const navItems = NAV(bookId);
  const { bookTitle: bookTitleCtx, books } = useBook();
  const bookTitle = bookTitleProp ?? bookTitleCtx;
  const visibleBooks = books.length > 0 ? books : [{ id: bookId, title: bookTitle, icon: "bowl" }];

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
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">My Cookbooks</p>
            <Link href="/onboarding/create-book" aria-label="Create cookbook" className="text-green-deep">
              <Plus size={16} />
            </Link>
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {visibleBooks.map((userBook) => {
              const isCurrent = userBook.id === bookId;
              return (
                <Link
                  key={userBook.id}
                  href={`/app/books/${userBook.id}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={clsx(
                    "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isCurrent
                      ? "bg-card-muted text-green-deep before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent-terracotta"
                      : "text-ink hover:bg-card/70"
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-line-soft bg-card">
                    <CookbookIcon name={userBook.icon ?? "bowl"} size={18} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{userBook.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-auto shrink-0 border-t border-line-soft p-5">
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

      <button
        type="button"
        aria-label="Open cookbooks"
        aria-expanded={isBookShelfOpen}
        onClick={() => setIsBookShelfOpen(true)}
        className="fixed right-0 top-[42dvh] z-40 flex h-[96px] w-9 flex-col items-center justify-center gap-1 rounded-l-[18px] border border-r-0 border-accent-cinnamon/30 bg-paper-warm/95 text-accent-cinnamon shadow-[-4px_8px_18px_rgba(75,53,31,0.10)] backdrop-blur-md transition-[background-color,color,transform] duration-150 hover:bg-card active:translate-x-0.5 lg:hidden"
      >
        <CookbookIcon name={visibleBooks.find((userBook) => userBook.id === bookId)?.icon ?? "bowl"} size={18} />
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
                      "flex items-center gap-3 rounded-md border px-3 py-3 text-sm transition-[background-color,border-color,transform] active:translate-y-px",
                      isCurrent
                        ? "border-green-sage bg-green-soft/75 text-green-deep"
                        : "border-line-soft bg-white-soft/75 text-ink hover:bg-green-pale"
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-line-soft bg-card">
                      <CookbookIcon name={userBook.icon ?? "bowl"} size={20} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-extrabold">
                      {userBook.title}
                    </span>
                  </Link>
                );
              })}
            </div>

            <Link
              href="/onboarding/create-book"
              onClick={() => setIsBookShelfOpen(false)}
              className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-md border border-dashed border-accent-cinnamon/55 bg-white-soft text-sm font-extrabold text-accent-cinnamon"
            >
              <Plus size={17} />
              New cookbook
            </Link>
          </section>
        </div>
      )}

      {/* Bottom nav */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-40 px-2 sm:px-4 lg:hidden"
      >
        <div
          className="mx-auto flex h-[62px] max-w-[760px] items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-[30px] border border-line-soft/90 bg-card/95 p-1.5 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                      ? "min-w-[98px] bg-green-soft/80 text-green-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]"
                      : "min-w-[64px] text-ink-soft hover:bg-green-soft/65 hover:text-green-deep"
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
