"use client";

import { useEffect, useRef } from "react";
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

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

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
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line-soft">
            <h2
              className="text-lg font-bold text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:bg-line-soft transition-colors"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div className={clsx("px-5 pb-6", !title && "pt-5")}>{children}</div>
      </div>
    </div>
  );
}
