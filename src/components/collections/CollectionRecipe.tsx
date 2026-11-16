import Link from "next/link";
import { BookOpen, List } from "lucide-react";
import type { CollectionRecipeDetail, OfficialCollection } from "@/lib/officialCollections";
import { formatDuration } from "@/lib/formatDuration";

interface CollectionRecipeProps {
  collection: OfficialCollection;
  recipe: CollectionRecipeDetail;
}

function groups<T extends { group_label: string | null; position: number }>(items: T[]) {
  const result: { label: string | null; items: T[]; offset: number }[] = [];
  for (const [index, item] of [...items].sort((a, b) => a.position - b.position).entries()) {
    const label = item.group_label?.trim() || null;
    const previous = result.at(-1);
    if (previous && previous.label === label) previous.items.push(item);
    else result.push({ label, items: [item], offset: index });
  }
  return result;
}

export function CollectionRecipe({ collection, recipe }: CollectionRecipeProps) {
  const ingredientGroups = groups(recipe.ingredients);
  const instructionGroups = groups(recipe.instructions);

  return (
    <article>
      <header className="relative h-[310px] overflow-hidden bg-green-pale sm:h-[360px] lg:h-[390px] lg:rounded-tr-xl">
        {recipe.has_photo ? (
          // Collection photos use the authorized media route.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/collections/${collection.id}/images/${recipe.id}`} alt={recipe.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : <div className="flex h-full items-center justify-center"><BookOpen size={70} strokeWidth={1} className="text-green-sage opacity-50" /></div>}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 to-transparent px-4 pb-8 pt-4 sm:px-5 lg:px-8">
          <Link href={`/app/collections/${collection.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-white-soft/88 px-4 text-sm font-bold text-green-deep"><List size={16} aria-hidden="true" /> Contents</Link>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-6 pt-12 sm:px-5 sm:pb-8 lg:px-8">
          <div className="mx-auto max-w-[1320px] text-ink-inverse">
            {recipe.category_name && <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-white/80">{recipe.category_name}</p>}
            <h1 className="break-words text-3xl font-bold leading-[1.25] sm:text-4xl lg:text-5xl" style={{ fontFamily: "var(--font-playfair)" }}>{recipe.title}</h1>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1320px] px-4 sm:px-5 lg:px-8">
        <section className="grid gap-8 border-b border-line-soft py-7 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>{recipe.description && <p className="max-w-3xl whitespace-pre-line text-base leading-relaxed text-ink-muted">{recipe.description}</p>}</div>
          <dl className="grid grid-cols-2 gap-4 border-line-soft text-sm lg:border-l lg:pl-8">
            {[["Servings", recipe.servings ?? "Family"], ["Cook", recipe.cook_minutes != null ? formatDuration(recipe.cook_minutes) || "0 min" : "Anytime"], ["Prep", recipe.prep_minutes != null ? formatDuration(recipe.prep_minutes) || "0 min" : "Anytime"]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">{label}</dt><dd className="mt-1 font-bold text-green-deep">{value}</dd></div>)}
          </dl>
        </section>
        <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-labelledby="collection-instructions-heading">
            <div className="mb-6 border-b border-line-soft pb-4"><p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">Method</p><h2 id="collection-instructions-heading" className="text-3xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>How to make it</h2></div>
            {instructionGroups.length === 0 ? <p className="text-sm text-ink-muted">Instructions haven&rsquo;t been added yet.</p> : instructionGroups.map((group, groupIndex) => <div key={groupIndex} className="mb-5">{group.label && <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-accent-cinnamon">{group.label}</h3>}<ol start={group.offset + 1} className="space-y-4">{group.items.map((instruction, index) => <li key={index} className="flex gap-4"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-deep text-xs font-bold text-ink-inverse">{group.offset + index + 1}</span><p className="whitespace-pre-line break-words pt-1 text-sm leading-relaxed text-ink">{instruction.body}</p></li>)}</ol></div>)}
          </section>
          <aside className="border-line-soft lg:sticky lg:top-8 lg:self-start lg:border-l lg:pl-8"><section aria-labelledby="collection-ingredients-heading">
            <div className="mb-4 border-b border-line-soft pb-3"><p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">What you need</p><h2 id="collection-ingredients-heading" className="text-2xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Ingredients</h2></div>
            {ingredientGroups.length === 0 ? <p className="text-sm text-ink-muted">Ingredients haven&rsquo;t been added yet.</p> : ingredientGroups.map((group, groupIndex) => <div key={groupIndex} className="mb-5">{group.label && <h3 className="mb-2 text-sm font-extrabold text-green-deep">{group.label}</h3>}<ul className="divide-y divide-line-soft">{group.items.map((ingredient, index) => <li key={index} className="break-words py-2 text-sm leading-relaxed text-ink">{[ingredient.quantity, ingredient.unit, ingredient.item].filter(Boolean).join(" ")}{ingredient.note && <span className="block text-xs text-ink-muted">{ingredient.note}</span>}</li>)}</ul></div>)}
          </section></aside>
        </div>
      </div>
    </article>
  );
}
