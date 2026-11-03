import "server-only";
import { lookupShareableInvitation } from "@/lib/actions/shareableInvitations";
import { shareCardPhoto } from "@/lib/shareCardPhoto";
import { createServiceClient } from "@/lib/supabase/service";

export async function getInvitationShareCard(token: string) {
  const invitation = await lookupShareableInvitation(token);
  if (!invitation) return null;
  const client = createServiceClient();
  const { data: book } = await client.from("recipe_books").select("share_card_recipe_id,share_card_photo_url,share_card_custom_path").eq("id", invitation.bookId).maybeSingle();
  if (book?.share_card_custom_path && !book.share_card_recipe_id) return { title: invitation.cookbookTitle, photo: { kind: "storage" as const, path: book.share_card_custom_path }, credit: null };
  if (!book?.share_card_recipe_id) return null;
  const { data: recipe } = await client.from("recipes").select("photo_url,photo_author,moderation_hidden").eq("id", book.share_card_recipe_id).eq("book_id", invitation.bookId).maybeSingle();
  const photo = recipe?.photo_url ? shareCardPhoto(recipe.photo_url) : null;
  if (recipe?.moderation_hidden || recipe?.photo_url !== book.share_card_photo_url || !photo) return null;
  return { title: invitation.cookbookTitle, photo, credit: photo.kind === "pexels" ? (recipe?.photo_author ? `Photo: ${recipe.photo_author} / Pexels` : "Photo: Pexels") : null };
}
