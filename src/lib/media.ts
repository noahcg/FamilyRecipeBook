/** Storage URLs remain stable database identifiers. Private bytes are served
 * through an uncached route which checks access on every request. */
export const PRIVATE_MEDIA_BUCKETS = ["recipe-images", "book-covers", "avatars", "recipe-originals"] as const;
export type PrivateMediaBucket = typeof PRIVATE_MEDIA_BUCKETS[number];

export function storageMediaReference(value: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): { bucket: PrivateMediaBucket; path: string } | null {
  if (!supabaseUrl) return null;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(supabaseUrl).origin || url.search || url.hash) return null;
    const match = /^\/storage\/v1\/object\/public\/(recipe-images|book-covers|avatars)\/(.+)$/.exec(url.pathname);
    if (!match) return null;
    const path = decodeURIComponent(match[2]);
    if (!validMediaPath(path)) return null;
    return { bucket: match[1] as PrivateMediaBucket, path };
  } catch { return null; }
}

export function validMediaPath(path: string): boolean {
  return path.length <= 1024 && path.split("/").every((part) => !!part && part !== "." && part !== ".." && !/[\\\u0000-\u001f\u007f]/.test(part));
}

export function mediaUrl(value: string, shareId?: string): string {
  const reference = storageMediaReference(value);
  if (!reference) return value;
  const path = reference.path.split("/").map(encodeURIComponent).join("/");
  return `/api/media/${reference.bucket}/${path}${shareId ? `?share=${encodeURIComponent(shareId)}` : ""}`;
}
