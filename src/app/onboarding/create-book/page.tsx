"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, BookCoverArt } from "@/components/ui";
import { EntryShell } from "@/components/layout/EntryShell";
import { BOOK_COVER_COLORS } from "@/lib/bookCovers";
import { createBookSchema, type CreateBookInput } from "@/lib/validators/book";
import { createBook } from "@/lib/actions/books";
import { clsx } from "clsx";
import { Lock, Users } from "lucide-react";

export default function CreateBookPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookInput>({
    resolver: zodResolver(createBookSchema),
    defaultValues: { title: "", cover_style: BOOK_COVER_COLORS[0].hex, icon: "bowl", sharing_enabled: false },
  });

  const watchedTitle = useWatch({ control, name: "title" });
  const selectedStyle = useWatch({ control, name: "cover_style" });
  const sharingEnabled = useWatch({ control, name: "sharing_enabled" });

  async function onSubmit(data: CreateBookInput) {
    setServerError(null);
    const result = await createBook(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push(`/onboarding/add-member?bookId=${result.data.id}`);
  }

  return (
    <EntryShell
      eyebrow="Step 1 of 2"
      title="Name your recipe book"
      description="Give it a name and cover that feel like home."
      backHref="/app"
      backLabel="Back to app"
      maxWidth="lg"
      framed={false}
      sideImageSrc="/images/entry/create-new-book.jpg"
      sideImageAlt="Cookbooks and recipe cards on a kitchen table"
      sideTitle="Give your family recipes a place to live."
      sideDescription="Choose a cover now. You can keep adding recipes and decide when this cookbook is ready to share."
      sideNote="Choose a cover. Add the memories next."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="recipe-card w-full space-y-6 p-5 sm:p-6">
        <div className="space-y-4">
          <Input
            label="Book title"
            required
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
        </div>

        <div>
          <p className="text-sm font-semibold text-ink mb-3">Sharing</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                value: false,
                label: "Private",
                description: "Only you can access this cookbook until you turn sharing on.",
                icon: Lock,
              },
              {
                value: true,
                label: "Shared",
                description: "You can invite members to this cookbook after it is created.",
                icon: Users,
              },
            ].map((option) => {
              const Icon = option.icon;
              const selected = sharingEnabled === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setValue("sharing_enabled", option.value)}
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
        </div>

        {/* Cover color picker */}
        <div>
          <p className="text-sm font-semibold text-ink mb-3">Cover color</p>
          <div className="flex flex-wrap gap-2.5">
            {BOOK_COVER_COLORS.map((c) => {
              const selected = selectedStyle === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setValue("cover_style", c.hex)}
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
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-line-soft bg-white-soft/60 p-3">
          <BookCoverArt
            title={watchedTitle.trim() || "Your Book"}
            seed="preview"
            color={selectedStyle}
            className="w-20 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent-cinnamon">
              Cover preview
            </p>
            <p className="mt-1 text-sm font-bold text-green-deep">
              {watchedTitle.trim() || "Your Book"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              This is how your cookbook will appear in your book list.
            </p>
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-danger font-medium">{serverError}</p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Create book
        </Button>
      </form>
    </EntryShell>
  );
}
