"use client";

import { clsx } from "clsx";
import { BookOpen, Heart, Plus, Search, User } from "lucide-react";

type NavTab = "home" | "search" | "add" | "favorites" | "profile";

interface BottomNavProps {
  active?: NavTab;
  onNavigate?: (tab: NavTab) => void;
  className?: string;
}

const NAV_ITEMS: Array<{
  id: NavTab;
  icon: React.ElementType;
  label: string;
  isAdd?: boolean;
}> = [
  { id: "home", icon: BookOpen, label: "Book" },
  { id: "search", icon: Search, label: "Search" },
  { id: "add", icon: Plus, label: "Add", isAdd: true },
  { id: "favorites", icon: Heart, label: "Favorites" },
  { id: "profile", icon: User, label: "Profile" },
];

function BottomNav({ active = "home", onNavigate, className }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={clsx(
        "fixed bottom-0 inset-x-0 z-40",
        "flex items-center justify-around",
        "px-2 pb-safe pt-2",
        "border-t border-line-soft",
        className
      )}
      style={{ background: "var(--color-paper)", minHeight: 60 }}
    >
      {NAV_ITEMS.map(({ id, icon: Icon, label, isAdd }) => {
        const isActive = active === id;

        if (isAdd) {
          return (
            <button
              key={id}
              type="button"
              aria-label="Add recipe"
              onClick={() => onNavigate?.(id)}
              className={clsx(
                "flex items-center justify-center",
                "w-14 h-14 rounded-full -mt-5",
                "bg-green-deep text-ink-inverse",
                "shadow-md transition-transform active:scale-95",
                "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
              )}
            >
              <Icon size={26} strokeWidth={2} />
            </button>
          );
        }

        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate?.(id)}
            className={clsx(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[44px] min-h-[44px]",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
              isActive
                ? "bg-green-pale text-green-deep"
                : "text-ink-soft hover:text-ink hover:bg-green-pale/50"
            )}
          >
            <Icon
              size={20}
              strokeWidth={isActive ? 2 : 1.75}
              className="transition-transform duration-100"
            />
            <span className="text-xs font-semibold leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export { BottomNav };
export type { BottomNavProps, NavTab };
