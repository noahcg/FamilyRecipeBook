"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  CalendarDays,
  Heart,
  Home,
  Library,
  LogOut,
  ShieldCheck,
  Settings,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { CookbookNavigator } from "@/components/layout/CookbookNavigator";
import { APP_VERSION } from "@/lib/version";
import { signOut } from "@/lib/actions/auth";
import { useAccount } from "@/lib/context/AccountContext";

interface AppShellProps {
  children: React.ReactNode;
  /** Legacy prop — the rail is account-level now and no longer driven by this. */
  bookId?: string;
  bookTitle?: string;
  // Onboarding mode: keep the shell chrome but hide navigation so a user
  // without a book can't wander into the app before finishing onboarding.
  lockNav?: boolean;
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

interface NavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}

// Account-level navigation — the same everywhere, never tied to a cookbook.
const ACCOUNT_NAV: NavItem[] = [
  { id: "home", href: "/app", icon: Home, label: "Home", exact: true },
  { id: "meal-plan", href: "/app/meal-plan", icon: CalendarDays, label: "Meal Plan" },
  { id: "groceries", href: "/app/groceries", icon: ShoppingCart, label: "Groceries" },
  { id: "recipes", href: "/app/recipes", icon: UtensilsCrossed, label: "My Recipes" },
  { id: "favorites", href: "/app/favorites", icon: Heart, label: "Favorites" },
  { id: "ideas", href: "/app/ideas", icon: Sparkles, label: "Ideas" },
];

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const railItemClass = (isActive: boolean) =>
  clsx(
    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors",
    isActive
      ? "bg-green-soft/70 text-green-deep shadow-xs"
      : "text-ink hover:bg-green-soft/55 hover:text-green-deep"
  );

export function AppShell({ children, lockNav = false, mobileSideDrawer }: AppShellProps) {
  const pathname = usePathname();
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mobileNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [cookbooksMobileOpen, setCookbooksMobileOpen] = useState(false);
  const { isAdmin } = useAccount();
  // The active cookbook on book routes comes straight from the URL.
  const currentBookId = pathname.match(/^\/app\/books\/([^/]+)/)?.[1] ?? null;

  const settingsActive = isActivePath(pathname, "/app/settings");
  const activeMobileId = ACCOUNT_NAV.find((item) => isActivePath(pathname, item.href, item.exact))?.id;

  useEffect(() => {
    if (!activeMobileId) return;
    const timeout = window.setTimeout(() => {
      const activeItem = mobileNavItemRefs.current[activeMobileId];
      const container = mobileNavRef.current;
      if (!activeItem || !container) return;
      const nextLeft = activeItem.offsetLeft - container.clientWidth / 2 + activeItem.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeMobileId, pathname]);

  return (
    <div className="app-paper-bg paper-texture min-h-dvh">
      <aside className="cookbook-sidebar fixed inset-y-4 left-4 z-30 hidden w-[280px] overflow-y-auto rounded-l-xl lg:flex lg:flex-col">
        <Link href="/app" className="shrink-0 px-7 pb-7 pt-7">
          <BrandLockup compact />
        </Link>

        {!lockNav && (
          <nav aria-label="Primary navigation" className="shrink-0 px-6">
            <div className="space-y-2.5">
              {ACCOUNT_NAV.map(({ id, href, icon: Icon, label, exact }) => {
                const isActive = isActivePath(pathname, href, exact);
                return (
                  <Link
                    key={id}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={railItemClass(isActive)}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-2.5 border-t border-line-soft pt-2.5">
              <CookbookNavigator
                currentBookId={currentBookId}
                mobileOpen={cookbooksMobileOpen}
                onMobileOpenChange={setCookbooksMobileOpen}
              />
            </div>
          </nav>
        )}

        <div className="mt-auto shrink-0 border-t border-line-soft p-5">
          {!lockNav && isAdmin && (
            <Link
              href="/app/admin"
              className="mb-1 flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-accent-cinnamon transition-colors hover:bg-accent-honey/20 hover:text-accent-terracotta-dark"
            >
              <ShieldCheck size={17} className="shrink-0" />
              <span>Admin</span>
            </Link>
          )}
          {!lockNav && (
            <Link
              href="/app/settings"
              aria-current={settingsActive ? "page" : undefined}
              className={clsx(
                "flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors hover:bg-card/70",
                settingsActive ? "bg-green-soft/70 text-green-deep shadow-xs" : "text-ink"
              )}
            >
              <Settings size={18} className="shrink-0" />
              <span>Settings</span>
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-card/70 hover:text-ink"
            >
              <LogOut size={16} className="shrink-0" />
              <span>Sign out</span>
            </button>
          </form>
          <p className="mt-2 px-3 text-[11px] font-semibold text-ink-soft/80">v{APP_VERSION}</p>
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
          {!lockNav &&
            ACCOUNT_NAV.map(({ id, href, icon: Icon, label, exact }) => {
              const isActive = isActivePath(pathname, href, exact);
              return (
                <Link
                  key={id}
                  ref={(element) => {
                    mobileNavItemRefs.current[id] = element;
                  }}
                  href={href}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "relative flex h-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-2 transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-none",
                    isActive
                      ? "min-w-[92px] bg-white-soft text-green-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_4px_12px_rgba(14,35,25,0.20)]"
                      : "min-w-[64px] text-ink-inverse hover:bg-green-deep hover:text-ink-inverse"
                  )}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.2 : 1.75} />
                  <span className="max-w-[84px] truncate text-[10px] font-bold leading-none">{label}</span>
                </Link>
              );
            })}

          {!lockNav && (
            <button
              type="button"
              onClick={() => setCookbooksMobileOpen(true)}
              aria-label="Cookbooks"
              aria-expanded={cookbooksMobileOpen}
              className="relative flex h-full min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-2 text-ink-inverse transition-[background-color,color,transform] duration-150 active:translate-y-px hover:bg-green-deep hover:text-ink-inverse focus-visible:outline-none"
            >
              <Library size={19} strokeWidth={1.75} />
              <span className="max-w-[84px] truncate text-[10px] font-bold leading-none">Cookbooks</span>
            </button>
          )}

          {!lockNav && (
            <Link
              href="/app/settings"
              aria-label="Settings"
              aria-current={settingsActive ? "page" : undefined}
              className={clsx(
                "relative flex h-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-2 transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-none",
                settingsActive
                  ? "min-w-[92px] bg-white-soft text-green-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_4px_12px_rgba(14,35,25,0.20)]"
                  : "min-w-[64px] text-ink-inverse hover:bg-green-deep hover:text-ink-inverse"
              )}
            >
              <Settings size={19} strokeWidth={1.75} />
              <span className="max-w-[84px] truncate text-[10px] font-bold leading-none">Settings</span>
            </Link>
          )}

          <form action={signOut} className="contents">
            <button
              type="submit"
              aria-label="Logout"
              className="relative flex h-full min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-2 text-ink-inverse transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-none hover:bg-green-deep hover:text-ink-inverse"
            >
              <LogOut size={19} strokeWidth={1.75} />
              <span className="max-w-[84px] truncate text-[10px] font-bold leading-none">Logout</span>
            </button>
          </form>
        </div>
      </nav>
    </div>
  );
}
