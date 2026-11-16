import { BookshelfPage } from "@/components/book/BookshelfPage";
import { AppShell } from "@/components/layout/AppShell";
import { getCookbookNavData } from "@/lib/actions/books";
import { getOfficialCollectionLibrary } from "@/lib/officialCollections";

export default async function BookshelfRoute({ searchParams }: { searchParams: Promise<{ collectionRemoved?: string }> }) {
  const [{ books }, collections, search] = await Promise.all([getCookbookNavData(), getOfficialCollectionLibrary(), searchParams]);

  return (
    <AppShell>
      {search.collectionRemoved === "1" && <p role="status" className="mx-5 mt-5 rounded-sm bg-green-pale p-4 text-sm font-bold text-green-deep">Collection removed from your bookshelf.</p>}
      <BookshelfPage books={books} collections={collections} />
    </AppShell>
  );
}
