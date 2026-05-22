"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button, BookCoverArt } from "@/components/ui";
import { BOOK_COVER_COLORS, resolveCoverColor } from "@/lib/bookCovers";
import { setDefaultBook, updateBook } from "@/lib/actions/books";

interface BookPreferencesFormProps {
  bookId: string;
  bookTitle: string;
  currentCoverStyle: string;
  isDefault: boolean;
}

export function BookPreferencesForm({
  bookId,
  bookTitle,
  currentCoverStyle,
  isDefault,
}: BookPreferencesFormProps) {
  // Resolve the stored value (a hex, or a legacy named style on older books) to
  // the hex actually rendered on the cover, so the picker starts in sync with
  // what the user sees everywhere else.
  const initialColor = resolveCoverColor(currentCoverStyle, bookId);
  const [coverColor, setCoverColor] = useState(initialColor);
  const [savingCover, setSavingCover] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const coverDirty = coverColor !== initialColor;

  async function handleSaveCover() {
    if (!coverDirty) return;
    setSavingCover(true);
    setMessage(null);
    const result = await updateBook(bookId, { cover_style: coverColor });
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

        <div className="flex items-center gap-4 rounded-lg border border-line-soft bg-white-soft/60 p-3">
          <BookCoverArt
            title={bookTitle.trim() || "Your Book"}
            seed={bookId}
            color={coverColor}
            className="w-20 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent-cinnamon">
              Cover preview
            </p>
            <p className="mt-1 text-sm font-bold text-green-deep">
              {bookTitle.trim() || "Your Book"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              This is how your cookbook appears across your book list.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2.5">
          {BOOK_COVER_COLORS.map((c) => {
            const selected = coverColor === c.hex;
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => {
                  setCoverColor(c.hex);
                  setMessage(null);
                }}
                className={clsx(
                  "h-9 w-9 rounded-full border-2 transition-transform",
                  selected
                    ? "scale-110 border-green-deep shadow-sm"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
                style={{ background: c.hex }}
                title={c.label}
                aria-label={c.label}
                aria-pressed={selected}
              />
            );
          })}
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
