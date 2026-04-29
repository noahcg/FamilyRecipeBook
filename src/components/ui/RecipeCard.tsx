import { clsx } from "clsx";
import { BookOpen, Clock, Heart, Users } from "lucide-react";

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
  attributionPrefix?: string;
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
  attributionPrefix = "Added by",
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
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        {imageUrl ? (
          <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageAlt ?? title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card-muted">
            <BookOpen size={34} strokeWidth={1.25} className="text-green-sage opacity-50" />
          </div>
        )}
        {category && (
          <span className="absolute bottom-2.5 left-2.5 rounded-sm bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-accent-cinnamon shadow-xs backdrop-blur-sm">
            {category}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-card/80 text-white shadow-xs backdrop-blur-sm transition-colors group-hover:bg-card"
        >
          <Heart size={17} strokeWidth={1.8} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)] group-hover:text-green-deep" />
        </span>
      </div>

      {/* Body */}
      <div className="p-3">
        <h3
          className="mb-1 text-base font-semibold leading-snug text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h3>

        {fromPerson && (
          <p className="mb-2 text-xs text-ink-muted">
            {attributionPrefix} {fromPerson}
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
