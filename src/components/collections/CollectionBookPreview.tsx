import type { ReactNode } from "react";
import { BookCoverArt } from "@/components/ui";
import { resolveCoverColor } from "@/lib/bookCovers";
import type { OfficialCollection, OfficialCollectionChapter } from "@/lib/officialCollections";

interface CollectionBookPreviewProps {
  collection: OfficialCollection;
  chapters: OfficialCollectionChapter[];
  chaptersUnavailable?: boolean;
  children: ReactNode;
}

export function CollectionBookPreview({ collection, chapters, chaptersUnavailable = false, children }: CollectionBookPreviewProps) {
  const recipeCount = chapters.reduce((total, chapter) => total + Number(chapter.recipe_count), 0);

  return (
    <>
      <div className="mb-4 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5">
        <BookCoverArt title={collection.title} seed={collection.id} color={resolveCoverColor(collection.cover_style, collection.id)} className="w-full" />
        <div className="min-w-0">
      {chaptersUnavailable ? (
        <p className="text-xs leading-relaxed text-ink-muted">The chapter preview is temporarily unavailable. <a href={`/collections/${collection.slug}`} className="inline-flex min-h-11 items-center font-semibold text-green-deep underline">Refresh preview</a></p>
      ) : chapters.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-ink-muted">{chapters.length} {chapters.length === 1 ? "chapter" : "chapters"} <span aria-hidden="true">·</span> {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}</p>
          <ul aria-label="Cookbook chapters" className="mt-2 grid gap-x-4 gap-y-0.5 text-xs leading-relaxed text-ink-muted sm:grid-cols-2 sm:gap-y-1">
            {chapters.map((chapter) => <li key={chapter.name} className="min-w-0 [overflow-wrap:anywhere]">{chapter.name}</li>)}
          </ul>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-ink-muted">The recipes are coming together. Chapters will appear as we add more.</p>
      )}
        </div>
      </div>
      {children}
    </>
  );
}
