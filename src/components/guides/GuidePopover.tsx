"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useModalFocus } from "@/lib/hooks/useModalFocus";
import { GuideCard } from "./GuideCard";
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
  /** "Skip" — the user is done with the tour; mark it seen. */
  onSkip: () => void;
  /** Esc / click-away — close the tour. */
  onDismiss: () => void;
}

const CARD_WIDTH = 360;
const GAP = 10; // space between the anchor and the caret tip
const MARGIN = 16; // keep-away from the viewport edges
const CARET = 12; // caret square side (pre-rotation)
// The app nav is a left sidebar at ≥lg and a bottom bar below it (see AppShell).
// Above the breakpoint we sit the card to the right of the nav row; below it we
// float above the bottom bar. Matching the nav's own breakpoint keeps the card
// pointed at whichever nav is actually on screen.
const SIDEBAR_MIN = 1024;

type Placement = "right" | "top" | "center";

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
  maxHeight: number;
  placement: Placement;
  /** Offset of the caret along the card edge (from top for "right", left for "top"). */
  caret: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

function computePosition(anchor: DOMRect | null, cardH: number): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // No anchor → centered card, no caret.
  if (!anchor) {
    const width = Math.min(CARD_WIDTH, vw - MARGIN * 2);
    const maxHeight = vh - MARGIN * 2;
    const height = Math.min(cardH, maxHeight);
    return {
      top: clamp((vh - height) / 2, MARGIN, vh - MARGIN - height),
      left: (vw - width) / 2,
      width,
      height,
      maxHeight,
      placement: "center",
      caret: 0,
    };
  }

  const cx = anchor.left + anchor.width / 2;
  const cy = anchor.top + anchor.height / 2;

  // Desktop sidebar: to the RIGHT of the nav row, caret pointing left.
  if (vw >= SIDEBAR_MIN) {
    const width = CARD_WIDTH;
    const maxHeight = vh - MARGIN * 2;
    const height = Math.min(cardH, maxHeight);
    const left = anchor.right + GAP + CARET;
    const top = clamp(cy - height / 2, MARGIN, vh - MARGIN - height);
    const caret = clamp(cy - top, CARET, height - CARET);
    return { top, left, width, height, maxHeight, placement: "right", caret };
  }

  // Bottom bar (mobile / tablet): ABOVE the nav item, caret pointing down.
  const width = Math.min(CARD_WIDTH, vw - MARGIN * 2);
  const maxHeight = Math.max(140, anchor.top - GAP - CARET - MARGIN);
  const height = Math.min(cardH, maxHeight);
  const left = clamp(cx - width / 2, MARGIN, vw - width - MARGIN);
  const top = Math.max(MARGIN, anchor.top - GAP - CARET - height);
  const caret = clamp(cx - left, CARET, width - CARET);
  return { top, left, width, height, maxHeight, placement: "top", caret };
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
  const [position, setPosition] = useState<Position | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  useModalFocus({ containerRef: cardRef, open: true });

  // Measure the anchor + card and (re)position on mount, scroll, resize, card
  // resize (image load), and step change. A ResizeObserver gives us the card's
  // real height so vertical centering and the caret line up.
  useLayoutEffect(() => {
    const card = cardRef.current;
    function measure() {
      const rect = anchorEl?.getBoundingClientRect() ?? null;
      setAnchorRect(rect);
      setPosition(computePosition(rect, card?.offsetHeight ?? 380));
    }
    // On the bottom bar the target item may be scrolled out of the horizontal
    // strip — bring it into view so the caret has something to point at.
    if (anchorEl && window.innerWidth < SIDEBAR_MIN) {
      anchorEl.scrollIntoView({ inline: "center", block: "nearest" });
    }
    measure();
    const ro = card ? new ResizeObserver(measure) : null;
    ro?.observe(card!);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [anchorEl, stepIndex]);

  // Esc closes the tour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  if (typeof document === "undefined") return null;

  const caretStyle: CSSProperties | null =
    position && position.placement === "right"
      ? {
          left: position.left - CARET / 2,
          top: position.top + position.caret - CARET / 2,
          borderLeft: "1px solid var(--color-line-soft)",
          borderBottom: "1px solid var(--color-line-soft)",
        }
      : position && position.placement === "top"
        ? {
            left: position.left + position.caret - CARET / 2,
            top: position.top + position.height - CARET / 2,
            borderRight: "1px solid var(--color-line-soft)",
            borderBottom: "1px solid var(--color-line-soft)",
          }
        : null;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      {/* Dimmer — clicking away closes the tour. No blur: the tour points at the
          nav, so keep what's behind crisp. */}
      <button
        type="button"
        aria-label="Dismiss tip"
        className="absolute inset-0 animate-in fade-in duration-150 bg-ink/30"
        onClick={onDismiss}
      />

      {/* Spotlight ring around the anchored nav item. */}
      {anchorRect && position && position.placement !== "center" && (
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

      <GuideCard
        ref={cardRef}
        eyebrow={stepCount > 1 ? `Step ${stepIndex + 1} of ${stepCount}` : "Tip"}
        title={step.title}
        titleId={titleId}
        body={step.body}
        image={step.image}
        onDismiss={onDismiss}
        className="absolute animate-in fade-in zoom-in-95 duration-200"
        style={{
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          width: position?.width ?? CARD_WIDTH,
          maxHeight: position?.maxHeight,
          visibility: position ? "visible" : "hidden",
        }}
        footer={
          <>
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
          </>
        }
      />

      {/* Caret — a rotated square sibling of the card (the card clips overflow),
          its two outer edges continuing the card border toward the nav item. */}
      {caretStyle && (
        <span
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 rotate-45"
          style={{ background: "var(--color-paper-soft)", ...caretStyle }}
        />
      )}
    </div>,
    document.body
  );
}
