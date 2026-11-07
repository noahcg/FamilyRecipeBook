import { ImageResponse } from "next/og";
import { getInvitationShareCard } from "@/lib/shareCard";
import { createServiceClient } from "@/lib/supabase/service";
import { shareCardImageDataUrl } from "@/lib/shareCardImage";
import { SHARE_CARD_OVERLAY } from "@/lib/shareCardStyle";

export const runtime = "nodejs";

async function fetchPexelsPhoto(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok || !response.body) return null;
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8 * 1024 * 1024) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return new Blob(chunks as BlobPart[], { type });
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await getInvitationShareCard(token);
  const fallback = () => Response.redirect(new URL("/opengraph-image", request.url), 307);
  if (!card) return fallback();
  const data = card.photo.kind === "storage"
    ? (await createServiceClient().storage.from("recipe-images").download(card.photo.path)).data
    : await fetchPexelsPhoto(card.photo.url);
  if (!data) return fallback();
  const image = await shareCardImageDataUrl(data);
  if (!image) return fallback();
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: "#243128" }}>
      {/* Images are fetched only after checking the invitation and selected photo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: SHARE_CARD_OVERLAY }} />
      <div style={{ display: "flex", position: "absolute", top: 0, bottom: 0, left: 0, width: "64%", flexDirection: "column", justifyContent: "center", padding: "64px", color: "white" }}>
        <div style={{ fontSize: 28, letterSpacing: 3, marginBottom: 22 }}>HOME COOKED</div>
        <div style={{ fontSize: card.title.length > 65 ? 42 : card.title.length > 40 ? 50 : 64, fontWeight: 700, lineHeight: 1.1, overflowWrap: "break-word" }}>{card.title}</div>
        <div style={{ fontSize: 26, marginTop: 26 }}>You’re invited to the table.</div>
      </div>
      {card.credit && <div style={{ position: "absolute", display: "flex", bottom: 18, right: 24, padding: "5px 9px", background: "rgba(25,40,30,0.75)", color: "white", fontSize: 16 }}>{card.credit.slice(0, 120)}</div>}
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } }
  );
}
