"use client";

import { useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { updateBook } from "@/lib/actions/books";

export function BookDescriptionForm({ bookId, currentDescription }: { bookId: string; currentDescription: string | null }) {
  const [description, setDescription] = useState(currentDescription ?? "");
  const [savedDescription, setSavedDescription] = useState(currentDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isDirty = description.trim() !== savedDescription.trim();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isDirty || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const value = description.trim();
      const result = await updateBook(bookId, { description: value });
      if (!result.success) {
        setError(result.error);
      } else {
        setDescription(value);
        setSavedDescription(value);
        setSaved(true);
      }
    } catch {
      setError("Could not save the description. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        label="Description (optional)"
        placeholder="A little about this book…"
        value={description}
        maxLength={500}
        disabled={saving}
        error={error ?? undefined}
        onChange={(event) => { setDescription(event.target.value); setSaved(false); setError(null); }}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={!isDirty || saving} loading={saving}>
          Save description
        </Button>
        {saved && <p role="status" className="text-sm font-semibold text-green-deep">Description saved.</p>}
      </div>
    </form>
  );
}
