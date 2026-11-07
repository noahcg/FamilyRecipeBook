import sharp from "sharp";

// ImageResponse can identify WebP dimensions, but its PNG renderer does not
// draw WebP pixels. Convert existing uploads as well as newly selected photos.
export async function shareCardImageDataUrl(image: Blob): Promise<string | null> {
  const type = image.type.split(";")[0].toLowerCase();
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(type) || image.size === 0 || image.size > 8 * 1024 * 1024) return null;
  try {
    let bytes = Buffer.from(await image.arrayBuffer());
    if (type === "image/webp") {
      bytes = await sharp(bytes, { limitInputPixels: 40_000_000 }).png().toBuffer();
    }
    return `data:${type === "image/webp" ? "image/png" : type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
