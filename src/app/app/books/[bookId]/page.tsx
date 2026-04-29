import { notFound } from "next/navigation";
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

  // "Updated this week" line — count recipes added in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentCount = recent.filter((r: any) => r.created_at > weekAgo).length;

  return (
    <AppShell bookId={bookId}>
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-bold text-green-deep leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {book.title}
            </h1>
            {recentCount > 0 && (
              <p className="text-xs text-ink-soft mt-0.5">
                {recentCount} recipe{recentCount !== 1 ? "s" : ""} added this week
              </p>
            )}
          </div>
          <Link href={`/app/books/${bookId}/members`} className="shrink-0 ml-3">
            <MemberAvatarStack
              members={memberProfiles}
              maxVisible={4}
              size="sm"
              showAddButton={userMember?.role === "keeper"}
            />
          </Link>
        </div>

        {/* Search bar */}
        <Link
          href={`/app/books/${bookId}/recipes`}
          className="flex items-center gap-2 px-4 py-3 mt-4 rounded-lg border text-ink-soft text-sm"
          style={{
            background: "var(--color-paper-soft)",
            borderColor: "var(--color-border)",
          }}
        >
          <Search size={16} strokeWidth={1.75} className="shrink-0" />
          <span className="flex-1">What are we cooking today?</span>
          <Search size={14} strokeWidth={1.75} className="shrink-0 opacity-30" />
        </Link>
      </header>

      <div className="space-y-10 pb-6">
        {/* Recently added */}
        <section>
          <div className="px-5">
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
          </div>
          {recent.length === 0 ? (
            <div className="px-5">
              <EmptyState
                title="Your first recipe belongs here."
                description="Start with something your family already asks for."
                action={
                  <Link href={`/app/books/${bookId}/recipes/new`}>
                    <Button variant="primary" size="sm">
                      <Plus size={14} /> Add a recipe
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            /* Horizontal scroll on mobile, grid on desktop */
            <div className="px-5 sm:px-5">
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible snap-x snap-mandatory">
                {recent.map((recipe: any) => (
                  <Link
                    key={recipe.id}
                    href={`/app/books/${bookId}/recipes/${recipe.id}`}
                    className="shrink-0 w-44 sm:w-auto snap-start"
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
            </div>
          )}
        </section>

        {/* Family favorites */}
        {favorites.length > 0 && (
          <section>
            <div className="px-5">
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
            </div>
          </section>
        )}

        {/* Collections */}
        <section className="px-5">
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
            <EmptyState
              title="Start a little shelf."
              description="Group recipes for holidays, quick meals, Sunday dinners, or anything your family loves."
              action={
                userMember?.role !== "family" ? (
                  <Link href={`/app/books/${bookId}/collections/new`}>
                    <Button variant="primary" size="sm">
                      <Plus size={14} /> Create collection
                    </Button>
                  </Link>
                ) : undefined
              }
            />
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
