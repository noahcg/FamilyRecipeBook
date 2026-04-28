import { clsx } from "clsx";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "bg-green-deep text-ink-inverse font-bold",
    "hover:bg-green-forest",
    "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
    "shadow-xs",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  secondary: [
    "bg-card text-green-deep font-bold border border-line",
    "hover:bg-green-pale",
    "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  ghost: [
    "bg-transparent text-green-deep font-semibold",
    "hover:bg-green-pale",
    "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  danger: [
    "bg-danger text-ink-inverse font-bold",
    "hover:opacity-90",
    "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 text-sm rounded-sm",
  md: "min-h-12 px-5 text-base rounded-sm",
  lg: "min-h-14 px-6 text-lg rounded-md",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
