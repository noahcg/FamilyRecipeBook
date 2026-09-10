"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { saveSharedRecipe, type PublicSharedRecipe as PublicRecipe } from "@/lib/actions/recipeShares";
import { formatDuration } from "@/lib/formatDuration";

export function PublicSharedRecipe({ recipe, shareId, authenticated }: { recipe: PublicRecipe; shareId: string; authenticated: boolean }) {
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const total = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  async function save() { setSaving(true); const result = await saveSharedRecipe(shareId); setSaving(false); setMessage(result.success ? "Saved to your first cookbook." : result.error); }
  return <main className="min-h-dvh bg-paper pb-16"><header className="border-b border-line-soft bg-card px-5 py-5"><Link href="/" className="font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Home Cooked</Link></header><article className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
    {recipe.photo_url && (
      // The URL may be a user-uploaded Supabase image or a remote import, so it
      // cannot be safely constrained to Next Image's configured domains.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={recipe.photo_url} alt="" className="mb-7 aspect-[16/8] w-full rounded-2xl object-cover shadow-paper" />
    )}
    {recipe.category?.name && <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-accent-cinnamon">{recipe.category.name}</p>}
    <h1 className="text-4xl font-bold leading-tight text-green-deep sm:text-5xl" style={{ fontFamily: "var(--font-playfair)" }}>{recipe.title}</h1>
    {recipe.description && <p className="mt-4 max-w-2xl text-lg leading-8 text-ink-muted">{recipe.description}</p>}
    <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-ink-soft">{total > 0 && <span className="inline-flex items-center gap-1.5"><Clock size={16} />Total {formatDuration(total)}</span>}{recipe.prep_minutes && <span>Prep {formatDuration(recipe.prep_minutes)}</span>}{recipe.cook_minutes && <span>Cook {formatDuration(recipe.cook_minutes)}</span>}{recipe.servings && <span>Serves {recipe.servings}</span>}</div>
    <div className="my-10 grid gap-10 md:grid-cols-[0.8fr_1.2fr]"><section><h2 className="text-2xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Ingredients</h2><ul className="mt-4 space-y-3">{recipe.ingredients.map((item, i) => <li key={item.id} className="flex gap-2 text-sm leading-6 text-ink"><Check size={16} className="mt-1 shrink-0 text-green-mid" />{item.group_label && (i === 0 || recipe.ingredients[i - 1].group_label !== item.group_label) ? <span><strong className="block text-green-deep">{item.group_label}</strong>{[item.quantity, item.unit, item.item, item.note && `(${item.note})`].filter(Boolean).join(" ")}</span> : <span>{[item.quantity, item.unit, item.item, item.note && `(${item.note})`].filter(Boolean).join(" ")}</span>}</li>)}</ul></section><section><h2 className="text-2xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Instructions</h2><ol className="mt-4 space-y-5">{recipe.instructions.map((step, i) => <li key={step.id} className="flex gap-3 leading-7 text-ink"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-pale text-sm font-bold text-green-deep">{i + 1}</span><span>{step.body}</span></li>)}</ol></section></div>
    <aside className="rounded-2xl border border-line-soft bg-card p-6 text-center"><Heart className="mx-auto text-accent-terracotta" size={22} /><h2 className="mt-2 text-xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Save this recipe to Home Cooked</h2><p className="mt-2 text-sm text-ink-muted">Keep family favorites close at hand.</p>{authenticated ? <><Button type="button" className="mt-4" onClick={save} loading={saving}><Plus size={16} />Save recipe</Button>{message && <p className="mt-3 text-sm font-semibold text-green-deep" role="status">{message}</p>}</> : <Link href={`/sign-in?next=${encodeURIComponent(`/r/${shareId}`)}`} className="mt-4 inline-flex h-10 items-center rounded-full bg-green-deep px-4 text-sm font-bold text-white">Sign in to save</Link>}</aside>
  </article></main>;
}
