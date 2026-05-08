"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: DialogProps) {
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
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-md" />

      <div
        className={clsx(
          "relative w-full sm:max-w-lg",
          "rounded-t-2xl sm:rounded-2xl shadow-lg",
          "animate-in fade-in slide-in-from-bottom-4 duration-200",
          className
        )}
        style={{ background: "var(--color-paper-soft)" }}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line-soft px-5 pb-3 pt-5">
            <h2
              className="text-lg font-bold text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-line-soft"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div className={clsx("px-5 pb-6", !title && "pt-5")}>{children}</div>
      </div>
    </div>,
    document.body
  );

}
