"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GUIDES, getGuideContext, type Guide } from "@/lib/guides/registry";
import { useGuides } from "@/lib/guides/useGuides";
import { GuideBeacon } from "./GuideBeacon";
import { GuidePopover } from "./GuidePopover";

const RUN_STORAGE_KEY = "homecooked.guide_run";

interface ActiveRun {
  guideId: string;
  stepIndex: number;
}

function readRun(): ActiveRun | null {
  try {
    const raw = window.sessionStorage.getItem(RUN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveRun) : null;
  } catch {
    return null;
  }
}

function writeRun(run: ActiveRun | null) {
  try {
    if (run) window.sessionStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
    else window.sessionStorage.removeItem(RUN_STORAGE_KEY);
  } catch {
    // Resume across the one in-guide navigation is best-effort.
  }
}

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

/**
 * Mounted once inside AppShell. Decides which guide beacon (if any) to show on
 * the current screen and runs the tapped guide's steps — including the single
 * in-guide navigation (e.g. invite → Members), resumed via sessionStorage.
 */
export function GuidesLayer() {
  const pathname = usePathname();
  const router = useRouter();
  const { loaded, isSeen, markSeen } = useGuides();
  // Lazy init resumes an in-progress run after the one in-guide navigation.
  // Guarded for SSR; the `loaded` gate below keeps anything from rendering until
  // after hydration, so there's no markup mismatch.
  const [run, setRun] = useState<ActiveRun | null>(() =>
    typeof window !== "undefined" ? readRun() : null
  );
  // Bumped whenever the DOM/layout might have changed so we re-find anchors.
  const [tick, setTick] = useState(0);

  // Re-evaluate anchors as the page hydrates / async content loads. Coalesce
  // bursts of mutations into a single rAF-batched tick to avoid render churn.
  useEffect(() => {
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
  }, [pathname]);

  const setActiveRun = useCallback((next: ActiveRun | null) => {
    setRun(next);
    writeRun(next);
  }, []);

  // A run is only valid on routes the guide applies to and at a real step index;
  // otherwise the user navigated away mid-guide.
  const activeGuide: Guide | null = run
    ? GUIDES.find((g) => g.id === run.guideId) ?? null
    : null;
  const runValid =
    !!run &&
    !!activeGuide &&
    activeGuide.routeMatch(pathname) &&
    !!activeGuide.steps[run.stepIndex];

  // Drop a stale run (deferred so we don't setState in the effect body).
  useEffect(() => {
    if (run && !runValid) {
      const id = window.setTimeout(() => setActiveRun(null), 0);
      return () => window.clearTimeout(id);
    }
  }, [run, runValid, setActiveRun]);

  if (!loaded) return null;

  // ── Running a guide ───────────────────────────────────────────
  if (run && activeGuide && runValid) {
    const step = activeGuide.steps[run.stepIndex];
    // `tick` keeps the anchor lookup fresh as the DOM settles.
    void tick;
    const anchorEl = findVisibleAnchor(step.anchorId);
    const prevStep = run.stepIndex > 0 ? activeGuide.steps[run.stepIndex - 1] : null;
    const isLast = run.stepIndex === activeGuide.steps.length - 1;

    const finish = () => {
      markSeen(activeGuide.id);
      setActiveRun(null);
    };

    const next = () => {
      if (isLast) {
        finish();
        return;
      }
      const nextIndex = run.stepIndex + 1;
      const href = step.nextHref?.(getGuideContext(pathname));
      setActiveRun({ guideId: activeGuide.id, stepIndex: nextIndex });
      if (href) router.push(href);
    };

    return (
      <GuidePopover
        step={step}
        stepIndex={run.stepIndex}
        stepCount={activeGuide.steps.length}
        anchorEl={anchorEl}
        canGoBack={!!prevStep && !!findVisibleAnchor(prevStep.anchorId)}
        isLast={isLast}
        onBack={() => setActiveRun({ guideId: activeGuide.id, stepIndex: run.stepIndex - 1 })}
        onNext={next}
        onSkip={finish}
        onDismiss={() => setActiveRun(null)}
      />
    );
  }

  // ── Showing beacons ───────────────────────────────────────────
  // One beacon per eligible guide whose first anchor is on screen, so a screen
  // with two guides (e.g. recipes: invite + add-recipe) shows both dots rather
  // than masking one behind the other. A guide is eligible when it's unseen, on
  // a matching route, all its prerequisites are seen (progressive reveal), and
  // its anchor is present.
  void tick;
  const beacons = GUIDES.filter(
    (guide) =>
      !isSeen(guide.id) &&
      (guide.prerequisites?.every(isSeen) ?? true) &&
      guide.routeMatch(pathname) &&
      findVisibleAnchor(guide.steps[0].anchorId)
  );
  if (beacons.length === 0) return null;

  return (
    <>
      {beacons.map((guide) => (
        <GuideBeacon
          key={guide.id}
          anchorEl={findVisibleAnchor(guide.steps[0].anchorId)!}
          label={guide.beaconLabel}
          onStart={() => setActiveRun({ guideId: guide.id, stepIndex: 0 })}
        />
      ))}
    </>
  );
}
