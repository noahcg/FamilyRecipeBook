import { clsx } from "clsx";
import { hashString, resolveCoverColor } from "@/lib/bookCovers";

// Up to three initials drawn from the book name: the first letter of each of
// the first three words, or the leading letters of a single-word title.
function getInitials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    const letters = words[0].replace(/[^a-zA-Z0-9]/g, "");
    return (letters.slice(0, 3) || "?").toUpperCase();
  }
  const initials = words
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, "")[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("");
  return (initials || "?").toUpperCase();
}

// Hue of a hex color (0–360); used to pick a bookmark that contrasts the cover.
function hexHue(hex: string) {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

// The covers are warm/earthy or cool. Pick a ribbon from the opposite family so
// the bookmark always reads as a distinct, contrasting accent.
const RIBBON_WARM = "#F2B34B"; // mustard — for cool covers (greens, blues, purples)
const RIBBON_COOL = "#5FA8A0"; // teal — for warm covers (terracotta, clay, brown)

function bookmarkColor(coverHex: string) {
  const hue = hexHue(coverHex);
  if (hue == null) return RIBBON_WARM;
  const isWarm = hue >= 10 && hue < 100;
  return isWarm ? RIBBON_COOL : RIBBON_WARM;
}

interface BookCoverArtProps {
  title: string;
  /** Stable identifier (e.g. book id) used for the fallback color and unique gradient ids. */
  seed: string;
  /** Explicit cover color (hex). When omitted, a color is derived from `seed`. */
  color?: string;
  className?: string;
}

function BookCoverArt({ title, seed, color, className }: BookCoverArtProps) {
  const fill = color ?? resolveCoverColor(null, seed);
  const bookmark = bookmarkColor(fill);
  const initials = getInitials(title);
  // Shrink the lettering as it gets wider so three initials still fit the cover.
  const fontSize = initials.length >= 3 ? 68 : initials.length === 2 ? 84 : 100;
  const uid = seed.replace(/[^a-zA-Z0-9]/g, "") || hashString(seed).toString(36);
  const sheenId = `coverSheen-${uid}`;
  const spineId = `spineShade-${uid}`;
  const shadowId = `softShadow-${uid}`;

  return (
    <svg
      viewBox="0 0 320 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={clsx("h-auto", className)}
      style={{ color: fill }}
    >
      <defs>
        <linearGradient id={sheenId} x1="70" y1="28" x2="292" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0.14" />
          <stop offset="0.45" stopColor="white" stopOpacity="0.03" />
          <stop offset="1" stopColor="black" stopOpacity="0.10" />
        </linearGradient>
        <linearGradient id={spineId} x1="18" y1="220" x2="98" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="black" stopOpacity="0.24" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.10" />
          <stop offset="1" stopColor="black" stopOpacity="0.18" />
        </linearGradient>
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="125%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Book body */}
      <path filter={`url(#${shadowId})`} d="M26 20H292L306 34V406L292 420H26L14 408V32L26 20Z" fill="currentColor" />
      <path d="M26 20H292L306 34V406L292 420H26L14 408V32L26 20Z" fill={`url(#${sheenId})`} />

      {/* Small angled corner facets */}
      <path d="M292 20L306 34H292V20Z" fill="black" fillOpacity="0.16" />
      <path d="M292 420L306 406H292V420Z" fill="black" fillOpacity="0.18" />
      <path d="M26 420L14 408H26V420Z" fill="black" fillOpacity="0.18" />
      <path d="M26 20L14 32H26V20Z" fill="white" fillOpacity="0.12" />

      {/* Spine */}
      <path d="M26 20H96V420H26L14 408V32L26 20Z" fill={`url(#${spineId})`} />
      <rect x="43" y="20" width="22" height="400" fill="white" fillOpacity="0.08" />
      <rect x="74" y="20" width="6" height="400" fill="black" fillOpacity="0.14" />
      <rect x="90" y="20" width="6" height="400" fill="white" fillOpacity="0.08" />

      {/* Bookmark — a contrasting ribbon, with a center fold (left lit, right shaded) */}
      <path d="M116 20H158V112L137 92L116 112V20Z" fill={bookmark} />
      <path d="M116 20H137V92L116 112V20Z" fill="white" fillOpacity="0.12" />
      <path d="M137 20H158V112L137 92V20Z" fill="black" fillOpacity="0.18" />

      {/* Initials derived from the book name */}
      <text
        x="198"
        y="226"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={fontSize}
        fontWeight="700"
        letterSpacing={initials.length >= 3 ? -4 : -6}
        fill="white"
      >
        {initials}
      </text>
    </svg>
  );
}

export { BookCoverArt };
export type { BookCoverArtProps };
