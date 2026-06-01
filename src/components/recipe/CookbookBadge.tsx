import Link from "next/link";
import { BookOpen } from "lucide-react";
import { clsx } from "clsx";

interface CookbookBadgeProps {
  title: string;
  /** When provided, the badge links to the cookbook (or any target). */
  href?: string;
  className?: string;
}

const BADGE_CLASS =
  "inline-flex max-w-full items-center gap-1 rounded-sm border border-green-sage/40 bg-green-soft px-2 py-0.5 text-xs font-bold text-green-deep";

/**
 * Small pill identifying which cookbook a recipe belongs to. Used across the
 * account-level (global) recipe listings — My Recipes, Favorites, the Home
 * dashboard, search results — so a recipe's location is clear without opening
 * it. Recipes can be reached by either path (global or cookbook), so this only
 * communicates location, it doesn't change the destination.
 */
export function CookbookBadge({ title, href, className }: CookbookBadgeProps) {
  const content = (
    <>
      <BookOpen size={11} strokeWidth={2} className="shrink-0" />
      <span className="truncate">{title}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={clsx(BADGE_CLASS, "transition-colors hover:border-green-sage/60 hover:bg-green-sage/35", className)}
      >
        {content}
      </Link>
    );
  }

  return <span className={clsx(BADGE_CLASS, className)}>{content}</span>;
}
