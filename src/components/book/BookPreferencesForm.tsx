"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui";
import { setDefaultBook, updateBook } from "@/lib/actions/books";
import type { CoverStyle } from "@/components/ui";

interface BookPreferencesFormProps {
  bookId: string;
  currentCoverStyle: string;
  isDefault: boolean;
}

const COVER_STYLES: { id: CoverStyle; label: string; bg: string; spine: string; border: string }[] = [
  { id: "sage", label: "Sage", bg: "#DDE7D7", spine: "#8BA888", border: "#8BA888" },
  { id: "terracotta", label: "Terracotta", bg: "#FADDD6", spine: "#C86132", border: "#C86132" },
  { id: "mustard", label: "Mustard", bg: "#FAE8C0", spine: "#D4942E", border: "#D4942E" },
  { id: "forest", label: "Forest", bg: "#9CAF88", spine: "#3B5A45", border: "#3B5A45" },
  { id: "clay", label: "Clay", bg: "#F0DDD0", spine: "#B8754B", border: "#B8754B" },
];

export function BookPreferencesForm({
  bookId,
  currentCoverStyle,
  isDefault,
}: BookPreferencesFormProps) {
  const [coverStyle, setCoverStyle] = useState<CoverStyle>((currentCoverStyle as CoverStyle) ?? "sage");
  const [savingCover, setSavingCover] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const coverDirty = coverStyle !== (currentCoverStyle ?? "sage");

  async function handleSaveCover() {
    if (!coverDirty) return;
    setSavingCover(true);
    setMessage(null);
    const result = await updateBook(bookId, { cover_style: coverStyle });
    setSavingCover(false);
    setMessage(result.success ? "Cover color saved." : result.error);
  }

  async function handleSetDefault() {
    setSavingDefault(true);
    setMessage(null);
    const result = await setDefaultBook(bookId);
    setSavingDefault(false);
    setMessage(result.success ? "Default cookbook updated." : result.error);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-sm font-semibold text-ink">Cookbook cover color</p>
        <div className="flex flex-wrap gap-3">
          {COVER_STYLES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setCoverStyle(option.id);
                setMessage(null);
              }}
              aria-label={option.label}
              aria-pressed={coverStyle === option.id}
              className={clsx(
                "relative h-16 w-12 overflow-hidden rounded-md border-2 shadow-[0_8px_18px_rgba(75,53,31,0.10)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
                coverStyle === option.id
                  ? "border-green-deep"
                  : "border-transparent opacity-75 hover:opacity-100"
              )}
              style={{ background: option.bg }}
            >
              <span className="absolute inset-y-0 left-0 w-3" style={{ background: option.spine }} />
              <span className="absolute bottom-3 left-5 right-2 h-px bg-white-soft/55" />
              <span className="absolute bottom-5 left-5 right-2 h-px bg-white-soft/40" />
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={!coverDirty || savingCover}
          loading={savingCover}
          onClick={handleSaveCover}
        >
          Save cover color
        </Button>
      </div>

      <div className="rounded-lg border border-line-soft bg-card/70 p-4">
        <p className="text-sm font-bold text-green-deep">Default cookbook</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          This is the cookbook that opens when you go to the app home.
        </p>
        <Button
          type="button"
          variant={isDefault ? "secondary" : "primary"}
          size="sm"
          className="mt-3"
          disabled={isDefault || savingDefault}
          loading={savingDefault}
          onClick={handleSetDefault}
        >
          {isDefault ? "Current default" : "Make default"}
        </Button>
      </div>

      {message && <p className="text-sm font-semibold text-green-deep">{message}</p>}
    </div>
  );
}
