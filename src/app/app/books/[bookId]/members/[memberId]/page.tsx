import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, EmptyState } from "@/components/ui";
import { MemberProfileCard } from "@/components/members/MemberProfileCard";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ bookId: string; memberId: string }>;
}

export default async function MemberProfilePage({ params }: Props) {
  const { bookId, memberId } = await params;
  const supabase = await createClient();

  const [memberRes, recipesRes] = await Promise.all([
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
  ]);

  if (!memberRes.data) notFound();

  const member = memberRes.data as any;
  const recipes = (recipesRes.data ?? []).map((r: any) => ({
    ...r,
    loveCount: r.reactions?.filter((rx: any) => rx.type === "love").length ?? 0,
  }));

  return (
    <AppShell bookId={bookId}>
      <div className="px-5 pt-5 pb-6">
        <Link
          href={`/app/books/${bookId}/members`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4 block"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Members
        </Link>

        <MemberProfileCard
          member={member}
          recipeCount={recipes.length}
          className="mb-6"
        />

        <h2
          className="text-base font-bold text-green-deep mb-4"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Recipes by {member.profile?.full_name ?? "this member"}
        </h2>

        {recipes.length === 0 ? (
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
