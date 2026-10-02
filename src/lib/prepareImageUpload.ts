const MAX_SIZE = 8 * 1024 * 1024;
const INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function matchesImageHeader(bytes: Uint8Array, type: string) {
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (type === "image/webp") return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  if (text(4, 8) !== "ftyp") return false;
  const brands = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);
  const major = text(8, 12);
  if (major === "avif" || major === "avis") return false;
  return brands.has(major);
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.82));
}

/** Decode and re-encode user images so storage never receives original metadata or file extensions. */
export async function prepareImageUpload(file: File, maxDimension: number): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  if (!INPUT_TYPES.has(file.type)) throw new Error("Choose a JPEG, PNG, WebP, or HEIC image.");
  if (file.size > MAX_SIZE) throw new Error("Image must be 8 MB or smaller.");
  if (file.size === 0 || !matchesImageHeader(new Uint8Array(await file.slice(0, 32).arrayBuffer()), file.type)) {
    throw new Error("This file is not a valid image. Choose the original JPEG, PNG, WebP, or HEIC file.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    try { await image.decode(); }
    catch {
      throw new Error(file.type === "image/heic" || file.type === "image/heif"
        ? "This browser cannot open this HEIC photo. Export it as JPEG or choose a JPEG, PNG, or WebP image."
        : "This image could not be opened. Choose another JPEG, PNG, or WebP image.");
    }
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("This image has no usable dimensions.");
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image. Please try again.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await encode(canvas, "image/webp");
    if (blob?.type !== "image/webp") {
      // Unsupported WebP encoders return PNG. JPEG is the portable fallback.
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      blob = await encode(canvas, "image/jpeg");
    }
    if (!blob || !["image/webp", "image/jpeg"].includes(blob.type) || blob.size === 0) {
      throw new Error("Your browser could not prepare this image. Please try another photo.");
    }
    if (blob.size > MAX_SIZE) throw new Error("The prepared image is too large. Choose a smaller photo.");
    return { blob, extension: blob.type === "image/webp" ? "webp" : "jpg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
