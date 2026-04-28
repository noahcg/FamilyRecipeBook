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
        "flex flex-col items-center justify-center text-center px-6 py-16 gap-4",
        className
      )}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--color-sage-pale)" }}
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
          className="font-bold text-green-deep text-lg leading-snug mb-1"
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
