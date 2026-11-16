import Link from "next/link";
import { createHash } from "node:crypto";
import { getCollectionShareCard } from "@/lib/shareCard";
import type { Metadata } from "next";
import { cache } from "react";
import { EntryShell } from "@/components/layout/EntryShell";
import { Button } from "@/components/ui";
import { CollectionBookPreview } from "@/components/collections/CollectionBookPreview";
import { CollectionSubscriptionButton } from "@/components/collections/CollectionSubscriptionButton";
import { getUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { getOfficialCollectionChapters, getOfficialCollectionLibrary, getOfficialCollectionPreview } from "@/lib/officialCollections";
import { requireProfileName } from "@/lib/profileCompletion";

export const dynamic = "force-dynamic";
const getPreview = cache(getOfficialCollectionPreview);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getPreview(slug);
  const title = collection?.title ?? "Collection unavailable";
  const description = collection?.description ?? "This Home Cooked collection is no longer available.";
  const card = collection ? await getCollectionShareCard(slug) : null;
  const cardVersion = card ? createHash("sha256").update(JSON.stringify(["1", card.title, card.photo, card.credit, card.showEyebrow])).digest("hex").slice(0, 16) : null;
  const image = card ? `/collections/${slug}/card?v=${cardVersion}` : "/opengraph-image";
  return {
    title, description, robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function CollectionPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [collection, user] = await Promise.all([getPreview(slug), getUser()]);
  if (!collection) return <EntryShell title="This collection is unavailable." description="It may have been unpublished, or the link may have changed."><Link href={user ? "/app/bookshelf" : "/"} className="inline-flex min-h-11 items-center font-bold text-green-deep underline">{user ? "Go to my bookshelf" : "Home Cooked home"}</Link></EntryShell>;
  const nextPath = `/collections/${collection.slug}`;
  if (user) await requireProfileName(user.id, nextPath);
  const [chapters, library] = await Promise.all([getOfficialCollectionChapters(collection.slug), user ? getOfficialCollectionLibrary() : Promise.resolve([])]);
  const added = library.some((item) => item.id === collection.id);
  return (
    <EntryShell eyebrow="A free Home Cooked collection" title={collection.title} description={collection.description}
      sideTitle="A little inspiration for your next gathering."
      sideDescription="Add the collection to your bookshelf and return whenever you are ready to cook."
      sideNote="Good recipes are worth sharing.">
      <CollectionBookPreview collection={collection} chapters={chapters ?? []} chaptersUnavailable={chapters === null}>
        <p className="mb-4 text-sm leading-relaxed text-ink-muted">Enjoy this book’s recipes—we’ll handle all edits and updates. It’s a free extra, so you can still create your own cookbook.</p>
        {user ? <>
          <p className="mb-3 break-words text-xs text-ink-muted">Signed in as <strong>{user.email}</strong>.</p>
          <div className="flex flex-wrap items-center gap-2">
            {added ? <div><p role="status" className="text-sm font-bold text-green-deep">Already on your bookshelf</p><Link href={`/app/collections/${collection.id}`} className="inline-flex min-h-12 items-center font-bold text-green-deep underline">Open cookbook</Link></div> : <CollectionSubscriptionButton collectionId={collection.id} />}
            <form action={signOut}><input type="hidden" name="redirect_to" value={nextPath} /><Button type="submit" variant="ghost" size="sm" className="min-h-11">Use a different account</Button></form>
          </div>
        </> : <Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`} className="inline-flex min-h-11 items-center font-bold text-green-deep underline">Sign in or create a free account</Link>}
      </CollectionBookPreview>
    </EntryShell>
  );
}
