"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui";
import { useModalFocus } from "@/lib/hooks/useModalFocus";
import { useGuides } from "@/lib/guides/useGuides";
import { WELCOME_TOUR_ID, WELCOME_TOUR_STEPS } from "@/lib/guides/registry";
import { GuideCard } from "./GuideCard";
import { GuidePopover } from "./GuidePopover";

const WELCOME_IMAGE = {
  src: "/guides/welcome-home.webp",
  alt: "The Home Cooked home screen with your recipes, meal plan, and groceries.",
} as const;

/** First rendered element carrying the anchor id (skips display:none copies). */
function findVisibleAnchor(anchorId: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(
    `[data-guide-anchor="${anchorId}"]`
  );
  for (const el of els) {
    if (el.offsetParent !== null || el.getClientRects().length > 0) return el;
  }
  return null;
}

/** Centered welcome modal — same card chrome as the tour steps ({@link GuideCard}). */
function WelcomeModal({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocus({ containerRef: cardRef, open: true });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSkip]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Barely-there blur — just enough to lift the card off the page. This is
          the ONLY onboarding surface with any blur; the tour steps have none. */}
      <button
        type="button"
        aria-label="Skip"
        onClick={onSkip}
        className="absolute inset-0 animate-in fade-in duration-150 bg-ink/30 backdrop-blur-[2px]"
      />
      <GuideCard
        ref={cardRef}
        title="Welcome to Home Cooked"
        titleId={titleId}
        body="Take a quick tour of the basics — your cookbooks, inviting family, meal planning, and your grocery list. It only takes a moment."
        image={WELCOME_IMAGE}
        className="relative w-full max-w-[380px] max-h-[calc(100dvh-2rem)] animate-in fade-in zoom-in-95 duration-200"
        footer={
          <>
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-semibold text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Skip
            </button>
            <Button variant="primary" size="sm" className="rounded-md" onClick={onStart}>
              <Compass size={16} /> Show me around
            </Button>
          </>
        }
      />
    </div>,
    document.body
  );
}

/**
 * One-time onboarding. Shows a welcome modal on the home screen; on "Show me
 * around" it runs the {@link WELCOME_TOUR_STEPS} back-to-back in a
 * {@link GuidePopover}, spotlighting the Bookshelf / Meal Plan / Groceries nav
 * items in place (no navigation). Marks the tour seen as soon as it's started or
 * skipped, so it never auto-returns; replay lives in Settings.
 *
 * Mounted in the home page (`/app`). The modal and popover both portal to
 * document.body; the nav items the tour points at live in AppShell.
 */
export function WelcomeTour() {
  const { loaded, isSeen, markSeen } = useGuides();
  // null = not running; otherwise the active step index.
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  // Bumped when the DOM/layout might have changed so we re-find the anchor.
  const [tick, setTick] = useState(0);

  // While running, re-evaluate the anchor as the page settles (scroll/resize are
  // handled inside GuidePopover; this catches async layout/content shifts).
  useEffect(() => {
    if (stepIndex === null) return;
    let frame = 0;
    const bump = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setTick((t) => t + 1);
      });
    };
    const observer = new MutationObserver(bump);
    observer.observe(document.body, { childList: true, subtree: true });
    bump();
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [stepIndex]);

  if (!loaded) return null;

  // ── Running the tour ──────────────────────────────────────────
  if (stepIndex !== null) {
    const step = WELCOME_TOUR_STEPS[stepIndex];
    void tick; // keep the anchor lookup fresh as the DOM settles
    const anchorEl = findVisibleAnchor(step.anchorId);
    const prevStep = stepIndex > 0 ? WELCOME_TOUR_STEPS[stepIndex - 1] : null;
    const isLast = stepIndex === WELCOME_TOUR_STEPS.length - 1;

    return (
      <GuidePopover
        step={step}
        stepIndex={stepIndex}
        stepCount={WELCOME_TOUR_STEPS.length}
        anchorEl={anchorEl}
        canGoBack={!!prevStep && !!findVisibleAnchor(prevStep.anchorId)}
        isLast={isLast}
        onBack={() => setStepIndex(stepIndex - 1)}
        onNext={() => setStepIndex(isLast ? null : stepIndex + 1)}
        onSkip={() => setStepIndex(null)}
        onDismiss={() => setStepIndex(null)}
      />
    );
  }

  // ── Welcome modal ─────────────────────────────────────────────
  if (isSeen(WELCOME_TOUR_ID)) return null;

  return (
    <WelcomeModal
      onSkip={() => markSeen(WELCOME_TOUR_ID)}
      onStart={() => {
        markSeen(WELCOME_TOUR_ID);
        setStepIndex(0);
      }}
    />
  );
}
