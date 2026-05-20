// Shared cookbook cover colors. The cover art renders the book body in one of
// these colors with white initials, so every value is dark/saturated enough to
// keep white lettering legible.
export interface BookCoverColor {
  label: string;
  hex: string;
}

export const BOOK_COVER_COLORS: BookCoverColor[] = [
  { label: "Forest", hex: "#2F4F3F" },
  { label: "Sage", hex: "#557A55" },
  { label: "Pine", hex: "#3E5C50" },
  { label: "Teal", hex: "#2C5A5A" },
  { label: "Slate", hex: "#42566B" },
  { label: "Plum", hex: "#5B3A53" },
  { label: "Berry", hex: "#7A2E4A" },
  { label: "Terracotta", hex: "#B95A40" },
  { label: "Brick", hex: "#7A2F1E" },
  { label: "Clay", hex: "#B8754B" },
  { label: "Cinnamon", hex: "#8D5E34" },
  { label: "Coffee", hex: "#5C3218" },
  { label: "Mustard", hex: "#6B4A10" },
  { label: "Olive", hex: "#56611F" },
];

export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Resolves a book's cover color. A stored hex (chosen by the user) is used
 * directly; legacy named styles or anything unrecognized fall back to a
 * deterministic palette pick based on the seed, so each book stays distinct.
 */
export function resolveCoverColor(coverStyle: string | null | undefined, seed: string): string {
  if (coverStyle && HEX_COLOR.test(coverStyle)) return coverStyle;
  return BOOK_COVER_COLORS[hashString(seed) % BOOK_COVER_COLORS.length].hex;
}
