import { createLifetimePlusEmail } from "@/lib/email/lifetimePlusTemplate";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const { html } = createLifetimePlusEmail({
    accountUrl: `${origin}/app/settings`,
    fullName: "Noah",
    logoUrl: `${origin}/images/homecooked.png`,
  });

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
