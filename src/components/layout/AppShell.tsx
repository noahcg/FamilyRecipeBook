"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  CalendarDays,
  Heart,
  Home,
  ListChecks,
  Plus,
  Settings,
  ShoppingCart,
  UtensilsCrossed,
  Users,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  bookId: string;
}

const NAV = (bookId: string) => [
  { id: "home", href: `/app/books/${bookId}`, icon: Home, label: "Home" },
  { id: "recipes", href: `/app/books/${bookId}/recipes`, icon: UtensilsCrossed, label: "Recipes" },
  { id: "collections", href: `/app/books/${bookId}/collections`, icon: ListChecks, label: "Collections" },
  { id: "members", href: `/app/books/${bookId}/members`, icon: Users, label: "Members" },
  { id: "add", href: `/app/books/${bookId}/recipes/new`, icon: Plus, label: "Add", isAdd: true },
];

const DESKTOP_NAV = (bookId: string) => [
  { href: `/app/books/${bookId}`, icon: Home, label: "Home" },
  { href: `/app/books/${bookId}/recipes`, icon: UtensilsCrossed, label: "Recipes" },
  { href: `/app/books/${bookId}/collections`, icon: ListChecks, label: "Collections" },
  { href: `/app/books/${bookId}/members`, icon: Users, label: "Members" },
  { href: `/app/books/${bookId}/recipes`, icon: CalendarDays, label: "Meal Plan" },
  { href: `/app/books/${bookId}/recipes`, icon: ShoppingCart, label: "Groceries" },
  { href: `/app/books/${bookId}/recipes`, icon: Heart, label: "Favorites" },
];

export function AppShell({ children, bookId }: AppShellProps) {
  const pathname = usePathname();
  const navItems = NAV(bookId);

  return (
    <div className="app-paper-bg paper-texture min-h-dvh">
      <aside className="cookbook-sidebar fixed inset-y-4 left-4 z-30 hidden w-[240px] rounded-l-xl lg:flex lg:flex-col">
        <Link href={`/app/books/${bookId}`} className="flex items-center gap-3 px-6 py-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-md border border-line-soft bg-card text-2xl shadow-xs">
            🥣
          </span>
          <span className="min-w-0">
            <span
              className="block truncate text-lg font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              The Family Table
            </span>
            <span className="block text-xs text-ink-muted">Recipe Book</span>
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="px-5">
          <div className="space-y-1">
            {DESKTOP_NAV(bookId).map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-card-muted text-green-deep shadow-xs"
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

        <div className="mt-8 px-5">
          <div className="mb-3 flex items-center justify-between border-t border-line-soft pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">My Cookbooks</p>
            <Link href="/onboarding/create-book" aria-label="Create cookbook" className="text-green-deep">
              <Plus size={16} />
            </Link>
          </div>
          <div className="space-y-2">
            {["The Family Table", "Holiday Favorites", "Grandma's Recipes", "Quick & Easy"].map((title, index) => (
              <Link
                key={title}
                href={`/app/books/${bookId}`}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  index === 0 ? "bg-card-muted text-green-deep" : "text-ink hover:bg-card/70"
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-line-soft bg-card text-base">
                  {index === 0 ? "🥣" : index === 1 ? "🌿" : index === 2 ? "🍅" : "🥘"}
                </span>
                <span className="truncate">{title}</span>
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/app/settings"
          className="mt-auto flex h-12 items-center gap-3 border-t border-line-soft px-8 text-sm font-semibold text-ink hover:bg-card/70"
        >
          <Settings size={18} />
          <span>Settings</span>
        </Link>
      </aside>

      <main className="cookbook-main-panel relative z-10 mx-auto min-h-dvh max-w-[760px] pb-24 lg:ml-[260px] lg:max-w-none lg:pb-0">
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
          const isActive = isAdd
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");

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
