import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ChevronDown, Leaf } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, SectionHeader, MemberAvatarStack, EmptyState, Button } from "@/components/ui";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { getBookPageData } from "@/lib/actions/books";
import type { Collection } from "@/lib/types";

interface Props {
  params: Promise<{ bookId: string }>;
}

interface HomeMember {
  user_id: string;
  role?: string;
  profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface HomeRecipe {
  id: string;
  title: string;
  description?: string | null;
  photo_url?: string | null;
  source_name?: string | null;
  cook_minutes?: number | null;
  servings?: number | null;
  loveCount?: number;
  category?: string | null;
  creator?: {
    full_name?: string | null;
  } | null;
}

export default async function BookHomePage({ params }: Props) {
  const { bookId } = await params;
  const data = await getBookPageData(bookId);
  if (!data) notFound();

  const { book, userMember, recent, favorites, collections } = data;

  const members = (book.members ?? []) as HomeMember[];
  const recentRecipes = recent as HomeRecipe[];
  const favoriteRecipes = favorites as HomeRecipe[];
  const bookCollections = collections as Collection[];

  const memberProfiles = members.map((m) => ({
    id: m.user_id,
    name: m.profile?.full_name ?? "Family",
    avatarUrl: m.profile?.avatar_url ?? undefined,
  }));

  return (
    <AppShell bookId={bookId}>
      {/* Header */}
      <header className="border-b border-line-soft px-5 pb-6 pt-6 lg:px-8 lg:pb-10 lg:pt-8">
        <p className="mb-2 hidden text-sm font-semibold text-ink lg:block">
          Welcome back, Katherine! <span aria-hidden="true">👋</span>
        </p>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <Link href={`/app/books/${bookId}/members`} className="flex items-center gap-2 min-w-0">
              <h1
                className="truncate text-3xl font-bold leading-tight text-green-deep lg:text-4xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {book.title}
              </h1>
              <ChevronDown size={20} strokeWidth={2} className="mt-1 shrink-0 text-green-deep" />
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-muted">
              <MemberAvatarStack members={memberProfiles} maxVisible={4} />
              <span>{members.length} members</span>
              <span className="opacity-40">·</span>
              <span>Updated this week</span>
              <Leaf size={22} strokeWidth={1.5} className="hidden text-accent-honey lg:block" />
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <Link
              href={`/app/books/${bookId}/recipes`}
              className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-line-soft bg-card px-4 text-sm text-ink-soft shadow-xs xl:w-80 xl:flex-none"
            >
              <span className="flex-1 truncate">What are we cooking today?</span>
              <Search size={17} strokeWidth={1.75} className="shrink-0 text-ink" />
            </Link>
            <Link href={`/app/books/${bookId}/recipes/new`}>
              <Button variant="primary" size="md" className="h-12 w-full rounded-md px-5 sm:w-auto">
                <Plus size={17} /> Add Recipe
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] space-y-9 px-5 py-6 lg:px-8">
        {/* Recently added */}
        <section>
            <div>
              <SectionHeader
                title="Recently Added"
                action={
                  <Link href={`/app/books/${bookId}/recipes`}>
                    <Button variant="ghost" size="sm">View all</Button>
                </Link>
              }
              className="mb-4"
            />
          </div>
          {recentRecipes.length === 0 ? (
            <div>
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
            <div>
              <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4 sm:overflow-visible snap-x snap-mandatory">
                {recentRecipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/app/books/${bookId}/recipes/${recipe.id}`}
                    className="shrink-0 w-44 snap-start sm:w-auto"
                  >
                    <RecipeCard
                      title={recipe.title}
                      description={recipe.description ?? undefined}
                      imageUrl={recipe.photo_url ?? undefined}
                      fromPerson={recipe.source_name ?? recipe.creator?.full_name ?? undefined}
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
        {favoriteRecipes.length > 0 && (
          <section>
            <div>
              <SectionHeader
                title="Family Favorites"
                action={
                  <Link href={`/app/books/${bookId}/recipes`}>
                    <Button variant="ghost" size="sm">View all</Button>
                  </Link>
                }
                className="mb-4"
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {favoriteRecipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/app/books/${bookId}/recipes/${recipe.id}`}
                  >
                    <RecipeCard
                      title={recipe.title}
                      description={recipe.description ?? undefined}
                      imageUrl={recipe.photo_url ?? undefined}
                      fromPerson={recipe.source_name ?? recipe.creator?.full_name ?? undefined}
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
        <section>
          <SectionHeader
            title="Collections"
            decorative
            action={
              (userMember as HomeMember | null)?.role !== "family" ? (
                <Link href={`/app/books/${bookId}/collections/new`}>
                  <Button variant="ghost" size="sm">
                    <Plus size={14} /> New
                  </Button>
                </Link>
              ) : undefined
            }
            className="mb-4"
          />
          {bookCollections.length === 0 ? (
            <EmptyState
              title="Start a little shelf."
              description="Group recipes for holidays, quick meals, Sunday dinners, or anything your family loves."
              action={
                (userMember as HomeMember | null)?.role !== "family" ? (
                  <Link href={`/app/books/${bookId}/collections/new`}>
                    <Button variant="primary" size="sm">
                      <Plus size={14} /> Create collection
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {bookCollections.map((col) => (
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
