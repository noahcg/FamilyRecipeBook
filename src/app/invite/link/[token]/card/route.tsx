import { ImageResponse } from "next/og";
import { getInvitationShareCard } from "@/lib/shareCard";
import { createServiceClient } from "@/lib/supabase/service";

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
  if (!data || !["image/jpeg", "image/png", "image/webp"].includes(data.type)) return fallback();
  const image = `data:${data.type};base64,${Buffer.from(await data.arrayBuffer()).toString("base64")}`;
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: "#243128" }}>
      {/* Images are fetched only after checking the invitation and selected photo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(25,40,30,0.92), rgba(25,40,30,0.15))" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px", color: "white", maxWidth: "800px" }}>
        <div style={{ fontSize: 28, letterSpacing: 3, marginBottom: 22 }}>HOME COOKED</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{card.title}</div>
        <div style={{ fontSize: 26, marginTop: 26 }}>You’re invited to the table.</div>
      </div>
      {card.credit && <div style={{ position: "absolute", display: "flex", bottom: 18, right: 24, padding: "5px 9px", background: "rgba(25,40,30,0.75)", color: "white", fontSize: 16 }}>{card.credit.slice(0, 120)}</div>}
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } }
  );
}
