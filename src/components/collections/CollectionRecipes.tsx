"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { BookOpen, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ChapterIndex, ChapterListing, chapterId } from "@/components/book/ChapterListing";
import { CollectionSubscriptionButton } from "@/components/collections/CollectionSubscriptionButton";
import { EmptyState } from "@/components/ui";
import { groupRecipesByChapter } from "@/lib/chapterContents";
import { formatDuration } from "@/lib/formatDuration";
import type { CollectionRecipeSummary, OfficialCollection, OfficialCollectionChapter } from "@/lib/officialCollections";

export function CollectionRecipes({ collection, recipes, chapterOrder, initialQuery, removeHref, added }: { collection: OfficialCollection; recipes: CollectionRecipeSummary[]; chapterOrder: OfficialCollectionChapter[]; initialQuery: string; removeHref: string; added: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [isContentsOpen, setIsContentsOpen] = useState(false);
  const chapters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = recipes.filter((recipe) => [recipe.title, recipe.description, recipe.category_name].filter(Boolean).join(" ").toLowerCase().includes(normalized));
    return groupRecipesByChapter(filtered.map((recipe) => ({ ...recipe, category: recipe.category_name, categoryPosition: (() => { const index = chapterOrder.findIndex ( (chapter) => chapter.name === (recipe.category_name || "More recipes")); return index < 0 ? null : index; })() })), "Family Notes").map((chapter) => ({ ...chapter, recipes: chapter.recipes.map((recipe) => ({ id: recipe.id, title: recipe.title, meta: [recipe.cook_minutes ? formatDuration(recipe.cook_minutes) : null, recipe.servings ? `Serves ${recipe.servings}` : null].filter(Boolean).join(" · ") || "Family recipe" })) }));
  }, [recipes, query, chapterOrder]);
  function selectChapter(event: MouseEvent<HTMLAnchorElement>, category: string, close = false) {
    if (!close) return;
    event.preventDefault();
    setIsContentsOpen(false);
    requestAnimationFrame(() => {
      const id = chapterId(category);
      // Native hash navigation preserves chapter history, as on personal cookbooks.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (window.location.hash !== `#${id}`) window.location.assign(`#${id}`);
      document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
  }
  return <AppShell mobileSideDrawer={chapters.length ? { label: "Index", ariaLabel: "Open recipe contents", eyebrow: "Recipe Index", title: "Chapters", icon: <BookOpen size={17} strokeWidth={1.8} />, isOpen: isContentsOpen, onOpen: () => setIsContentsOpen(true), onClose: () => setIsContentsOpen(false), children: <nav className="min-h-0 flex-1 overflow-y-auto pr-1"><ChapterIndex chapters={chapters} onSelect={(event, category) => selectChapter(event, category, true)} /></nav> } : undefined}>
    {added && <p role="status" className="mx-5 mt-5 rounded-sm bg-green-pale p-4 text-sm font-bold text-green-deep">Collection added to your bookshelf. It does not use your personal cookbook allowance.</p>}
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 lg:px-8">
      <header className="mb-7 border-b border-line-soft pb-6"><div className="min-w-0"><p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">Cookbook</p><h1 className="text-4xl font-bold leading-tight text-green-deep lg:text-5xl" style={{ fontFamily: "var(--font-playfair)" }}>{collection.title}</h1>{collection.description && <p className="mt-3 max-w-2xl whitespace-pre-line break-words text-base leading-relaxed text-ink-muted">{collection.description}</p>}<div className="mt-2 flex max-w-2xl flex-wrap items-center gap-x-2 text-sm leading-relaxed text-ink-muted">{recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} across {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}</div></div>
        <div className={`mt-6 rounded-lg border border-line-soft bg-card/75 p-3 shadow-[var(--shadow-paper)] ${chapters.length ? "pr-8 lg:pr-3" : ""}`} role="toolbar" aria-label="Cookbook actions"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} /><input aria-label="Search cookbook contents" className="input-cookbook h-12 w-full text-sm" style={{ paddingLeft: "2.25rem" }} placeholder="Search the contents..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><CollectionSubscriptionButton collectionId={collection.id} remove removeHref={removeHref} /></div></div>
      </header>
      {chapters.length ? <ChapterListing chapters={chapters} recipeHref={(id) => `/app/collections/${collection.id}/recipes/${id}`} /> : <EmptyState title={query ? "No matching recipes" : "Your first recipe belongs here"} description={query ? "Try another search term or browse the full recipe list." : "The recipes are on their way. Check back for updates from Home Cooked."} />}
    </div>
  </AppShell>;
}
