import { notFound } from "next/navigation";
import { BookSettingsPageContent } from "@/components/settings/SettingsPageContent";
import { listCategories } from "@/lib/actions/categories";
import { requireUser } from "@/lib/auth";
import { canContribute } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { shareCardPhoto } from "@/lib/shareCardPhoto";
import type { BookRole } from "@/lib/types";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function BookSettingsPage({ params }: Props) {
  const { bookId } = await params;
  const [user, supabase] = await Promise.all([
    requireUser(),
    createClient(),
  ]);

  const [bookRes, bookPrefsRes, memberRes, settingsRes, sharedMemberRes, pendingInviteRes] = await Promise.all([
    supabase.from("recipe_books").select("title,sharing_enabled,contributors_can_invite").eq("id", bookId).single(),
    supabase.from("recipe_books").select("cover_style,sharing_enabled").eq("id", bookId).single(),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_settings")
      .select("default_book_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("book_members")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId)
      .neq("role", "keeper"),
    supabase
      .from("book_invitations")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId)
      .is("accepted_at", null)
      .gte("expires_at", new Date().toISOString()),
  ]);

  if (!bookRes.data || !memberRes.data) notFound();

  const role = memberRes.data.role as BookRole;
  const canManageCategories = canContribute(role);
  const categories = canManageCategories ? await listCategories(bookId) : [];
  const [cardRes, recipesRes] = role === "keeper" ? await Promise.all([
    supabase.from("recipe_books").select("share_card_recipe_id,share_card_photo_url,share_card_custom_path").eq("id", bookId).single(),
    supabase.from("recipes").select("id,title,photo_url").eq("book_id", bookId).not("photo_url", "is", null).eq("moderation_hidden", false).order("title"),
  ]) : [{ data: null, error: null }, { data: [], error: null }];
  const shareCardRecipes = (recipesRes.data ?? []).filter((recipe) => recipe.photo_url && shareCardPhoto(recipe.photo_url)) as { id: string; title: string; photo_url: string }[];

  return (
    <BookSettingsPageContent
      bookId={bookId}
      bookTitle={bookRes.data.title}
      bookCoverStyle={bookPrefsRes.data?.cover_style ?? "sage"}
      sharingEnabled={bookRes.data.sharing_enabled ?? false}
      contributorsCanInvite={bookRes.data.contributors_can_invite ?? false}
      sharingBlockerCount={(sharedMemberRes.count ?? 0) + (pendingInviteRes.count ?? 0)}
      isDefaultBook={settingsRes.data?.default_book_id === bookId}
      bookPreferencesReady={!bookPrefsRes.error && !settingsRes.error}
      sharingPreferencesReady={!bookRes.error && !sharedMemberRes.error && !pendingInviteRes.error}
      isKeeper={role === "keeper"}
      canManageCategories={canManageCategories}
      categories={categories}
      shareCardRecipeId={cardRes.data?.share_card_recipe_id ?? null}
      shareCardCustomPath={cardRes.data?.share_card_custom_path ?? null}
      shareCardUserId={user.id}
      shareCardRecipes={shareCardRecipes}
      shareCardNeedsReview={!!cardRes.data?.share_card_recipe_id && !shareCardRecipes.some((recipe) => recipe.id === cardRes.data?.share_card_recipe_id && recipe.photo_url === cardRes.data?.share_card_photo_url)}
      shareCardReady={!cardRes.error && !recipesRes.error}
    />
  );
}
