"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  CalendarDays,
  CircleCheck,
  Heart,
  Home,
  BookOpen,
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
import { useUser } from "@/lib/hooks/useUser";
import { listOfflineRecipes, OFFLINE_RECIPES_CHANGED_EVENT } from "@/lib/offlineRecipes";

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

const NAV = (bookId: string, bookTitle: string, hasOfflineRecipes: boolean) => [
  { id: "home", href: `/app/books/${bookId}`, icon: Home, label: "Home" },
  { id: "recipes", href: `/app/books/${bookId}/recipes`, icon: UtensilsCrossed, label: "Recipes" },
  { id: "ideas", href: `/app/books/${bookId}/ideas`, icon: Sparkles, label: "Ideas" },
  { id: "meal-plan", href: `/app/books/${bookId}/meal-plan`, icon: CalendarDays, label: "Meal Plan" },
  { id: "groceries", href: `/app/books/${bookId}/groceries`, icon: ShoppingCart, label: "Groceries" },
  { id: "favorites", href: `/app/books/${bookId}/favorites`, icon: Heart, label: "Favorites" },
  { id: "members", href: `/app/books/${bookId}/members`, icon: Users, label: "Members" },
  { id: "current-book", href: "/app/cookbooks", icon: BookOpen, label: bookTitle, isCurrentBook: true },
  ...(hasOfflineRecipes
    ? [{ id: "offline", href: `/app/books/${bookId}/offline`, icon: Download, label: "Offline" }]
    : []),
  { id: "settings", href: `/app/books/${bookId}/settings`, icon: Settings, label: "Settings" },
  { id: "add", href: `/app/books/${bookId}/recipes/new`, icon: Plus, label: "Add", isAdd: true },
];

const DESKTOP_NAV = (bookId: string, bookTitle: string, hasOfflineRecipes: boolean) => [
  { id: "home", href: `/app/books/${bookId}`, icon: Home, label: "Home" },
  { id: "recipes", href: `/app/books/${bookId}/recipes`, icon: UtensilsCrossed, label: "Recipes" },
  { id: "ideas", href: `/app/books/${bookId}/ideas`, icon: Sparkles, label: "Ideas" },
  { id: "meal-plan", href: `/app/books/${bookId}/meal-plan`, icon: CalendarDays, label: "Meal Plan" },
  { id: "groceries", href: `/app/books/${bookId}/groceries`, icon: ShoppingCart, label: "Groceries" },
  { id: "favorites", href: `/app/books/${bookId}/favorites`, icon: Heart, label: "Favorites" },
  { id: "members", href: `/app/books/${bookId}/members`, icon: Users, label: "Members" },
  { id: "current-book", href: "/app/cookbooks", icon: BookOpen, label: bookTitle, isCurrentBook: true },
  ...(hasOfflineRecipes
    ? [{ id: "offline", href: `/app/books/${bookId}/offline`, icon: Download, label: "Offline" }]
    : []),
];

