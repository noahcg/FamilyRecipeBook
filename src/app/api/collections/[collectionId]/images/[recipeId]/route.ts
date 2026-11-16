import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { storageMediaReference } from "@/lib/media";

const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
const unavailable = () => new Response("Image unavailable", { status: 404, headers });

export async function GET(_request: Request, { params }: { params: Promise<{ collectionId: string; recipeId: string }> }) {
  const { collectionId, recipeId } = await params;
  if (!z.uuid().safeParse(collectionId).success || !z.uuid().safeParse(recipeId).success) return unavailable();
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return unavailable();
  // The RPC authorizes this signed-in subscription and exact unmoderated recipe
  // against current publication state. Never accept a Storage path from a reader.
  const { data: photoUrl, error } = await client.rpc("official_collection_photo", { target_collection_id: collectionId, target_recipe_id: recipeId });
  if (error || typeof photoUrl !== "string") return unavailable();
  const reference = storageMediaReference(photoUrl);
  if (reference?.bucket !== "recipe-images") return unavailable();
  const { data, error: downloadError } = await createServiceClient().storage.from(reference.bucket).download(reference.path);
  if (downloadError || !data || !["image/jpeg", "image/png", "image/webp", "image/heic"].includes(data.type)) return unavailable();
  return new Response(data.stream(), { headers: { ...headers, "Content-Type": data.type, "Content-Disposition": "inline" } });
}
