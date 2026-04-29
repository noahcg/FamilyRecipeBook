import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, EmptyState, Badge } from "@/components/ui";
import { MemberProfileCard } from "@/components/members/MemberProfileCard";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ bookId: string; memberId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const ACTIVITY_ICONS: Record<string, string> = {
  recipe_created: "📖",
  love: "♥",
  made_it: "🍳",
  favorite: "★",
};

const ACTIVITY_LABELS: Record<string, string> = {
  recipe_created: "Added",
  love: "Loved",
  made_it: "Made",
  favorite: "Favorited",
};

export default async function MemberProfilePage({ params, searchParams }: Props) {
  const { bookId, memberId } = await params;
  const { tab = "recipes" } = await searchParams;
  const supabase = await createClient();

  const [memberRes, recipesRes, activityRes] = await Promise.all([
    supabase
      .from("book_members")
      .select("*, profile:profiles(*)")
      .eq("book_id", bookId)
      .eq("user_id", memberId)
      .single(),
    supabase
      .from("recipes")
      .select("*, reactions:recipe_reactions(type)")
      .eq("book_id", bookId)
      .eq("created_by", memberId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select("*, recipe:recipes(id, title)")
      .eq("book_id", bookId)
      .eq("actor_id", memberId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!memberRes.data) notFound();

  const member = memberRes.data as any;
  const recipes = (recipesRes.data ?? []).map((r: any) => ({
    ...r,
    loveCount: r.reactions?.filter((rx: any) => rx.type === "love").length ?? 0,
  }));
  const activity = activityRes.data ?? [];

  return (
    <AppShell bookId={bookId}>
      <div className="px-5 pt-5 pb-6">
        <Link
          href={`/app/books/${bookId}/members`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Members
        </Link>

        <MemberProfileCard
          member={member}
          recipeCount={recipes.length}
          className="mb-6"
        />

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: "var(--color-paper-soft)" }}
        >
          {["recipes", "activity"].map((t) => (
            <Link
              key={t}
              href={`/app/books/${bookId}/members/${memberId}?tab=${t}`}
              className="flex-1 text-center py-2 rounded-lg text-sm font-semibold transition-colors"
              style={
                tab === t
                  ? {
                      background: "var(--color-card)",
                      color: "var(--color-deep-green)",
                      boxShadow: "var(--shadow-card)",
                    }
                  : { color: "var(--color-ink-muted)" }
              }
            >
              {t === "recipes" ? "Recipes" : "Activity"}
            </Link>
          ))}
        </div>

        {tab === "activity" ? (
          activity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Their actions in this book will appear here."
            />
          ) : (
            <div className="space-y-3">
              {activity.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-3 border-b"
                  style={{ borderColor: "var(--color-border-soft)" }}
                >
                  <span className="text-lg leading-none pt-0.5" aria-hidden="true">
                    {ACTIVITY_ICONS[event.type] ?? "📝"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-ink">
                      <span className="font-semibold">
                        {ACTIVITY_LABELS[event.type] ?? event.type}
                      </span>{" "}
                      {event.recipe?.title && (
                        <Link
                          href={`/app/books/${bookId}/recipes/${event.recipe.id}`}
                          className="text-green-deep hover:underline"
                        >
                          {event.recipe.title}
                        </Link>
                      )}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {new Date(event.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : recipes.length === 0 ? (
          <EmptyState
            title="No recipes added yet"
            description="They haven't contributed a recipe yet."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recipes.map((recipe: any) => (
              <Link
                key={recipe.id}
                href={`/app/books/${bookId}/recipes/${recipe.id}`}
              >
                <RecipeCard
                  title={recipe.title}
                  description={recipe.description}
                  imageUrl={recipe.photo_url ?? undefined}
                  fromPerson={recipe.source_name}
                  loveCount={recipe.loveCount}
                  category={recipe.category ?? undefined}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
