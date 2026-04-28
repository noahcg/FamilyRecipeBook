import { clsx } from "clsx";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  decorative?: boolean;
  className?: string;
}

function SectionHeader({
  title,
  subtitle,
  action,
  decorative = false,
  className,
}: SectionHeaderProps) {
  return (
    <div className={clsx("flex items-start justify-between gap-4", className)}>
      <div>
        <h2
          className={clsx(
            "text-green-deep font-bold leading-tight",
            decorative
              ? "text-xl italic"
              : "text-base"
          )}
          style={{
            fontFamily: decorative
              ? "var(--font-playfair)"
              : "var(--font-nunito)",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export { SectionHeader };
export type { SectionHeaderProps };
