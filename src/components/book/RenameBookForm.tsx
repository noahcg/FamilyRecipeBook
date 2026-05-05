"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";
import { updateBook } from "@/lib/actions/books";

interface RenameBookFormProps {
  bookId: string;
  currentTitle: string;
}

export function RenameBookForm({ bookId, currentTitle }: RenameBookFormProps) {
  const [title, setTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty = title.trim() !== currentTitle;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty || !title.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updateBook(bookId, { title: title.trim() });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <Input
          label="Book name"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
          maxLength={100}
          placeholder="Family recipe book name"
          error={error ?? undefined}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={!isDirty || saving}
        loading={saving}
        className="shrink-0 mb-0.5"
      >
        {saved ? "Saved!" : "Save"}
      </Button>
    </form>
  );
}
