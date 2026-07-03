"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

interface GuideBeaconProps {
  anchorEl: HTMLElement;
  label: string;
  onStart: () => void;
}

/**
 * A small pulsing dot pinned to the top-left corner of an anchored control —
 * sitting by the icon at the start of a desktop nav row rather than trailing off
 * its right edge. Opt-in: tapping it starts that guide. Honors
 * prefers-reduced-motion.
 */
export function GuideBeacon({ anchorEl, label, onStart }: GuideBeaconProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    function measure() {
      setRect(anchorEl.getBoundingClientRect());
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [anchorEl]);

  if (!rect || typeof document === "undefined") return null;

  return createPortal(
    <button
      type="button"
      onClick={onStart}
      aria-label={label}
      className="group fixed z-[110] flex h-6 w-6 items-center justify-center"
      style={{ top: rect.top - 8, left: rect.left - 8 }}
    >
      <span className="absolute inline-flex h-4 w-4 rounded-full bg-accent-terracotta/60 motion-safe:animate-ping" />
      <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-cream bg-accent-terracotta shadow-sm transition-transform group-hover:scale-110" />
    </button>,
    document.body
  );
}
