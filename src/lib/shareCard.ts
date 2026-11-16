import "server-only";
import { lookupShareableInvitation } from "@/lib/actions/shareableInvitations";
import { shareCardPhoto } from "@/lib/shareCardPhoto";
import { createServiceClient } from "@/lib/supabase/service";

export async function getInvitationShareCard(token: string) {
  const invitation = await lookupShareableInvitation(token);
  if (!invitation) return null;
  return getBookShareCard(invitation.bookId, invitation.cookbookTitle);
}

async function getBookShareCard(bookId: string, title: string) {
  const client = createServiceClient();
  const { data: book } = await client.from("recipe_books").select("share_card_recipe_id,share_card_photo_url,share_card_custom_path,share_card_show_eyebrow").eq("id", bookId).maybeSingle();
  if (book?.share_card_custom_path && !book.share_card_recipe_id) return { title, photo: { kind: "storage" as const, path: book.share_card_custom_path }, credit: null, showEyebrow: book.share_card_show_eyebrow !== false };
  if (!book?.share_card_recipe_id) return null;
  const { data: recipe } = await client.from("recipes").select("photo_url,photo_author,moderation_hidden").eq("id", book.share_card_recipe_id).eq("book_id", bookId).maybeSingle();
  const photo = recipe?.photo_url ? shareCardPhoto(recipe.photo_url) : null;
  if (recipe?.moderation_hidden || recipe?.photo_url !== book.share_card_photo_url || !photo) return null;
  return { title, photo, showEyebrow: book.share_card_show_eyebrow !== false, credit: photo.kind === "pexels" ? (recipe?.photo_author ? `Photo: ${recipe.photo_author} / Pexels` : "Photo: Pexels") : null };
}

export async function getCollectionShareCard(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const client = createServiceClient();
  const { data: collection } = await client.from("official_collections").select("book_id,title,publisher_id,published").eq("slug", slug).eq("published", true).maybeSingle();
  if (!collection) return null;
  const { data: book } = await client.from("recipe_books").select("owner_id").eq("id", collection.book_id).maybeSingle();
  if (!book || book.owner_id !== collection.publisher_id) return null;
  return getBookShareCard(collection.book_id, collection.title);
}
