import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Home Cooked family recipe book preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const runtime = "nodejs";

async function publicImageDataUrl(path: string, contentType: string) {
  const image = await readFile(join(process.cwd(), "public", path));
  return `data:${contentType};base64,${Buffer.from(image).toString("base64")}`;
}

export default async function OpenGraphImage() {
  const heroImage = await publicImageDataUrl("images/landing-cookbook-hero.png", "image/png");
  const logoImage = await publicImageDataUrl("logo.png", "image/png");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#f7f1e6",
          color: "#244f3b",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 18% 14%, rgba(217,230,212,0.78) 0, rgba(217,230,212,0) 245px), radial-gradient(circle at 92% 18%, rgba(233,111,85,0.20) 0, rgba(233,111,85,0) 260px), linear-gradient(135deg, #f7f1e6 0%, #fffaf0 58%, #efe4d0 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 60,
            top: 54,
            right: 60,
            bottom: 54,
            display: "flex",
            border: "1px solid rgba(36,79,59,0.16)",
            borderRadius: 36,
            background: "rgba(255,250,240,0.72)",
            boxShadow: "0 18px 45px rgba(57,45,25,0.10)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 94,
            top: 84,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <img src={logoImage} alt="" width={54} height={54} style={{ borderRadius: 14 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>Home Cooked</div>
            <div
              style={{
                marginTop: 5,
                fontFamily: "Arial, sans-serif",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                color: "#e96f55",
              }}
            >
              Family Recipe Books
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 96,
            top: 192,
            width: 560,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 76,
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            Made with love.
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 70,
              lineHeight: 0.98,
              fontStyle: "italic",
              color: "#e96f55",
            }}
          >
            Shared for generations.
          </div>
          <div
            style={{
              marginTop: 28,
              width: 470,
              fontFamily: "Arial, sans-serif",
              fontSize: 27,
              lineHeight: 1.28,
              color: "#4d4a42",
            }}
          >
            Save recipes, stories, photos, and family notes in one warm private cookbook.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 98,
            top: 96,
            width: 392,
            height: 332,
            display: "flex",
            transform: "rotate(3deg)",
            border: "16px solid #fffaf0",
            borderBottomWidth: 54,
            borderRadius: 18,
            boxShadow: "0 18px 45px rgba(57,45,25,0.14)",
            overflow: "hidden",
            background: "#fffaf0",
          }}
        >
          <img
            src={heroImage}
            alt=""
            width={392}
            height={332}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "70% 44%",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            right: 338,
            top: 73,
            width: 116,
            height: 34,
            display: "flex",
            transform: "rotate(-8deg)",
            borderRadius: 6,
            background: "rgba(217,230,212,0.78)",
            border: "1px solid rgba(36,79,59,0.12)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: 88,
            bottom: 92,
            width: 330,
            display: "flex",
            flexDirection: "column",
            transform: "rotate(-4deg)",
            borderRadius: 18,
            border: "1px solid rgba(36,79,59,0.14)",
            background: "#fffaf0",
            padding: "28px 30px",
            boxShadow: "0 18px 45px rgba(57,45,25,0.10)",
          }}
        >
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#8aa384",
            }}
          >
            Recipe card
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 42,
              lineHeight: 1,
              color: "#e96f55",
              fontStyle: "italic",
            }}
          >
            Apple Pie
          </div>
          <div
            style={{
              marginTop: 17,
              display: "flex",
              flexDirection: "column",
              gap: 7,
              fontFamily: "Arial, sans-serif",
              fontSize: 20,
              color: "#4d4a42",
            }}
          >
            <div>6 cups sliced apples</div>
            <div>1 tsp ground cinnamon</div>
            <div>Serve warm after supper.</div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 94,
            bottom: 74,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "Arial, sans-serif",
            fontSize: 19,
            fontWeight: 800,
            color: "#244f3b",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              background: "#d9e6d4",
              color: "#244f3b",
              fontSize: 24,
            }}
          >
            ♥
          </div>
          homecooked.app
        </div>
      </div>
    ),
    size
  );
}
