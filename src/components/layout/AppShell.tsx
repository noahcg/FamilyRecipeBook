"use client";

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
  UtensilsCrossed,
} from "lucide-react";
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
  { id: "collections", href: `/app/books/${bookId}/collections`, icon: ListChecks, label: "Collections" },
  { id: "settings", href: `/app/settings`, icon: Settings, label: "Settings" },
  { id: "add", href: `/app/books/${bookId}/recipes/new`, icon: Plus, label: "Add", isAdd: true },
];

const DESKTOP_NAV = (bookId: string) => [
  { id: "home", href: `/app/books/${bookId}`, icon: Home, label: "Home" },
  { id: "recipes", href: `/app/books/${bookId}/recipes`, icon: UtensilsCrossed, label: "Recipes" },
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
  const navItems = NAV(bookId);
  const { bookTitle: bookTitleCtx } = useBook();
  const bookTitle = bookTitleProp ?? bookTitleCtx;

  return (
    <div className="app-paper-bg paper-texture min-h-dvh">
      <aside className="cookbook-sidebar fixed inset-y-4 left-4 z-30 hidden w-[280px] overflow-y-auto rounded-l-xl lg:flex lg:flex-col">
        <Link href={`/app/books/${bookId}`} className="flex shrink-0 items-center gap-3 px-7 pb-7 pt-9">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-line-soft bg-card shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-full w-full" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span
              className="block truncate text-lg font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {bookTitle}
            </span>
            <span className="block text-xs text-ink-muted">Recipe Book</span>
          </span>
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
                      : "text-ink hover:bg-card/70"
                  )}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-8 shrink-0 px-6">
          <div className="mb-3 flex items-center justify-between border-t border-line-soft pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">My Cookbooks</p>
            <Link href="/onboarding/create-book" aria-label="Create cookbook" className="text-green-deep">
              <Plus size={16} />
            </Link>
          </div>
          <div className="space-y-2">
            <Link
              href={`/app/books/${bookId}`}
              className="relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors bg-card-muted text-green-deep before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent-terracotta"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-line-soft bg-card">
                <CookbookIcon name="bowl" size={18} />
              </span>
              <span className="truncate">{bookTitle}</span>
            </Link>
          </div>
        </div>

        <div className="mt-auto shrink-0 border-t border-line-soft p-5">
          <Link
            href="/app/settings"
            aria-current={isActiveNavItem(pathname, "/app/settings", "settings") ? "page" : undefined}
            className={clsx(
              "flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors hover:bg-card/70",
              isActiveNavItem(pathname, "/app/settings", "settings")
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

      <main className="cookbook-main-panel relative z-10 mx-auto min-h-dvh max-w-[760px] pb-24 lg:ml-[300px] lg:my-4 lg:mr-4 lg:max-w-none lg:min-h-[calc(100dvh-2rem)] lg:rounded-xl lg:rounded-tl-none lg:rounded-bl-none lg:pb-0">
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-4 pb-safe lg:hidden"
        style={{
          background: "rgba(247,243,233,0.97)",
          backdropFilter: "blur(12px)",
          minHeight: 64,
          boxShadow: "0 -1px 0 rgba(47,79,63,0.07), 0 -4px 16px rgba(47,79,63,0.06)",
        }}
      >
        {navItems.map(({ id, href, icon: Icon, label, isAdd }) => {
          const isActive = isActiveNavItem(pathname, href, id);

          if (isAdd) {
            return (
              <Link
                key={id}
                href={href}
                aria-label="Add recipe"
                className="flex items-center justify-center h-9 px-5 rounded-full bg-green-deep text-ink-inverse shadow-sm transition-transform active:scale-95 focus-visible:outline-none"
                style={{ boxShadow: "0 2px 8px rgba(35,68,54,0.35)" }}
              >
                <Icon size={18} strokeWidth={2.5} />
              </Link>
            );
          }

          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center gap-1 px-3 py-2 min-w-[44px] transition-colors duration-150 focus-visible:outline-none",
                isActive ? "text-green-deep" : "text-ink-soft"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-semibold leading-none tracking-wide">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
