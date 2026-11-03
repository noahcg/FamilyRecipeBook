import { storageMediaReference } from "@/lib/media";

export type ShareCardPhoto = { kind: "storage"; path: string } | { kind: "pexels"; url: string };

/** Allow only our private uploads and Pexels' image CDN, never arbitrary URLs. */
export function shareCardPhoto(value: string): ShareCardPhoto | null {
  const stored = storageMediaReference(value);
  if (stored?.bucket === "recipe-images") return { kind: "storage", path: stored.path };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "images.pexels.com" || url.port || url.username || url.password || url.hash || !url.pathname.startsWith("/photos/")) return null;
    return { kind: "pexels", url: url.toString() };
  } catch {
    return null;
  }
}
