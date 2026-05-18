import { createMemberInviteEmail } from "@/lib/email/memberInviteTemplate";
import { getAppBaseUrl, getDefaultLogoUrl } from "@/lib/email/sendEmail";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const origin = getAppBaseUrl();

  const { html } = createMemberInviteEmail({
    inviteUrl: `${origin}/invite/sample-home-cooked-token`,
    cookbookTitle: "Noah's Kitchen",
    inviterName: "Noah",
    invitedEmail: "family@example.com",
    role: "contributor",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    logoUrl: getDefaultLogoUrl(),
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
