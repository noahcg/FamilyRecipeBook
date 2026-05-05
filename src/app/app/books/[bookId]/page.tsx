import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  Heart,
  Leaf,
  Plus,
  Search,
} from "lucide-react";
import { BookName } from "@/components/book/BookName";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, MemberAvatarStack, Button } from "@/components/ui";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { AIRecipeIdeaPanel } from "@/components/recipe/AIRecipeIdeaPanel";
import { requireProfile } from "@/lib/auth";
import { getBookPageData } from "@/lib/actions/books";

interface Props {
  params: Promise<{ bookId: string }>;
}

function SectionTitle({
  title,
  href,
  icon,
}: {
  title: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2
        className="flex items-center gap-2 text-xl font-semibold leading-tight text-green-deep"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {icon}
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-green-deep hover:underline">
          View all
        </Link>
      )}
    </div>
  );
}

export default async function BookHomePage({ params }: Props) {
  const { bookId } = await params;
  const [data, profile] = await Promise.all([
    getBookPageData(bookId),
    requireProfile(),
  ]);
  if (!data) notFound();

  const { book, recent, favorites, collections } = data;

  const members = (book.members ?? []).map((m: any) => ({
    id: m.user_id,
    name: m.profile?.full_name ?? "Family",
    avatarUrl: m.profile?.avatar_url ?? undefined,
  }));

  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "there";
  const recentSlice = recent.slice(0, 4);

  return (
    <AppShell bookId={bookId}>
      <div className="min-h-dvh px-5 py-4 lg:px-6">
        <div className="mx-auto max-w-[1180px]">
          <header className="border-b border-line-soft px-0 pb-9 pt-4 lg:pt-5">
            <p className="mb-3 hidden text-sm font-semibold text-ink lg:block">
              Welcome back, {firstName}!
            </p>
            <div className="flex flex-col gap-5 min-[1320px]:flex-row min-[1320px]:items-end min-[1320px]:justify-between">
              <div className="min-w-0">
                <Link href={`/app/books/${bookId}/members`} className="flex items-center gap-2 min-w-0">
                  <h1
                    className="truncate text-3xl font-bold leading-tight text-green-deep lg:text-4xl"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    <BookName />
                  </h1>
                  <ChevronDown size={20} strokeWidth={2} className="mt-1 shrink-0 text-green-deep" />
                </Link>
                {members.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-muted">
                    <MemberAvatarStack members={members} maxVisible={4} />
                    <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
                    <Leaf size={22} strokeWidth={1.5} className="hidden text-accent-honey lg:block" />
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row min-[1320px]:w-auto">
                <Link
                  href={`/app/books/${bookId}/recipes`}
                  className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-line bg-card px-4 text-sm text-ink-soft shadow-xs min-[1320px]:w-[300px] min-[1320px]:flex-none"
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

          <div className="space-y-8 py-6">
            <AIRecipeIdeaPanel bookId={bookId} />

            {recentSlice.length > 0 && (
              <section>
                <SectionTitle title="Recently Added" href={`/app/books/${bookId}/recipes`} />
                <div className="grid grid-cols-2 gap-4 min-[1320px]:grid-cols-4">
                  {recentSlice.map((recipe: any) => (
                    <Link key={recipe.id} href={`/app/books/${bookId}/recipes/${recipe.id}`}>
                      <RecipeCard
                        title={recipe.title}
                        imageUrl={recipe.photo_url ?? undefined}
                        fromPerson={recipe.source_name ?? recipe.creator?.full_name}
                        category={recipe.category ?? undefined}
                        loveCount={recipe.loveCount}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {favorites.length > 0 && (
              <section>
                <SectionTitle
                  title="Family Favorites"
                  href={`/app/books/${bookId}/favorites`}
                  icon={<Heart size={17} fill="currentColor" className="text-accent-terracotta" />}
                />
                <div className="grid grid-cols-2 gap-4 min-[1320px]:grid-cols-4">
                  {favorites.map((recipe: any) => (
                    <Link key={recipe.id} href={`/app/books/${bookId}/recipes/${recipe.id}`}>
                      <RecipeCard
                        title={recipe.title}
                        imageUrl={recipe.photo_url ?? undefined}
                        fromPerson={recipe.source_name ?? recipe.creator?.full_name}
                        category={recipe.category ?? undefined}
                        loveCount={recipe.loveCount}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {collections.length > 0 && (
              <section>
                <SectionTitle title="Collections" href={`/app/books/${bookId}/collections`} />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 min-[1320px]:grid-cols-5">
                  {collections.map((col: any) => (
                    <Link key={col.id} href={`/app/books/${bookId}/collections/${col.id}`}>
                      <CollectionCard
                        collection={col}
                        recipeCount={col.recipes?.length ?? 0}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {recent.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p
                  className="mb-2 text-2xl font-bold text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Your recipe book is empty
                </p>
                <p className="mb-6 text-sm text-ink-muted">
                  Add your first recipe to get started.
                </p>
                <Link href={`/app/books/${bookId}/recipes/new`}>
                  <Button variant="primary" size="md">
                    <Plus size={16} /> Add a recipe
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
