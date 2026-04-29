import { clsx } from "clsx";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, required, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-ink"
            style={{ fontFamily: "var(--font-nunito)" }}
          >
            <span>{label}</span>
            {required && (
              <span className="ml-2 rounded-sm bg-card-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-accent-cinnamon">
                Required
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={clsx(
            "input-cookbook",
            error && "border-danger focus:border-danger",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-danger font-medium"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-ink-soft">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
