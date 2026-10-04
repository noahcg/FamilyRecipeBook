import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PRIVATE_MEDIA_BUCKETS, storageMediaReference, validMediaPath, type PrivateMediaBucket } from "@/lib/media";
import { z } from "zod";

const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Vary": "Cookie" };
const unavailable = () => new Response("Image unavailable", { status: 404, headers });

export async function GET(request: Request, context: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path: parts } = await context.params;
  const path = parts.join("/");
  if (!PRIVATE_MEDIA_BUCKETS.includes(bucket as PrivateMediaBucket) || !validMediaPath(path)) return unavailable();
  const shareId = new URL(request.url).searchParams.get("share");
  let client;
  if (shareId) {
    if (bucket !== "recipe-images" || !z.uuid().safeParse(shareId).success) return unavailable();
    // An intentional share authorizes only that recipe's photo, never a whole bucket.
    client = createServiceClient();
    const { data: share, error } = await client.from("recipe_public_shares").select("recipe_id").eq("share_id", shareId).maybeSingle();
    if (error || !share) return unavailable();
    const { data: recipe } = await client.from("recipes").select("photo_url,moderation_hidden").eq("id", share.recipe_id).maybeSingle();
    const reference = recipe?.photo_url ? storageMediaReference(recipe.photo_url) : null;
    if (!recipe || recipe.moderation_hidden || reference?.bucket !== bucket || reference.path !== path) return unavailable();
  } else {
    client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return unavailable();
    // Storage RLS checks membership, including removal, on each download.
  }
  const { data, error } = await client.storage.from(bucket).download(path);
  const allowedTypes = bucket === "recipe-originals"
    ? ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    : ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (error || !data || !allowedTypes.includes(data.type)) return unavailable();
  const fileName = parts.at(-1)?.replace(/^[0-9a-f-]{36}_/, "") ?? "original.pdf";
  const disposition = data.type === "application/pdf"
    ? `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}` : "inline";
  // Stream attachments; original files may exceed buffered response limits.
  return new Response(data.stream(), { headers: { ...headers, "Content-Type": data.type, "Content-Disposition": disposition } });
}
