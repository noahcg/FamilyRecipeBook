"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui";
import { CookbookIcon, cookbookIconOptions } from "@/components/ui/CookbookIcon";
import { setDefaultBook, updateBook } from "@/lib/actions/books";

interface BookPreferencesFormProps {
  bookId: string;
  currentIcon: string | null;
  isDefault: boolean;
}

export function BookPreferencesForm({
  bookId,
  currentIcon,
  isDefault,
}: BookPreferencesFormProps) {
  const [icon, setIcon] = useState(currentIcon ?? "bowl");
  const [savingIcon, setSavingIcon] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const iconDirty = icon !== (currentIcon ?? "bowl");

  async function handleSaveIcon() {
    if (!iconDirty) return;
    setSavingIcon(true);
    setMessage(null);
    const result = await updateBook(bookId, { icon });
    setSavingIcon(false);
    setMessage(result.success ? "Icon saved." : result.error);
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
        <p className="mb-3 text-sm font-semibold text-ink">Cookbook icon</p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {cookbookIconOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setIcon(option.id);
                setMessage(null);
              }}
              aria-label={option.label}
              aria-pressed={icon === option.id}
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                icon === option.id
                  ? "border-green-deep bg-green-soft"
                  : "border-line-soft bg-card text-ink-muted hover:bg-green-pale"
              )}
            >
              <CookbookIcon name={option.id} size={19} />
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={!iconDirty || savingIcon}
          loading={savingIcon}
          onClick={handleSaveIcon}
        >
          Save icon
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