function isActiveNavItem(pathname: string, href: string, id?: string) {
  if (id === "home") return pathname === href;
  if (id === "add") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, bookId, mobileSideDrawer }: AppShellProps) {
  const pathname = usePathname();
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mobileNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hasOfflineRecipes, setHasOfflineRecipes] = useState(false);
  const { userId } = useUser();
  const { bookTitle, isAdmin } = useBook();
  const navItems = NAV(bookId, bookTitle, hasOfflineRecipes);
  const activeMobileNavId = navItems.find(({ id, href }) => isActiveNavItem(pathname, href, id))?.id;

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const currentUserId = userId;

    async function refreshOfflineState() {
      try {
        const records = await listOfflineRecipes(currentUserId, bookId);
        if (active) setHasOfflineRecipes(records.length > 0);
      } catch {
        if (active) setHasOfflineRecipes(false);
      }
    }

    refreshOfflineState();
    window.addEventListener(OFFLINE_RECIPES_CHANGED_EVENT, refreshOfflineState);

    return () => {
      active = false;
      window.removeEventListener(OFFLINE_RECIPES_CHANGED_EVENT, refreshOfflineState);
    };
  }, [bookId, userId]);

  useEffect(() => {
    if (!activeMobileNavId) return;

    const timeout = window.setTimeout(() => {
      const activeItem = mobileNavItemRefs.current[activeMobileNavId];
      const container = mobileNavRef.current;
      if (!activeItem || !container) return;

      const nextLeft =
        activeItem.offsetLeft - container.clientWidth / 2 + activeItem.clientWidth / 2;

      container.scrollTo({
        left: Math.max(0, nextLeft),
        behavior: "smooth",
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeMobileNavId, pathname]);

  return (
    <div className="app-paper-bg paper-texture min-h-dvh">
      <aside className="cookbook-sidebar fixed inset-y-4 left-4 z-30 hidden w-[280px] overflow-y-auto rounded-l-xl lg:flex lg:flex-col">
        <Link href={`/app/books/${bookId}`} className="shrink-0 px-7 pb-7 pt-7">
          <BrandLockup compact />
        </Link>

        <nav aria-label="Primary navigation" className="shrink-0 px-6">
          <div className="space-y-2.5">
            {DESKTOP_NAV(bookId, bookTitle, hasOfflineRecipes).map(({ id, href, icon: Icon, label, isCurrentBook }) => {
              const isActive = isActiveNavItem(pathname, href, id);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors",
                    isCurrentBook
                      ? "border border-line-soft/80 bg-white-soft/45 text-green-deep hover:bg-white-soft"
                      : isActive
                      ? "bg-green-soft/70 text-green-deep shadow-xs"
                      : "text-ink hover:bg-green-soft/55 hover:text-green-deep"
                  )}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {isCurrentBook && <CircleCheck size={15} className="shrink-0 text-green-deep/70" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-6 shrink-0 border-t border-line-soft p-5">
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
          onClick={mobileSideDrawer.onOpen}
          className="fixed right-0 top-[38dvh] z-30 flex h-[92px] w-8 flex-col items-center justify-center gap-1 rounded-l-[12px] border border-r-0 border-green-sage/35 bg-card/95 text-green-deep shadow-[-4px_8px_18px_rgba(75,53,31,0.10)] backdrop-blur-md transition-[background-color,color,transform] duration-150 hover:bg-green-pale active:translate-x-0.5 lg:hidden min-[360px]:h-[98px] min-[360px]:w-9 min-[425px]:top-[29dvh] min-[425px]:h-[104px] min-[425px]:w-10"
        >
          {mobileSideDrawer.icon}
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-extrabold leading-none">
            {mobileSideDrawer.label}
          </span>
        </button>
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
          ref={mobileNavRef}
          className="mx-auto flex h-[62px] max-w-[760px] items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-[30px] border border-green-deep bg-green-forest-dark p-1.5 shadow-[0_10px_28px_rgba(31,58,45,0.24),inset_0_1px_0_rgba(255,252,246,0.10)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {navItems.map(({ id, href, icon: Icon, label, isAdd, isCurrentBook }) => {
            const isActive = isActiveNavItem(pathname, href, id);

            return (
              <Link
                key={id}
                ref={(element) => {
                  mobileNavItemRefs.current[id] = element;
                }}
                href={href}
                aria-label={isAdd ? "Add recipe" : label}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "relative flex h-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-2 transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-none",
                  isAdd
                    ? "min-w-[64px] bg-accent-terracotta text-ink-inverse hover:bg-accent-terracotta-dark"
                    : isCurrentBook
                      ? "min-w-[86px] border border-white-soft/15 text-ink-inverse hover:bg-green-deep hover:text-ink-inverse"
                    : isActive
                      ? "min-w-[98px] bg-white-soft text-green-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_4px_12px_rgba(14,35,25,0.20)]"
                      : "min-w-[64px] text-ink-inverse hover:bg-green-deep hover:text-ink-inverse"
                )}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.75} />
                {isCurrentBook && (
                  <CircleCheck size={10} className="absolute right-2 top-2 text-green-soft" />
                )}
                <span className="max-w-[84px] truncate text-[10px] font-bold leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
