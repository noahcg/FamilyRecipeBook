import { clsx } from "clsx";
import { forwardRef, useId } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Visible label. Provide `aria-label` when a visible label is not appropriate. */
  label?: string;
  /** Use sparingly when an embedded form pattern needs a more compact label. */
  labelClassName?: string;
  /** Validation message announced to assistive technology. */
  error?: string;
  /** Supporting copy shown when the control is valid. */
  hint?: string;
}

/**
 * The canonical native select control for Home Cooked forms.
 *
 * Native selects keep familiar mobile behavior while `input-cookbook` supplies
 * the shared visual treatment. Use this instead of styling a `<select>` inline.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, labelClassName, error, hint, className, id, required, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? `select-${generatedId}`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className={clsx("text-sm font-semibold text-ink", labelClassName)}
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
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={clsx(
            "input-cookbook w-full",
            error && "border-danger focus:border-danger",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
          }
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={`${selectId}-error`} role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="text-xs text-ink-soft">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
export type { SelectProps };
