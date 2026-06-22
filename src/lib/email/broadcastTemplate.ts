interface BroadcastTemplateInput {
  subject: string;
  /** Pre-formatted, already-escaped HTML body fragment (see formatBroadcastBody). */
  bodyHtml: string;
  /** Raw body text, used to build the plain-text version. */
  bodyText: string;
  firstName?: string | null;
  unsubscribeUrl: string;
  postalAddress?: string | null;
  logoUrl?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Turn admin-authored plain text into a safe HTML body fragment: every
 * character is escaped, blank lines start a new paragraph, and single line
 * breaks become <br>. We never inject raw HTML from the composer.
 */
export function formatBroadcastBody(text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return "";

  return paragraphs
    .map((block) => {
      const inner = escapeHtml(block).replaceAll("\n", "<br />");
      return `<p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:#243128;">${inner}</p>`;
    })
    .join("\n");
}

export function createBroadcastEmail({
  subject,
  bodyHtml,
  bodyText,
  firstName,
  unsubscribeUrl,
  postalAddress,
  logoUrl,
}: BroadcastTemplateInput): EmailTemplate {
  const safeFirstName = escapeHtml(firstName?.trim().split(/\s+/)[0] || "there");
  const safeSubject = escapeHtml(subject);
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const safePostalAddress = postalAddress ? escapeHtml(postalAddress) : "";

  const logoMarkup = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="220" alt="Home Cooked" style="display:block;border:0;width:220px;max-width:60%;height:auto;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1;color:#2F4F3F;font-weight:700;">Home Cooked</div>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background:#F4E7D9;color:#243128;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E7D9;">
      <tr>
        <td align="center" style="padding:36px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FBF5E8;border:1px solid #E8DBC8;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(47,79,63,0.10);">
            <tr>
              <td style="padding:34px 36px 8px;background:#FBF5E8;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">${logoMarkup}</td>
                  </tr>
                </table>

                <div style="margin-top:30px;font-size:12px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8D5E34;font-weight:700;">News from the kitchen</div>
                <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.05;color:#2F4F3F;font-weight:700;">${safeSubject}</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 36px 8px;background:#FBF5E8;">
                <p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:#243128;">Hi ${safeFirstName},</p>
                ${bodyHtml}
              </td>
            </tr>

            <tr>
              <td style="padding:18px 36px 34px;background:#FBF5E8;border-top:1px solid #EADFCB;">
                <p style="margin:0;text-align:center;font-size:12px;line-height:1.6;color:#8B7F70;">
                  You are receiving this because you have a Home Cooked account.
                  <a href="${safeUnsubscribeUrl}" style="color:#B95A40;font-weight:700;text-decoration:underline;">Unsubscribe from announcements</a>.
                </p>
                ${
                  safePostalAddress
                    ? `<p style="margin:10px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#8B7F70;">${safePostalAddress}</p>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    subject,
    "",
    `Hi ${firstName?.trim().split(/\s+/)[0] || "there"},`,
    "",
    bodyText.trim(),
    "",
    "—",
    "You are receiving this because you have a Home Cooked account.",
    `Unsubscribe: ${unsubscribeUrl}`,
    postalAddress ? postalAddress : "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, html, text };
}
