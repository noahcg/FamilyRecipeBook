import { createClient } from "./supabase/client";
import { prepareImageUpload } from "./prepareImageUpload";

async function uploadImage(file: File, userId: string, bucket: "recipe-images" | "avatars", maxDimension: number): Promise<{ url: string } | { error: string }> {
  try {
    const { blob, extension } = await prepareImageUpload(file, maxDimension);
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const storage = createClient().storage.from(bucket);
    const { error } = await storage.upload(path, blob, { upsert: false, contentType: blob.type });
    if (error) return { error: error.message };
    // Persist the stable object identifier; rendering resolves authorized access.
    const { data } = storage.getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Image upload failed. Please try again." };
  }
}

export async function uploadRecipeImage(file: File, userId: string) {
  return uploadImage(file, userId, "recipe-images", 1800);
}

export async function uploadAvatar(file: File, userId: string) {
  return uploadImage(file, userId, "avatars", 640);
}
