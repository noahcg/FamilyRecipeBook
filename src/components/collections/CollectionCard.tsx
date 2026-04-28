import { clsx } from "clsx";
import type { Collection } from "@/lib/types";

interface CollectionCardProps {
  collection: Collection;
  recipeCount?: number;
  onClick?: () => void;
  className?: string;
}

const DEFAULT_ICONS: Record<string, string> = {
  Holidays: "🎄",
  "Quick Meals": "⚡",
  "Sunday Dinners": "🍽️",
  "Grandma's Recipes": "❤️",
  "Weeknight Favorites": "🌙",
};

export function CollectionCard({
  collection,
  recipeCount,
  onClick,
  className,
}: CollectionCardProps) {
  const icon =
    collection.icon ?? DEFAULT_ICONS[collection.title] ?? "📖";

  return (
    <div
      className={clsx(
        "recipe-card p-4 cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <div className="min-w-0">
          <h3
            className="font-bold text-green-deep truncate"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {collection.title}
          </h3>
          {(collection.description || recipeCount != null) && (
            <p className="text-xs text-ink-soft mt-0.5">
              {collection.description ??
                `${recipeCount ?? 0} recipe${recipeCount !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
