"use client";

import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import type { GuideStepImage } from "@/lib/guides/registry";

interface GuideCardProps {
  /** Small uppercase label above the title, e.g. "Step 2 of 5". Omit for none. */
  eyebrow?: string;
  title: string;
  titleId?: string;
  body: string;
  /** Optional hero screenshot shown at the top (16:10). */
  image?: GuideStepImage;
  /** Renders an X in the header when provided. */
  onDismiss?: () => void;
  /** Footer controls (buttons). Laid out with space-between. */
  footer: ReactNode;
  /** Positioning / animation classes supplied by the caller. */
  className?: string;
  style?: CSSProperties;
}

/**
 * The shared onboarding card chrome used by both the welcome modal and the tour
 * step popover, so they read as the same object. Header / scrollable body /
 * pinned footer are separate rows so that on short viewports the body scrolls
 * while the eyebrow and footer controls stay put. The caller owns positioning
 * (centered modal vs. anchored popover) via `className`/`style`.
 */
export const GuideCard = forwardRef<HTMLDivElement, GuideCardProps>(function GuideCard(
  { eyebrow, title, titleId, body, image, onDismiss, footer, className, style },
  ref
) {
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={clsx(
        "flex flex-col overflow-hidden rounded-2xl border border-line-soft shadow-lg",
        className
      )}
      style={{ background: "var(--color-paper-soft)", ...style }}
    >
      {image && (
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-green-soft/50">
          {/* Plain img (small local static asset) keeps the aspect ratio reserved
              so there's no layout shift; swap the file in /public to update it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {(eyebrow || onDismiss) && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-4">
            {eyebrow ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                {eyebrow}
              </span>
            ) : (
              <span />
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss"
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-line-soft"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}

        <div
          className={clsx(
            "min-h-0 flex-1 overflow-y-auto px-5",
            !(eyebrow || onDismiss) && "pt-5"
          )}
        >
          <h2
            id={titleId}
            className="text-lg font-bold leading-tight text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4 pt-3">
          {footer}
        </div>
      </div>
    </div>
  );
});
