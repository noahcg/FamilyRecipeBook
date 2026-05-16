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
  const logoImage = await publicImageDataUrl("images/homecooked.svg", "image/svg+xml");

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
        }}
      >
        <img
          src={heroImage}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "70% 44%",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(247,241,230,0.95) 0%, rgba(247,241,230,0.72) 38%, rgba(247,241,230,0.16) 100%)",
          }}
        />
        <img
          src={logoImage}
          alt=""
          width={470}
          height={230}
          style={{
            position: "absolute",
            left: 56,
            top: 190,
            objectFit: "contain",
          }}
        />
      </div>
    ),
    size
  );
}
