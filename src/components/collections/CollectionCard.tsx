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
      className={clsx("recipe-card flex min-h-28 cursor-pointer flex-col items-center justify-center p-4 text-center", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="min-w-0">
        <span className="mb-3 block text-3xl" aria-hidden="true">{icon}</span>
        <div>
          <h3
            className="truncate font-semibold text-green-deep"
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
