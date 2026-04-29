import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  Heart,
  Leaf,
  Plus,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, MemberAvatarStack, Button, CookbookIcon } from "@/components/ui";
import { AIRecipeIdeaPanel } from "@/components/recipe/AIRecipeIdeaPanel";
import { requireProfile } from "@/lib/auth";
import { getBookPageData } from "@/lib/actions/books";

interface Props {
  params: Promise<{ bookId: string }>;
}

interface HomeMember {
  user_id: string;
  profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

const FOOD_IMAGES = {
  chicken:
    "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=700&q=80",
  spaghetti:
    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=700&q=80",
  pie:
    "https://images.unsplash.com/photo-1621743478914-cc8a86d7e7b5?auto=format&fit=crop&w=900&q=80",
  soup:
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=700&q=80",
  enchiladas:
    "https://images.unsplash.com/photo-1534352956036-cd81e27dd615?auto=format&fit=crop&w=700&q=80",
  pancakes:
    "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=700&q=80",
  beef:
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80",
  mac:
    "https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?auto=format&fit=crop&w=700&q=80",
};

const RECENT_RECIPES = [
  { title: "Lemon Herb Chicken", person: "Mom", image: FOOD_IMAGES.chicken },
  { title: "Classic Spaghetti", person: "Dad", image: FOOD_IMAGES.spaghetti },
  { title: "Grandma's Apple Pie", person: "Grandma", image: FOOD_IMAGES.pie },
  { title: "Hearty Chicken Noodle Soup", person: "Aunt Lisa", image: FOOD_IMAGES.soup },
];

const FAVORITE_RECIPES = [
  { title: "Chicken Enchiladas", person: "8", image: FOOD_IMAGES.enchiladas },
  { title: "Sunday Pancakes", person: "12", image: FOOD_IMAGES.pancakes },
  { title: "Beef Bourguignon", person: "7", image: FOOD_IMAGES.beef },
  { title: "Homemade Mac & Cheese", person: "11", image: FOOD_IMAGES.mac },
];

const COLLECTIONS = [
  { title: "Holidays", count: "18 recipes", icon: "holiday" },
  { title: "Quick Meals", count: "24 recipes", icon: "quick" },
  { title: "Sunday Dinners", count: "16 recipes", icon: "dinner" },
  { title: "Comfort Food", count: "22 recipes", icon: "comfort" },
  { title: "Sweet Treats", count: "15 recipes", icon: "dessert" },
];

const FALLBACK_MEMBERS = [
  { id: "grandma", name: "Grandma" },
  { id: "mom", name: "Mom" },
  { id: "dad", name: "Dad" },
  { id: "aunt-lisa", name: "Aunt Lisa" },
  { id: "uncle-joe", name: "Uncle Joe" },
  { id: "sam", name: "Sam" },
  { id: "katherine", name: "Katherine" },
  { id: "noah", name: "Noah" },
];

interface SectionTitleProps {
  title: string;
  action?: string;
  icon?: React.ReactNode;
}

function SectionTitle({ title, action = "View all", icon }: SectionTitleProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2
        className="flex items-center gap-2 text-xl font-semibold leading-tight text-green-deep"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {icon}
        {title}
      </h2>
      <span className="text-sm font-semibold text-green-deep">{action}</span>
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

  const { book } = data;

  const members = (book.members ?? []) as HomeMember[];
  const memberProfiles = members.length > 0 ? members.map((m) => ({
    id: m.user_id,
    name: m.profile?.full_name ?? "Family",
    avatarUrl: m.profile?.avatar_url ?? undefined,
  })) : FALLBACK_MEMBERS;
  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "there";

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
                    The Family Table
                  </h1>
                  <ChevronDown size={20} strokeWidth={2} className="mt-1 shrink-0 text-green-deep" />
                </Link>
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-muted">
                  <MemberAvatarStack members={memberProfiles} maxVisible={4} />
                  <span>8 members</span>
                  <span className="opacity-40">·</span>
                  <span>Updated this week</span>
                  <Leaf size={22} strokeWidth={1.5} className="hidden text-accent-honey lg:block" />
                </div>
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

            <section>
              <SectionTitle title="Recently Added" />
              <div className="grid grid-cols-2 gap-4 min-[1320px]:grid-cols-4">
                {RECENT_RECIPES.map((recipe) => (
                  <RecipeCard
                    key={recipe.title}
                    title={recipe.title}
                    imageUrl={recipe.image}
                    fromPerson={recipe.person}
                  />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle
                title="Family Favorites"
                icon={<Heart size={17} fill="currentColor" className="text-accent-terracotta" />}
              />
              <div className="grid grid-cols-2 gap-4 min-[1320px]:grid-cols-4">
                {FAVORITE_RECIPES.map((recipe) => (
                  <RecipeCard
                    key={recipe.title}
                    title={recipe.title}
                    imageUrl={recipe.image}
                    fromPerson={recipe.person}
                    attributionPrefix="Loved by"
                  />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle title="Collections" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 min-[1320px]:grid-cols-5">
                {COLLECTIONS.map((collection) => (
                  <div key={collection.title} className="recipe-card flex min-h-[124px] flex-col items-center justify-center p-4 text-center">
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-card-muted">
                      <CookbookIcon name={collection.icon} size={27} />
                    </span>
                    <h3
                      className="text-base font-semibold text-green-deep"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {collection.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-muted">{collection.count}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
