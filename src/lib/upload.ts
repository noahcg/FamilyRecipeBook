import { createClient } from "./supabase/client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function uploadRecipeImage(
  file: File,
  userId: string
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, or WebP images are supported." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Image must be smaller than 8 MB." };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("recipe-images")
    .upload(path, file, { upsert: false });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, or WebP images are supported." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Image must be smaller than 8 MB." };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
