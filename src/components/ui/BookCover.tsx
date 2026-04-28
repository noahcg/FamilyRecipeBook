import { clsx } from "clsx";
import { BookOpen } from "lucide-react";

type CoverStyle = "sage" | "terracotta" | "mustard" | "forest" | "clay";

const coverGradients: Record<CoverStyle, string> = {
  sage: "from-green-soft to-green-pale",
  terracotta: "from-accent-terracotta/20 to-accent-terracotta/5",
  mustard: "from-accent-mustard/30 to-accent-honey/10",
  forest: "from-green-soft to-green-pale",
  clay: "from-accent-clay/20 to-paper-warm",
};

const coverBorders: Record<CoverStyle, string> = {
  sage: "border-green-soft",
  terracotta: "border-accent-terracotta/30",
  mustard: "border-accent-mustard/40",
  forest: "border-green-soft",
  clay: "border-accent-clay/30",
};

const coverIconColors: Record<CoverStyle, string> = {
  sage: "text-green-sage",
  terracotta: "text-accent-terracotta",
  mustard: "text-accent-honey",
  forest: "text-green-deep",
  clay: "text-accent-clay",
};

interface BookCoverProps {
  title: string;
  subtitle?: string;
  style?: CoverStyle;
  imageUrl?: string;
  memberCount?: number;
  recipeCount?: number;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: "w-28 h-36 rounded-lg",
  md: "w-40 h-52 rounded-xl",
  lg: "w-56 h-72 rounded-2xl",
};

function BookCover({
  title,
  subtitle,
  style = "sage",
  imageUrl,
  memberCount,
  recipeCount,
  size = "md",
  onClick,
  className,
}: BookCoverProps) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden border-2 shadow-card flex flex-col justify-between p-4",
        "transition-transform duration-200 hover:-translate-y-1",
        !imageUrl && `bg-gradient-to-br ${coverGradients[style]}`,
        coverBorders[style],
        sizeClasses[size],
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <BookOpen
          size={size === "sm" ? 28 : size === "md" ? 36 : 48}
          strokeWidth={1.5}
          className={clsx("opacity-30", coverIconColors[style])}
        />
      )}

      {/* Overlay for image covers */}
      {imageUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      )}

      <div className="relative mt-auto">
        <h3
          className={clsx(
            "font-bold leading-tight",
            imageUrl ? "text-ink-inverse" : "text-green-deep",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
          )}
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className={clsx(
              "text-xs mt-0.5",
              imageUrl ? "text-ink-inverse/70" : "text-ink-muted"
            )}
          >
            {subtitle}
          </p>
        )}
        {(memberCount != null || recipeCount != null) && (
          <p
            className={clsx(
              "text-xs mt-1 opacity-60",
              imageUrl ? "text-ink-inverse" : "text-ink-muted"
            )}
          >
            {[
              recipeCount != null && `${recipeCount} recipes`,
              memberCount != null && `${memberCount} members`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

export { BookCover };
export type { BookCoverProps, CoverStyle };
