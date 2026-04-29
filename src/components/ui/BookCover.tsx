import { clsx } from "clsx";
import { CookbookIcon } from "./CookbookIcon";

type CoverStyle = "sage" | "terracotta" | "mustard" | "forest" | "clay";

const coverBg: Record<CoverStyle, string> = {
  sage:      "#DDE7D7",
  terracotta:"#F2DDD6",
  mustard:   "#F5E6C4",
  forest:    "#234436",
  clay:      "#EDD8C4",
};

const coverBorder: Record<CoverStyle, string> = {
  sage:      "#C4D9BD",
  terracotta:"#E0B9AE",
  mustard:   "#E8CFA0",
  forest:    "#1A3329",
  clay:      "#D9B898",
};

const coverTextColor: Record<CoverStyle, string> = {
  sage:      "#2F4F3F",
  terracotta:"#7A2F1E",
  mustard:   "#6B4A10",
  forest:    "#EEF4EA",
  clay:      "#5C3218",
};

const coverIllustration: Record<CoverStyle, string> = {
  sage:      "leaf",
  terracotta:"cooking",
  mustard:   "wheat",
  forest:    "bowl",
  clay:      "home",
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
  const bg = coverBg[style];
  const border = coverBorder[style];
  const textColor = coverTextColor[style];
  const illustration = coverIllustration[style];

  return (
    <div
      className={clsx(
        "relative overflow-hidden flex flex-col justify-between",
        "transition-transform duration-200 hover:-translate-y-1",
        sizeClasses[size],
        onClick && "cursor-pointer",
        className
      )}
      style={{
        background: imageUrl ? undefined : bg,
        border: `2px solid ${border}`,
        boxShadow: "0 4px 20px rgba(35,68,54,0.18), 0 1px 3px rgba(35,68,54,0.12)",
        padding: size === "sm" ? "0.75rem" : "1rem",
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </>
      ) : (
        /* Decorative illustration mark */
        <div className="flex-1 flex items-center justify-center">
          <CookbookIcon
            name={illustration}
            size={size === "sm" ? 30 : size === "md" ? 44 : 58}
            strokeWidth={1.25}
            className="opacity-55"
          />
        </div>
      )}

      <div className="relative mt-auto">
        <h3
          className={clsx(
            "font-bold leading-tight",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
          )}
          style={{ fontFamily: "var(--font-playfair)", color: imageUrl ? "#FFF9EE" : textColor }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="text-xs mt-0.5"
            style={{ color: imageUrl ? "rgba(255,249,238,0.7)" : textColor, opacity: imageUrl ? 1 : 0.7 }}
          >
            {subtitle}
          </p>
        )}
        {(memberCount != null || recipeCount != null) && (
          <p
            className="text-xs mt-1"
            style={{ color: textColor, opacity: 0.6 }}
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
