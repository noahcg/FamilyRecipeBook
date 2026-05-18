"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-stretch sm:justify-end"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-md" />

      <div
        className={clsx(
          "relative flex w-full flex-col shadow-lg",
          "max-h-[88dvh] rounded-t-2xl",
          "sm:h-full sm:max-h-none sm:w-[420px] sm:max-w-[90vw] sm:rounded-none sm:rounded-l-2xl",
          "animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-200",
          className
        )}
        style={{ background: "var(--color-paper-soft)" }}
      >
        {(title || description) && (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line-soft px-4 pb-3 pt-5 sm:px-5">
            <div className="min-w-0">
              {title && (
                <h2
                  className="text-lg font-bold text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-line-soft"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
