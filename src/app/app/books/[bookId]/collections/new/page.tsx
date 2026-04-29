"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Input, Textarea, CookbookIcon, cookbookIconOptions } from "@/components/ui";
import {
  createCollectionSchema,
  type CreateCollectionInput,
} from "@/lib/validators/collection";
import { createCollection } from "@/lib/actions/collections";
import { use } from "react";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default function NewCollectionPage({ params }: Props) {
  const { bookId } = use(params);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState("book");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { title: "", icon: "book" },
  });

  async function onSubmit(data: CreateCollectionInput) {
    setServerError(null);
    const result = await createCollection(bookId, {
      ...data,
      icon: selectedIcon,
    });
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push(`/app/books/${bookId}/collections/${result.data.id}`);
  }

  return (
    <AppShell bookId={bookId}>
      <div className="px-5 pt-5">
        <Link
          href={`/app/books/${bookId}/collections`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-5 block"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Collections
        </Link>

        <h1
          className="text-2xl font-bold text-green-deep mb-6"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          New collection
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Icon picker */}
          <div>
            <p className="text-sm font-semibold text-ink mb-2">Icon</p>
            <div className="flex flex-wrap gap-2">
              {cookbookIconOptions.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => setSelectedIcon(icon.id)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-colors ${
                    selectedIcon === icon.id
                      ? "border-green-deep"
                      : "border-transparent"
                  }`}
                  style={{
                    background:
                      selectedIcon === icon.id
                        ? "var(--color-sage-pale)"
                        : "var(--color-paper-warm)",
                  }}
                  aria-label={icon.label}
                  aria-pressed={selectedIcon === icon.id}
                >
                  <CookbookIcon name={icon.id} size={21} />
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Collection name"
            required
            placeholder="e.g. Sunday Dinners, Holiday Recipes"
            error={errors.title?.message}
            {...register("title")}
          />

          <Textarea
            label="Description (optional)"
            placeholder="What's this collection for?"
            error={errors.description?.message}
            {...register("description")}
          />

          {serverError && (
            <p className="text-sm text-danger">{serverError}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              className="flex-1"
            >
              Create collection
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
