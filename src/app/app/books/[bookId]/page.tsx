import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, SectionHeader, MemberAvatarStack, EmptyState, Button } from "@/components/ui";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { getBookPageData } from "@/lib/actions/books";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function BookHomePage({ params }: Props) {
  const { bookId } = await params;
  const data = await getBookPageData(bookId);
  if (!data) notFound();

  const { book, userMember, recent, favorites, collections } = data;

  const memberProfiles = (book.members ?? []).map((m: any) => ({
    id: m.user_id,
    name: m.profile?.full_name ?? "Family",
    avatarUrl: m.profile?.avatar_url ?? undefined,
  }));

  return (
    <AppShell bookId={bookId}>
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-bold text-green-deep leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {book.title}
            </h1>
            {book.description && (
              <p className="text-sm text-ink-muted mt-0.5 line-clamp-1">
                {book.description}
              </p>
            )}
          </div>
          <MemberAvatarStack
            members={memberProfiles}
            maxVisible={4}
            size="sm"
            showAddButton={userMember?.role === "keeper"}
            onAddMember={() => {}}
          />
        </div>

        {/* Search */}
        <Link
          href={`/app/books/${bookId}/recipes`}
          className="flex items-center gap-2 px-4 py-3 rounded-lg border text-ink-soft text-sm"
          style={{
            background: "var(--color-paper-soft)",
            borderColor: "var(--color-border)",
          }}
        >
          <Search size={16} strokeWidth={1.75} />
          What are we cooking today?
        </Link>
      </header>

      <div className="px-5 space-y-10 pb-6">
        {/* Recently added */}
        <section>
          <SectionHeader
            title="Recently added"
            decorative
            action={
              <Link href={`/app/books/${bookId}/recipes`}>
                <Button variant="ghost" size="sm">See all</Button>
              </Link>
            }
            className="mb-4"
          />
          {recent.length === 0 ? (
            <EmptyState
              title="No recipes yet"
              description="Add your first recipe to get started."
              action={
                <Link href={`/app/books/${bookId}/recipes/new`}>
                  <Button variant="primary" size="sm">
                    <Plus size={14} /> Add a recipe
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {recent.map((recipe: any) => (
                <Link
                  key={recipe.id}
                  href={`/app/books/${bookId}/recipes/${recipe.id}`}
                >
                  <RecipeCard
                    title={recipe.title}
                    description={recipe.description}
                    imageUrl={recipe.photo_url ?? undefined}
                    fromPerson={recipe.source_name ?? recipe.creator?.full_name}
                    cookTime={
                      recipe.cook_minutes
                        ? `${recipe.cook_minutes} min`
                        : undefined
                    }
                    servings={recipe.servings ?? undefined}
                    loveCount={recipe.loveCount}
                    category={recipe.category ?? undefined}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Family favorites */}
        {favorites.length > 0 && (
          <section>
            <SectionHeader title="Family favorites" decorative className="mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {favorites.map((recipe: any) => (
                <Link
                  key={recipe.id}
                  href={`/app/books/${bookId}/recipes/${recipe.id}`}
                >
                  <RecipeCard
                    title={recipe.title}
                    description={recipe.description}
                    imageUrl={recipe.photo_url ?? undefined}
                    fromPerson={recipe.source_name ?? recipe.creator?.full_name}
                    loveCount={recipe.loveCount}
                    category={recipe.category ?? undefined}
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Collections */}
        <section>
          <SectionHeader
            title="Collections"
            decorative
            action={
              userMember?.role !== "family" ? (
                <Link href={`/app/books/${bookId}/collections/new`}>
                  <Button variant="ghost" size="sm">
                    <Plus size={14} /> New
                  </Button>
                </Link>
              ) : undefined
            }
            className="mb-4"
          />
          {collections.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No collections yet.{" "}
              {userMember?.role !== "family" && (
                <Link
                  href={`/app/books/${bookId}/collections/new`}
                  className="text-green-deep font-semibold"
                >
                  Create one
                </Link>
              )}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {collections.map((col: any) => (
                <Link
                  key={col.id}
                  href={`/app/books/${bookId}/collections/${col.id}`}
                >
                  <CollectionCard collection={col} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
