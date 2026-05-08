import { createMemberInviteEmail } from "@/lib/email/memberInviteTemplate";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  const { html } = createMemberInviteEmail({
    inviteUrl: `${origin}/invite/sample-home-cooked-token`,
    cookbookTitle: "Noah's Kitchen",
    inviterName: "Noah",
    invitedEmail: "family@example.com",
    role: "contributor",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    logoUrl: `${origin}/logo.png`,
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
