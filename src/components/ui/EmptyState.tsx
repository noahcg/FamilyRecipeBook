import { clsx } from "clsx";
import { BookOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "empty-state flex flex-col items-center justify-center text-center px-6 py-14 gap-4",
        className
      )}
    >
      <div
        className="empty-state__icon flex h-16 w-16 items-center justify-center rounded-md"
      >
        {icon ?? (
          <BookOpen
            size={28}
            strokeWidth={1.5}
            className="text-green-sage"
          />
        )}
      </div>

      <div className="max-w-xs">
        <h3
          className="mb-1 text-xl font-bold leading-snug text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h3>
        {description && (
          <p className="text-sm text-ink-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
