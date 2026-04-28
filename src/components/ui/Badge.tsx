import { clsx } from "clsx";

type BadgeVariant =
  | "default"
  | "sage"
  | "terracotta"
  | "mustard"
  | "keeper"
  | "contributor"
  | "family";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: "var(--color-sage-pale)", color: "var(--color-deep-green)" },
  sage: { bg: "var(--color-sage-soft)", color: "var(--color-forest)" },
  terracotta: {
    bg: "rgba(231,111,81,0.12)",
    color: "var(--color-terracotta-dark)",
  },
  mustard: { bg: "rgba(242,179,72,0.2)", color: "var(--color-cinnamon)" },
  keeper: { bg: "var(--color-deep-green)", color: "var(--color-text-inverse)" },
  contributor: { bg: "var(--color-sage-soft)", color: "var(--color-forest)" },
  family: { bg: "var(--color-paper-warm)", color: "var(--color-text-muted)" },
};

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const { bg, color } = VARIANTS[variant];
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold",
        className
      )}
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}

export type { BadgeVariant };
