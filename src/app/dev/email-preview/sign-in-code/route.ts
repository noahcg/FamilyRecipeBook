import { createAuthActionEmail } from "@/lib/email/authActionTemplate";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const origin = new URL(request.url).origin;

  const { html } = createAuthActionEmail({
    actionType: "magiclink",
    actionUrl: `${origin}/auth/confirm?token_hash=sample-home-cooked-token&type=magiclink`,
    code: "123456",
    email: "noah@example.com",
    logoUrl: `${origin}/images/homecooked.png`,
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
