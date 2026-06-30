"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useModalFocus } from "@/lib/hooks/useModalFocus";
import type { GuideStep } from "@/lib/guides/registry";

interface GuidePopoverProps {
  step: GuideStep;
  stepIndex: number;
  stepCount: number;
  /** The on-screen element this step describes; null → centered fallback. */
  anchorEl: HTMLElement | null;
  canGoBack: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  /** "Skip" — the user is done with this guide; mark it seen. */
  onSkip: () => void;
  /** Esc / click-away — pause without marking seen (beacon stays). */
  onDismiss: () => void;
}

const CARD_WIDTH = 360;
const GAP = 12;
const MARGIN = 16;

interface Position {
  top: number;
  left: number;
  /** When true the card is pinned to the bottom (mobile bottom-sheet). */
  sheet: boolean;
}

function computePosition(anchor: DOMRect | null): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 640;

  if (isMobile || !anchor) {
    return { top: 0, left: 0, sheet: true };
  }

  // Prefer below the anchor; flip above when there isn't room.
  const width = Math.min(CARD_WIDTH, vw - MARGIN * 2);
  let left = anchor.left + anchor.width / 2 - width / 2;
  left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));

  const estimatedHeight = 380; // generous; clamped into the viewport below.
  const below = anchor.bottom + GAP;
  const fitsBelow = below + estimatedHeight <= vh - MARGIN;
  const top = fitsBelow
    ? below
    : Math.max(MARGIN, anchor.top - GAP - estimatedHeight);

  return { top, left, sheet: false };
}

export function GuidePopover({
  step,
  stepIndex,
  stepCount,
  anchorEl,
  canGoBack,
  isLast,
  onBack,
  onNext,
  onSkip,
  onDismiss,
}: GuidePopoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, sheet: true });
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  useModalFocus({ containerRef: cardRef, open: true });

  // Measure the anchor and reposition on mount, scroll, resize, and step change.
  useLayoutEffect(() => {
    function measure() {
      const rect = anchorEl?.getBoundingClientRect() ?? null;
      setAnchorRect(rect);
      setPosition(computePosition(rect));
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [anchorEl, stepIndex]);

  // Esc pauses the guide without marking it seen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      {/* Dimmer — clicking away pauses the guide. */}
      <button
        type="button"
        aria-label="Dismiss tip"
        className="absolute inset-0 animate-in fade-in duration-150 bg-ink/30"
        onClick={onDismiss}
      />

      {/* Spotlight ring around the anchored control. */}
      {anchorRect && !position.sheet && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg ring-2 ring-accent-terracotta ring-offset-2 ring-offset-cream transition-all"
          style={{
            top: anchorRect.top - 4,
            left: anchorRect.left - 4,
            width: anchorRect.width + 8,
            height: anchorRect.height + 8,
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          "absolute flex w-full flex-col overflow-hidden rounded-2xl border border-line-soft shadow-lg",
          "animate-in fade-in duration-200",
          position.sheet
            ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-2 right-2 mx-auto max-w-[420px] slide-in-from-bottom-4 sm:bottom-4"
            : "slide-in-from-top-1"
        )}
        style={{
          background: "var(--color-paper-soft)",
          ...(position.sheet
            ? {}
            : { top: position.top, left: position.left, width: CARD_WIDTH }),
        }}
      >
        {step.image && (
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-green-soft/50">
            {/* Plain img (small local static asset) keeps the aspect ratio
                reserved so there's no layout shift; swap the file in /public to
                update the screenshot. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={step.image.src}
              alt={step.image.alt}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 px-5 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
              {stepCount > 1 ? `Step ${stepIndex + 1} of ${stepCount}` : "Tip"}
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss tip"
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-line-soft"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <h2
            id={titleId}
            className="text-lg font-bold leading-tight text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {step.title}
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">{step.body}</p>

          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-semibold text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Skip
            </button>

            <div className="flex items-center gap-2">
              {canGoBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-10 items-center gap-1.5 rounded-md border border-line-soft px-3 text-sm font-semibold text-ink transition-colors hover:bg-card/70"
                >
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                className="flex h-10 items-center gap-1.5 rounded-md bg-green-deep px-4 text-sm font-semibold text-ink-inverse shadow-xs transition-colors hover:bg-green-forest-dark"
              >
                {isLast ? (
                  <>
                    <Check size={15} /> Got it
                  </>
                ) : (
                  <>
                    Next <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
