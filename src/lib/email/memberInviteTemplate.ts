import type { BookRole } from "@/lib/types";

type InviteRole = Exclude<BookRole, "keeper">;

interface MemberInviteTemplateInput {
  inviteUrl: string;
  cookbookTitle: string;
  inviterName?: string | null;
  invitedEmail?: string;
  role: InviteRole;
  expiresAt?: string | Date;
  logoUrl?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const ROLE_LABELS: Record<InviteRole, string> = {
  contributor: "contributor",
  family: "family member",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatExpiration(value?: string | Date) {
  if (!value) return "This invitation expires in 7 days.";

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "This invitation expires in 7 days.";

  return `This invitation expires on ${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}.`;
}

export function createMemberInviteEmail({
  inviteUrl,
  cookbookTitle,
  inviterName,
  invitedEmail,
  role,
  expiresAt,
  logoUrl,
}: MemberInviteTemplateInput): EmailTemplate {
  const plainInviterName = inviterName?.trim() || "Someone";
  const safeInviteUrl = escapeHtml(inviteUrl);
  const safeCookbookTitle = escapeHtml(cookbookTitle);
  const safeInviterName = escapeHtml(plainInviterName);
  const safeInvitedEmail = invitedEmail ? escapeHtml(invitedEmail) : "";
  const roleLabel = ROLE_LABELS[role];
  const safeRoleLabel = escapeHtml(roleLabel);
  const expirationText = formatExpiration(expiresAt);
  const safeExpirationText = escapeHtml(expirationText);

  const subject = `${plainInviterName} invited you to ${cookbookTitle} on Home Cooked`;

  const logoMarkup = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="64" height="64" alt="" style="display:block;border:0;border-radius:16px;" />`
    : `<div style="width:64px;height:64px;border-radius:16px;background:#DDE5D7;color:#2F4F3F;font-family:Georgia,serif;font-size:30px;font-weight:700;line-height:64px;text-align:center;">HC</div>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F7F3E9;color:#243128;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3E9;">
      <tr>
        <td align="center" style="padding:36px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FFFCF6;border:1px solid #E8DBC8;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(47,79,63,0.10);">
            <tr>
              <td style="padding:34px 36px 24px;background:#FFFCF6;background-image:linear-gradient(135deg,#FFFCF6 0%,#FBF7ED 54%,#EFE6D5 100%);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;width:76px;">${logoMarkup}</td>
                    <td style="vertical-align:middle;padding-left:14px;">
                      <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1;color:#2F4F3F;font-weight:700;">Home Cooked</div>
                      <div style="margin-top:6px;font-size:13px;line-height:1.3;color:#756F64;">Recipe Platform</div>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:34px;font-size:12px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8D5E34;font-weight:700;">You have been invited</div>
                <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:0.98;color:#2F4F3F;font-weight:700;">Pull up a chair.</h1>
                <p style="margin:20px 0 0;max-width:520px;font-size:17px;line-height:1.65;color:#756F64;">
                  ${safeInviterName} invited you to join <strong style="color:#243128;">${safeCookbookTitle}</strong> as a ${safeRoleLabel}. Open the cookbook to save recipes, share kitchen notes, and keep the good meals easy to find.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E8D5;border-radius:16px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:13px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:#8D5E34;font-weight:700;">Cookbook</div>
                      <div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#2F4F3F;font-weight:700;">${safeCookbookTitle}</div>
                      ${safeInvitedEmail ? `<div style="margin-top:8px;font-size:14px;line-height:1.5;color:#756F64;">Sent to ${safeInvitedEmail}</div>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:30px 36px 8px;">
                <a href="${safeInviteUrl}" style="display:inline-block;background:#1F3A2D;color:#FFF9EE;text-decoration:none;border-radius:999px;padding:15px 24px;font-size:16px;line-height:1;font-weight:800;">Accept invitation</a>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 36px 34px;">
                <p style="margin:0;text-align:center;font-size:13px;line-height:1.6;color:#8B7F70;">${safeExpirationText}</p>
                <p style="margin:18px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#8B7F70;">
                  If the button does not work, copy and paste this link into your browser:<br />
                  <a href="${safeInviteUrl}" style="color:#B95A40;word-break:break-all;">${safeInviteUrl}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${plainInviterName} invited you to ${cookbookTitle} on Home Cooked.`,
    "",
    `Join as a ${roleLabel} to save recipes, share kitchen notes, and keep the good meals easy to find.`,
    "",
    `Accept invitation: ${inviteUrl}`,
    "",
    expirationText,
  ].join("\n");

  return { subject, html, text };
}
