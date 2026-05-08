import { createSignupWelcomeEmail } from "@/lib/email/signupWelcomeTemplate";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  const { html } = createSignupWelcomeEmail({
    confirmationUrl: `${origin}/auth/confirm?token_hash=sample-home-cooked-token&type=signup`,
    fullName: "Noah",
    email: "noah@example.com",
    logoUrl: `${origin}/logo.png`,
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
