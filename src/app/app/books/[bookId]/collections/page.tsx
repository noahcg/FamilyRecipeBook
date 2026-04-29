import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, Button } from "@/components/ui";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function CollectionsPage({ params }: Props) {
  const { bookId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [collectionsRes, memberRes] = await Promise.all([
    supabase
      .from("collections")
      .select("*, recipes:collection_recipes(id)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false }),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
  ]);

  const collections = collectionsRes.data ?? [];
  const userRole = memberRes.data?.role ?? null;
  const canContribute = userRole === "keeper" || userRole === "contributor";

  return (
    <AppShell bookId={bookId}>
      <div className="mx-auto max-w-[1180px] px-5 py-8 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 border-b border-line-soft pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-muted">The Family Table</p>
            <h1
              className="text-3xl font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Collections
            </h1>
          </div>
          {canContribute && (
            <Link href={`/app/books/${bookId}/collections/new`}>
              <Button variant="primary" size="md" className="rounded-md">
                <Plus size={16} /> New Collection
              </Button>
            </Link>
          )}
        </div>

        {collections.length === 0 ? (
          <EmptyState
            title="Start a little shelf."
            description="Group recipes for holidays, quick meals, Sunday dinners, or anything your family loves."
            action={
              canContribute ? (
                <Link href={`/app/books/${bookId}/collections/new`}>
                  <Button variant="primary" size="sm">
                    <Plus size={14} /> Create a collection
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/app/books/${bookId}/collections/${col.id}`}
              >
                <CollectionCard
                  collection={col}
                  recipeCount={col.recipes?.length ?? 0}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
