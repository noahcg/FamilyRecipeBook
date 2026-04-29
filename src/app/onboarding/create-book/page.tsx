"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, BookCover } from "@/components/ui";
import type { CoverStyle } from "@/components/ui";
import { createBookSchema, type CreateBookInput } from "@/lib/validators/book";
import { createBook } from "@/lib/actions/books";
import { clsx } from "clsx";

const COVER_STYLES: { id: CoverStyle; label: string; bg: string; border: string }[] = [
  { id: "sage", label: "Sage", bg: "#DDE7D7", border: "#8BA888" },
  { id: "terracotta", label: "Terracotta", bg: "#FADDD6", border: "#E76F51" },
  { id: "mustard", label: "Mustard", bg: "#FAE8C0", border: "#F2B348" },
  { id: "forest", label: "Forest", bg: "#C8D8CC", border: "#2F4F3F" },
  { id: "clay", label: "Clay", bg: "#F0DDD0", border: "#B8754B" },
];

export default function CreateBookPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookInput>({
    resolver: zodResolver(createBookSchema),
    defaultValues: { title: "", cover_style: "sage" },
  });

  const watchedTitle = watch("title");
  const selectedStyle = watch("cover_style");

  async function onSubmit(data: CreateBookInput) {
    setServerError(null);
    const result = await createBook(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push(`/onboarding/add-first-recipe?bookId=${result.data.id}`);
  }

  return (
    <div>
      <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
        Step 1 of 3
      </p>
      <h1
        className="text-3xl font-bold text-green-deep mb-2"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        Name your recipe book
      </h1>
      <p className="text-ink-muted mb-8">
        Give it a name that feels like home.
      </p>

      <div className="flex flex-col sm:flex-row gap-8 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 w-full space-y-6">
          <Input
            label="Book title"
            placeholder="e.g. The Family Table, Mom's Recipe Box"
            error={errors.title?.message}
            {...register("title")}
          />

          <Textarea
            label="Description (optional)"
            placeholder="A little about this book…"
            error={errors.description?.message}
            {...register("description")}
          />

          {/* Cover style picker */}
          <div>
            <p className="text-sm font-semibold text-ink mb-3">Cover colour</p>
            <div className="flex gap-3">
              {COVER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setValue("cover_style", s.id)}
                  className={clsx(
                    "w-10 h-10 rounded-lg border-2 transition-transform",
                    selectedStyle === s.id
                      ? "scale-110 shadow-sm"
                      : "border-transparent opacity-60 hover:opacity-90"
                  )}
                  style={{
                    background: s.bg,
                    borderColor: selectedStyle === s.id ? s.border : "transparent",
                  }}
                  aria-label={s.label}
                  aria-pressed={selectedStyle === s.id}
                />
              ))}
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-danger font-medium">{serverError}</p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
            Create book
          </Button>
        </form>

        {/* Live preview */}
        <div className="flex flex-col items-center gap-3 w-full sm:w-auto sm:sticky sm:top-8">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
            Preview
          </p>
          <BookCover
            title={watchedTitle.trim() || "Your Book"}
            style={selectedStyle as CoverStyle}
            size="lg"
          />
        </div>
      </div>
    </div>
  );
}
