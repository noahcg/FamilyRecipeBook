import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui";
import { CollectionRecipes } from "@/components/collections/CollectionRecipes";
import { CollectionSubscriptionButton } from "@/components/collections/CollectionSubscriptionButton";
import { getCollectionRecipes, getOfficialCollectionChapters, getOfficialCollectionLibrary } from "@/lib/officialCollections";
import { getFirstBookId } from "@/lib/actions/books";

export default async function CollectionPage({ params, searchParams }: {
  params: Promise<{ collectionId: string }>;
  searchParams: Promise<{ q?: string; page?: string; added?: string }>;
}) {
  const { collectionId } = await params;
  const search = await searchParams;
  const library = await getOfficialCollectionLibrary();
  const collection = library.find((item) => item.id === collectionId);
  if (!collection) notFound();
  const query = typeof search.q === "string" ? search.q.slice(0, 120) : "";
  const [firstPage, chapters] = collection.published ? await Promise.all([getCollectionRecipes(collectionId, "", 0), getOfficialCollectionChapters(collection.slug)]) : [null, null];
  const pages = firstPage ? await Promise.all(Array.from({ length: Math.max(0, Math.ceil(firstPage.total / 24) - 1) }, (_, index) => getCollectionRecipes(collectionId, "", index + 1))) : [];
  if (firstPage && pages.some((page) => !page)) notFound();
  const removeHref = library.length === 1 && !(await getFirstBookId()) ? "/onboarding?collectionRemoved=1" : "/app/bookshelf?collectionRemoved=1";
  if (firstPage) return <CollectionRecipes collection={collection} recipes={[...firstPage.recipes, ...pages.flatMap((page) => page?.recipes ?? [])]} chapterOrder={chapters ?? []} initialQuery={query} removeHref={removeHref} added={search.added === "1"} />;
  return <AppShell>
    {search.added === "1" && <p role="status" className="mx-5 mt-5 rounded-sm bg-green-pale p-4 text-sm font-bold text-green-deep">Collection added to your bookshelf. It does not use your personal cookbook allowance.</p>}
    <div className="p-5 sm:p-8"><Card>
      <h1 className="text-2xl font-bold text-green-deep">{collection.title}</h1>
      <p className="mt-3 text-sm text-ink-muted">This collection is currently unavailable. You can keep it on your bookshelf for when it returns, or remove it.</p>
      <Link href="/app/bookshelf" className="mt-4 inline-flex min-h-11 items-center font-bold text-green-deep underline">Back to my bookshelf</Link>
    </Card></div>
    <div className="border-t border-line-soft px-5 py-6 sm:px-8"><p className="mb-3 text-sm text-ink-muted">Removing this collection only removes it from your bookshelf.</p><CollectionSubscriptionButton collectionId={collectionId} remove removeHref={removeHref} /></div>
  </AppShell>;
}
