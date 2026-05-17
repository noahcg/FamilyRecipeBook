"use client";

import { useState } from "react";
import { Lock, Users } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui";
import { updateBook } from "@/lib/actions/books";

interface SharingSettingsFormProps {
  bookId: string;
  sharingEnabled: boolean;
  blockerCount: number;
}

export function SharingSettingsForm({
  bookId,
  sharingEnabled,
  blockerCount,
}: SharingSettingsFormProps) {
  const [enabled, setEnabled] = useState(sharingEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isDirty = enabled !== sharingEnabled;
  const disablePrivateSave = !enabled && blockerCount > 0;

  async function handleSave() {
    if (!isDirty || disablePrivateSave) return;
    setSaving(true);
    setMessage(null);
    const result = await updateBook(bookId, { sharing_enabled: enabled });
    setSaving(false);
    setMessage(result.success ? "Sharing settings saved." : result.error);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            value: false,
            label: "Private",
            description: "Only the keeper can access this cookbook.",
            icon: Lock,
          },
          {
            value: true,
            label: "Shared",
            description: "Members can be invited to this cookbook only.",
            icon: Users,
          },
        ].map((option) => {
          const Icon = option.icon;
          const selected = enabled === option.value;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setEnabled(option.value);
                setMessage(null);
              }}
              aria-pressed={selected}
              className={clsx(
                "flex min-h-28 items-start gap-3 rounded-lg border p-4 text-left transition-[border-color,background-color,box-shadow]",
                selected
                  ? "border-green-deep bg-green-pale/70 shadow-xs"
                  : "border-line-soft bg-white-soft/60 hover:bg-card"
              )}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-green-deep">
                <Icon size={17} />
              </span>
              <span>
                <span className="block text-sm font-bold text-green-deep">{option.label}</span>
                <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {disablePrivateSave && (
        <div className="rounded-lg border border-accent-honey/45 bg-paper-warm/60 p-4">
          <p className="text-sm font-bold text-green-deep">
            This cookbook still has shared access.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Remove non-keeper members and cancel pending invitations before making it private.
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={!isDirty || disablePrivateSave || saving}
        loading={saving}
        onClick={handleSave}
      >
        Save sharing
      </Button>

      {message && <p className="text-sm font-semibold text-green-deep">{message}</p>}
    </div>
  );
}
