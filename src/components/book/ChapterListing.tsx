"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import type { MouseEvent } from "react";

export interface ChapterListingItem { id: string; title: string; meta: string; favorite?: boolean; loveCount?: number }
export interface ChapterListingChapter { category: string; number: string; recipes: ChapterListingItem[] }
export function chapterId(category: string) { return `chapter-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`; }

export function ChapterIndex({ chapters, onSelect }: { chapters: ChapterListingChapter[]; onSelect?: (event: MouseEvent<HTMLAnchorElement>, category: string) => void }) {
  return <>{chapters.map((chapter) => <a key={chapter.category} href={`#${chapterId(chapter.category)}`} onClick={(event) => onSelect?.(event, chapter.category)} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-line-soft py-3 last:border-b-0">
    <span className="text-xs font-bold text-accent-cinnamon">{chapter.number}</span><span className="truncate text-base font-semibold text-ink transition-colors group-hover:text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>{chapter.category}</span><span className="rounded-sm bg-paper-warm px-2 py-0.5 text-xs font-bold text-ink-soft">{chapter.recipes.length}</span>
  </a>)}</>;
}

export function ChapterListing({ chapters, recipeHref, onRecipeOpen, onChapterSelect }: { chapters: ChapterListingChapter[]; recipeHref: (id: string) => string; onRecipeOpen?: (event: MouseEvent<HTMLAnchorElement>, id: string) => void; onChapterSelect?: (event: MouseEvent<HTMLAnchorElement>, category: string) => void }) {
  return <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0"><div className="space-y-10">{chapters.map((chapter) => <section key={chapter.category} id={chapterId(chapter.category)} className="scroll-mt-6 border-b border-line-soft pb-8 last:border-b-0">
      <div className="mb-4 flex items-baseline gap-4"><span className="text-sm font-bold text-accent-cinnamon">{chapter.number}</span><h2 className="text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>{chapter.category}</h2><span className="h-px flex-1 bg-line-soft" /><span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">{chapter.recipes.length}</span></div>
      <ol className="divide-y divide-line-soft">{chapter.recipes.map((recipe) => <li key={recipe.id}><Link href={recipeHref(recipe.id)} onClick={(event) => onRecipeOpen?.(event, recipe.id)} className="group grid gap-3 py-4 outline-none transition-colors hover:bg-card/50 focus-visible:bg-card/70 sm:grid-cols-[minmax(0,1fr)_auto]"><span className="min-w-0"><span className="flex items-baseline gap-3"><span className="text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-green-deep group-focus-visible:text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>{recipe.title}</span><span className="hidden h-px min-w-8 flex-1 border-b border-dotted border-line sm:block" /></span><span className="mt-1 block truncate text-sm text-ink-muted">{recipe.meta}</span></span><span className="flex items-center gap-3 text-xs font-semibold text-ink-soft sm:justify-end">{recipe.favorite && <span className="inline-flex items-center gap-1 text-accent-terracotta"><Heart size={13} fill="currentColor" /> Favorite</span>}{!!recipe.loveCount && <span className="inline-flex items-center gap-1"><Heart size={13} /> {recipe.loveCount}</span>}</span></Link></li>)}</ol>
    </section>)}</div></div>
    <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start"><div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-card shadow-[var(--shadow-paper)]"><div className="sticky top-0 z-10 border-b border-line-soft bg-paper-warm px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">In this book</p><h2 className="mt-1 text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Chapter Index</h2></div><nav className="px-5 py-3"><ChapterIndex chapters={chapters} onSelect={onChapterSelect} /></nav></div></aside>
  </div>;
}
