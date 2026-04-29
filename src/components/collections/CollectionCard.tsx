import { clsx } from "clsx";
import type { Collection } from "@/lib/types";
import { CookbookIcon, normalizeCookbookIcon } from "@/components/ui/CookbookIcon";

interface CollectionCardProps {
  collection: Collection;
  recipeCount?: number;
  onClick?: () => void;
  className?: string;
}

const DEFAULT_ICONS: Record<string, string> = {
  Holidays: "holiday",
  "Quick Meals": "quick",
  "Sunday Dinners": "dinner",
  "Grandma's Recipes": "grandma",
  "Weeknight Favorites": "weeknight",
};

export function CollectionCard({
  collection,
  recipeCount,
  onClick,
  className,
}: CollectionCardProps) {
  const icon =
    normalizeCookbookIcon(collection.icon ?? DEFAULT_ICONS[collection.title], "book");

  return (
    <div
      className={clsx("recipe-card flex min-h-28 cursor-pointer flex-col items-center justify-center p-4 text-center", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="min-w-0">
        <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-card-muted">
          <CookbookIcon name={icon} size={25} />
        </span>
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
