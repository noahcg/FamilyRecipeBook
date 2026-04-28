import { clsx } from "clsx";
import { Clock, Heart, Users } from "lucide-react";

interface RecipeCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  fromPerson?: string;
  cookTime?: string;
  servings?: number;
  loveCount?: number;
  category?: string;
  onClick?: () => void;
  className?: string;
}

function RecipeCard({
  title,
  description,
  imageUrl,
  imageAlt,
  fromPerson,
  cookTime,
  servings,
  loveCount,
  category,
  onClick,
  className,
}: RecipeCardProps) {
  return (
    <article
      className={clsx(
        "recipe-card overflow-hidden cursor-pointer group",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Image */}
      {imageUrl && (
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageAlt ?? title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {category && (
            <span
              className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-pill"
              style={{
                background: "var(--color-card)",
                color: "var(--color-cinnamon)",
                border: "1px solid var(--color-border-soft)",
              }}
            >
              {category}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        <h3
          className="font-bold text-ink text-base leading-snug mb-1"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h3>

        {fromPerson && (
          <p className="text-xs text-ink-soft font-medium mb-2">
            from {fromPerson}
          </p>
        )}

        {description && (
          <p className="text-sm text-ink-muted leading-normal line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Meta row */}
        {(cookTime || servings != null || loveCount != null) && (
          <div className="flex items-center gap-3 text-xs text-ink-soft">
            {cookTime && (
              <span className="flex items-center gap-1">
                <Clock size={12} strokeWidth={1.75} />
                {cookTime}
              </span>
            )}
            {servings != null && (
              <span className="flex items-center gap-1">
                <Users size={12} strokeWidth={1.75} />
                {servings}
              </span>
            )}
            {loveCount != null && (
              <span className="flex items-center gap-1 ml-auto">
                <Heart
                  size={12}
                  strokeWidth={1.75}
                  className="text-accent-terracotta"
                />
                {loveCount}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export { RecipeCard };
export type { RecipeCardProps };
