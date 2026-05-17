"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

const SCALE_OPTIONS = [
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
  { value: 4, label: "4x" },
  { value: 5, label: "5x" },
];

interface ServingScalerProps {
  baseServings: number;
  scale: number;
  onChange: (scale: number) => void;
}

export function ServingScaler({ baseServings, scale, onChange }: ServingScalerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-9 min-w-20 items-center justify-between gap-2 rounded-md border border-line-soft bg-card px-3 text-sm font-extrabold text-green-deep shadow-xs transition-colors hover:border-green-sage hover:bg-green-pale/55 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        {scale}x
        <ChevronDown size={15} className={clsx("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close scale menu"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute right-0 top-11 z-50 w-32 overflow-hidden rounded-md border border-line-soft bg-paper-soft py-1 shadow-md"
          >
            {SCALE_OPTIONS.map((option) => {
              const selected = option.value === scale;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm font-bold transition-colors hover:bg-green-pale",
                    selected ? "text-green-deep" : "text-ink"
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-xs font-semibold text-ink-soft">
                    {baseServings * option.value}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
