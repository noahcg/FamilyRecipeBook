interface SignupWelcomeTemplateInput {
  confirmationUrl: string;
  fullName?: string | null;
  email?: string;
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

export function createSignupWelcomeEmail({
  confirmationUrl,
  fullName,
  email,
  logoUrl,
}: SignupWelcomeTemplateInput): EmailTemplate {
  const firstName = fullName?.trim().split(/\s+/)[0] || "there";
  const safeFirstName = escapeHtml(firstName);
  const safeEmail = email ? escapeHtml(email) : "";
  const safeConfirmationUrl = escapeHtml(confirmationUrl);
  const subject = "Welcome to Home Cooked";

  const logoMarkup = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="220" alt="Home Cooked" style="display:block;border:0;width:220px;max-width:60%;height:auto;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1;color:#2F4F3F;font-weight:700;">Home Cooked</div>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
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

                <div style="margin-top:30px;font-size:12px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8D5E34;font-weight:700;">Welcome to your kitchen</div>
                <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:0.98;color:#2F4F3F;font-weight:700;">Let&apos;s get cooking.</h1>
                <p style="margin:20px 0 0;max-width:520px;font-size:17px;line-height:1.65;color:#756F64;">
                  Hi ${safeFirstName}, confirm your email to start building a cookbook for the recipes, weeknight wins, and kitchen notes worth keeping.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 36px 0;background:#FBF5E8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E2C3;border-radius:8px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:13px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:#8D5E34;font-weight:700;">First steps</div>
                      <div style="margin-top:10px;font-size:15px;line-height:1.65;color:#243128;">
                        <strong style="color:#2F4F3F;">1.</strong> Confirm your email<br />
                        <strong style="color:#2F4F3F;">2.</strong> Name your first cookbook<br />
                        <strong style="color:#2F4F3F;">3.</strong> Invite the family or keep it private
                      </div>
                      ${safeEmail ? `<div style="margin-top:12px;font-size:14px;line-height:1.5;color:#756F64;">Account: ${safeEmail}</div>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:30px 36px 8px;background:#FBF5E8;">
                <a href="${safeConfirmationUrl}" style="display:inline-block;background:#1F3A2D;color:#FFF9EE;text-decoration:none;border-radius:999px;padding:15px 24px;font-size:16px;line-height:1;font-weight:800;">Confirm email</a>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 36px 34px;background:#FBF5E8;">
                <p style="margin:0;text-align:center;font-size:13px;line-height:1.6;color:#8B7F70;">This confirmation link helps keep your cookbook private.</p>
                <p style="margin:18px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#8B7F70;">
                  If the button does not work, copy and paste this link into your browser:<br />
                  <a href="${safeConfirmationUrl}" style="color:#B95A40;word-break:break-all;">${safeConfirmationUrl}</a>
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
    `Welcome to Home Cooked, ${firstName}.`,
    "",
    "Confirm your email to start building a cookbook for the recipes, weeknight wins, and kitchen notes worth keeping.",
    "",
    `Confirm email: ${confirmationUrl}`,
  ].join("\n");

  return { subject, html, text };
}
