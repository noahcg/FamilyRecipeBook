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
      <div className="px-5 pt-5 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-xl font-bold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Collections
          </h1>
          {canContribute && (
            <Link href={`/app/books/${bookId}/collections/new`}>
              <Button variant="primary" size="sm">
                <Plus size={14} /> New
              </Button>
            </Link>
          )}
        </div>

        {collections.length === 0 ? (
          <EmptyState
            title="No collections yet"
            description="Group recipes into collections like Holidays, Quick Meals, or Sunday Dinners."
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
          <div className="grid grid-cols-2 gap-3">
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
