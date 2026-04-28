"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BookOpen, Search, Plus, Heart, User } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  bookId: string;
}

const NAV = (bookId: string) => [
  { id: "home", href: `/app/books/${bookId}`, icon: BookOpen, label: "Book" },
  { id: "search", href: `/app/books/${bookId}/recipes`, icon: Search, label: "Recipes" },
  { id: "add", href: `/app/books/${bookId}/recipes/new`, icon: Plus, label: "Add", isAdd: true },
  { id: "collections", href: `/app/books/${bookId}/collections`, icon: Heart, label: "Collections" },
  { id: "profile", href: `/app/settings`, icon: User, label: "Profile" },
];

export function AppShell({ children, bookId }: AppShellProps) {
  const pathname = usePathname();
  const navItems = NAV(bookId);

  return (
    <div className="app-paper-bg paper-texture min-h-dvh">
      <main className="max-w-[760px] mx-auto pb-24 relative z-10">
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2 pb-safe pt-2 border-t border-line-soft"
        style={{ background: "rgba(247,243,233,0.97)", backdropFilter: "blur(8px)", minHeight: 60 }}
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
                className="flex items-center justify-center w-14 h-14 rounded-full -mt-5 bg-green-deep text-ink-inverse shadow-md transition-transform active:scale-95 focus-visible:outline-none"
              >
                <Icon size={26} strokeWidth={2} />
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
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[44px] min-h-[44px]",
                "transition-colors duration-150 focus-visible:outline-none",
                isActive
                  ? "text-green-deep"
                  : "text-ink-soft hover:text-ink"
              )}
              style={isActive ? { background: "var(--color-sage-pale)" } : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.75} />
              <span className="text-xs font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
