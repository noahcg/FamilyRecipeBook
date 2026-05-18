"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  children,
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        className="absolute inset-0 animate-in fade-in duration-150 bg-ink/18"
        onClick={onClose}
      />
      <section
        className={clsx(
          "relative ml-auto flex h-full w-[min(86vw,360px)] animate-in slide-in-from-right-5 duration-200 flex-col border-l border-line-soft bg-card px-4 py-5 shadow-[-18px_0_48px_rgba(75,53,31,0.14)]",
          className
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                {eyebrow}
              </p>
            )}
            <h2
              className="mt-1 truncate text-2xl font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label={`Close ${title.toLowerCase()}`}
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line-soft bg-white-soft text-green-deep"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </section>
    </div>,
    document.body
  );
}
