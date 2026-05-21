"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Clock, MoreHorizontal, Star, Trash2, Users } from "lucide-react";
import { BookCoverArt, Button, Dialog, Drawer } from "@/components/ui";
import { resolveCoverColor } from "@/lib/bookCovers";
import { deleteBook, getBookPreview } from "@/lib/actions/books";
import type { BookPreview, RecipeBook } from "@/lib/types";

interface Props {
  books: RecipeBook[];
  defaultBookId: string | null;
  userId: string;
}

function formatDate(value: string | null) {
  if (!value) return "Recently updated";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BookshelfGrid({ books, defaultBookId, userId }: Props) {
  const router = useRouter();
  const [previewBook, setPreviewBook] = useState<RecipeBook | null>(null);
  const [preview, setPreview] = useState<BookPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecipeBook | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openPreview(book: RecipeBook) {
    setPreviewBook(book);
    setPreview(null);
    setLoading(true);
    getBookPreview(book.id)
      .then((data) => setPreview(data))
      .finally(() => setLoading(false));
  }

  function closePreview() {
    setPreviewBook(null);
    setPreview(null);
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteBook(deleteTarget.id);
    setDeleting(false);
    if (!result.success) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => {
          const isDefault = book.id === defaultBookId;
          const canDelete = book.owner_id === userId;
          return (
            <div
              key={book.id}
              className="recipe-card group relative flex items-start gap-3 p-4 sm:gap-4"
            >
              {/* Full-card link navigates into the book */}
              <Link
                href={`/app/books/${book.id}`}
                aria-label={`Open ${book.title}`}
                className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
              />

              {canDelete && (
                <div className="absolute right-2 top-2 z-[3]">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId((id) => (id === book.id ? null : book.id))}
                    aria-label={`More options for ${book.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-card-muted hover:text-ink"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuOpenId === book.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div
                        className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-md py-1 shadow-md"
                        style={{ background: "var(--color-paper-soft)", border: "1px solid var(--color-line-soft)" }}
                      >
                        <button
                          type="button"
                          onClick={() => { setMenuOpenId(null); setDeleteError(null); setDeleteTarget(book); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-green-pale"
                        >
                          <Trash2 size={15} strokeWidth={1.75} />
                          Delete cookbook
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pointer-events-none relative z-[1] flex shrink-0 flex-col items-center gap-2">
                <div className="relative">
                  <BookCoverArt
                    title={book.title}
                    seed={book.id}
                    color={resolveCoverColor(book.cover_style, book.id)}
                    className="w-24 sm:w-28"
                  />
                  {isDefault && (
                    <span
                      aria-label="Default cookbook"
                      title="Default cookbook"
                      className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-card bg-accent-honey text-white-soft shadow-sm"
                    >
                      <Star size={13} fill="currentColor" />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openPreview(book)}
                  aria-label={`Preview ${book.title}`}
                  className="pointer-events-auto relative z-[2] inline-flex items-center gap-1.5 rounded-md bg-green-deep px-3 py-1.5 text-xs font-bold text-ink-inverse shadow-xs transition-opacity hover:opacity-90"
                >
                  <BookOpen size={13} /> Preview
                </button>
              </div>

              <div className="pointer-events-none relative z-[1] min-w-0 flex-1 pt-1">
                <h2
                  className="truncate text-lg font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {book.title}
                </h2>
                {isDefault && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-accent-cinnamon">
                    <Star size={11} fill="currentColor" /> Default
                  </span>
                )}
                {book.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                    {book.description}
                  </p>
                )}
                <p className="mt-3 text-xs font-semibold text-ink-soft">
                  Updated {formatDate(book.updated_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Drawer
        open={previewBook !== null}
        onClose={closePreview}
        eyebrow="Cookbook"
        title={previewBook?.title ?? "Cookbook"}
      >
        {previewBook && (
          <PreviewBody
            book={previewBook}
            preview={preview}
            loading={loading}
            onOpen={closePreview}
          />
        )}
      </Drawer>

      <Dialog
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete cookbook?"
      >
        <p className="mb-5 pt-5 text-sm leading-relaxed text-ink-muted">
          This permanently deletes{" "}
          <span className="font-semibold text-ink">{deleteTarget?.title}</span> and
          every recipe, memory, and member in it. This cannot be undone.
        </p>
        {deleteError && (
          <p className="mb-4 text-sm font-medium text-danger">{deleteError}</p>
        )}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={handleDelete}
            loading={deleting}
          >
            Delete cookbook
          </Button>
        </div>
      </Dialog>
    </>
  );
}

interface PreviewBodyProps {
  book: RecipeBook;
  preview: BookPreview | null;
  loading: boolean;
  onOpen: () => void;
}

function PreviewBody({ book, preview, loading, onOpen }: PreviewBodyProps) {
  // Group recipe titles by category for a lightweight table of contents.
  const grouped = preview
    ? preview.categories.map((cat) => ({
        name: cat.name,
        recipes: preview.recipes.filter(
          (r) => (r.category?.trim() || "Uncategorized") === cat.name
        ),
      }))
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="-mr-1 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-ink-muted">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-green-deep" />
            Loading preview…
          </div>
        ) : !preview ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            Couldn&apos;t load this cookbook&apos;s preview.
          </p>
        ) : (
          <>
            {book.description && (
              <p className="text-sm leading-relaxed text-ink-muted">
                {book.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-soft px-2.5 py-1.5 text-xs font-bold text-green-deep">
                <BookOpen size={13} />
                {preview.recipeCount} recipe{preview.recipeCount !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold text-ink-muted">
                <Users size={13} />
                {preview.memberCount} member{preview.memberCount !== 1 ? "s" : ""}
              </span>
              {preview.lastUpdated && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold text-ink-muted">
                  <Clock size={13} />
                  {formatDate(preview.lastUpdated)}
                </span>
              )}
            </div>

            {preview.recipeCount === 0 ? (
              <p className="rounded-xl border border-dashed border-line-soft px-3 py-8 text-center text-sm text-ink-muted">
                No recipes in this cookbook yet.
              </p>
            ) : (
              <>
                {/* Category chips */}
                {preview.categories.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.categories.map((cat) => (
                      <span
                        key={cat.name}
                        className="rounded-full border border-line-soft px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
                      >
                        {cat.name} · {cat.count}
                      </span>
                    ))}
                  </div>
                )}

                {/* Table of contents */}
                <div className="space-y-4">
                  {grouped.map((group) => (
                    <div key={group.name}>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        {group.name}
                      </p>
                      <ul className="space-y-1">
                        {group.recipes.map((r) => (
                          <li
                            key={r.id}
                            className="flex gap-2 text-sm leading-snug text-ink"
                          >
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green-deep" />
                            <span className="min-w-0">{r.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 shrink-0 border-t border-line-soft pt-4">
        <Link
          href={`/app/books/${book.id}`}
          onClick={onOpen}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-deep px-4 py-2.5 text-sm font-semibold text-ink-inverse transition-opacity hover:opacity-90"
        >
          Open this cookbook
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
