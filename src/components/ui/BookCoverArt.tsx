import { clsx } from "clsx";
import { resolveCoverColor } from "@/lib/bookCovers";

interface BookCoverArtProps {
  title: string;
  /** Stable identifier used for the fallback color. */
  seed: string;
  /** Explicit cover color (hex). When omitted, a color is derived from `seed`. */
  color?: string;
  className?: string;
}

/** Decorative cover; its surrounding UI supplies the accessible cookbook title. */
function BookCoverArt({ title, seed, color, className }: BookCoverArtProps) {
  const fill = color ?? resolveCoverColor(null, seed);
  const displayTitle = title.trim() || "Your Book";
  const titleSize = displayTitle.length > 55 ? 7 : displayTitle.length > 30 ? 8 : 9;

  return (
    <span
      aria-hidden="true"
      className={clsx("relative block aspect-[4/5]", className)}
      style={{ containerType: "inline-size" }}
    >
      {/* Back board and page block peek out behind the front cover. */}
      <span className="absolute inset-y-[2%] left-[2%] right-0 rounded-r-[4%] bg-black/25 shadow-[0_8px_14px_-6px_rgba(45,35,25,0.45)]" style={{ backgroundColor: fill }} />
      <span className="absolute bottom-[3%] right-[1.5%] top-[3%] w-[5%] rounded-r-[25%] border-y border-r border-black/20 bg-[repeating-linear-gradient(to_bottom,#ede5d3_0px,#ede5d3_2px,#cfc5b0_3px)]" />
      <span
        className="absolute bottom-[1%] left-0 right-[4%] top-0 overflow-hidden rounded-l-[2%] border border-black/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_0_24px_rgba(0,0,0,0.14)]"
        style={{ backgroundColor: fill }}
      >
        <span className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
        <span className="absolute inset-y-0 left-0 w-[8%] border-r border-black/15 bg-gradient-to-r from-black/20 to-transparent" />
        <span className="absolute bottom-[6%] left-[12%] right-[6%] top-[6%] border border-white/40" />
        <span className="absolute bottom-[12%] left-[16%] right-[10%] top-[12%] flex flex-col items-center justify-center text-center text-[#f7ebce]">
          <span
            className="block w-full overflow-hidden break-words font-medium leading-[1.15] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] [font-family:var(--font-playfair),Georgia,serif]"
            style={{ fontSize: `${titleSize}cqw` }}
          >
            {displayTitle}
          </span>
          <span className="mt-[8%] block h-px w-[28%] bg-current opacity-60" />
        </span>
      </span>
    </span>
  );
}

export { BookCoverArt };
export type { BookCoverArtProps };
