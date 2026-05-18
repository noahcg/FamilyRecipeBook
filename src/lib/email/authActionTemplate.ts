export type AuthActionType =
  | "recovery"
  | "magiclink"
  | "login"
  | "invite"
  | "email_change"
  | "email_change_current"
  | "email_change_new"
  | "reauthentication";

interface AuthActionTemplateInput {
  actionType: AuthActionType;
  actionUrl: string;
  email?: string;
  newEmail?: string;
  logoUrl?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface Copy {
  subject: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  closing: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function copyFor(actionType: AuthActionType, newEmail?: string): Copy {
  switch (actionType) {
    case "recovery":
      return {
        subject: "Reset your Home Cooked password",
        eyebrow: "Password reset",
        title: "Let's get you back in.",
        body: "Use the button below to choose a new password for your Home Cooked account. The link expires soon, so finish up while you have a minute.",
        cta: "Reset password",
        closing: "If you did not request this, you can safely ignore this email.",
      };
    case "magiclink":
    case "login":
      return {
        subject: "Your Home Cooked sign-in link",
        eyebrow: "Sign in",
        title: "Welcome back to the kitchen.",
        body: "Open the link below to finish signing in to Home Cooked. The link only works once and expires soon.",
        cta: "Sign in",
        closing: "If you did not request this link, you can ignore this email.",
      };
    case "invite":
      return {
        subject: "You are invited to Home Cooked",
        eyebrow: "Invitation",
        title: "Come cook with us.",
        body: "Accept the invitation below to set up your Home Cooked account and start saving the recipes worth keeping.",
        cta: "Accept invitation",
        closing: "If this invitation looks unexpected, you can ignore this email.",
      };
    case "email_change":
    case "email_change_new":
      return {
        subject: "Confirm your new Home Cooked email",
        eyebrow: "Email change",
        title: "Confirm your new address.",
        body: `Confirm ${newEmail ? `${newEmail} ` : ""}as the new email on your Home Cooked account. The link expires soon for your security.`,
        cta: "Confirm new email",
        closing: "If you did not request this change, contact us right away.",
      };
    case "email_change_current":
      return {
        subject: "Confirm an email change on Home Cooked",
        eyebrow: "Email change",
        title: "Approve this change.",
        body: `Someone asked to switch the email on your Home Cooked account${newEmail ? ` to ${newEmail}` : ""}. Approve the change below if it was you.`,
        cta: "Approve change",
        closing: "If you did not request this change, contact us right away.",
      };
    case "reauthentication":
      return {
        subject: "Confirm it is you on Home Cooked",
        eyebrow: "Verify identity",
        title: "Quick check before we continue.",
        body: "Confirm it is you before completing this sensitive change on your Home Cooked account.",
        cta: "Confirm it's me",
        closing: "If you did not request this, change your password.",
      };
  }
}

export function createAuthActionEmail({
  actionType,
  actionUrl,
  email,
  newEmail,
  logoUrl,
}: AuthActionTemplateInput): EmailTemplate {
  const copy = copyFor(actionType, newEmail);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeEmail = email ? escapeHtml(email) : "";
  const safeNewEmail = newEmail ? escapeHtml(newEmail) : "";

  const logoMarkup = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="220" alt="Home Cooked" style="display:block;border:0;width:220px;max-width:60%;height:auto;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1;color:#2F4F3F;font-weight:700;">Home Cooked</div>`;

  const detailsRow =
    actionType === "email_change" ||
    actionType === "email_change_new" ||
    actionType === "email_change_current"
      ? `
            <tr>
              <td style="padding:24px 36px 0;background:#FBF5E8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E2C3;border-radius:16px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:13px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:#8D5E34;font-weight:700;">Change</div>
                      ${safeEmail ? `<div style="margin-top:6px;font-size:15px;line-height:1.5;color:#243128;">From <strong>${safeEmail}</strong></div>` : ""}
                      ${safeNewEmail ? `<div style="margin-top:4px;font-size:15px;line-height:1.5;color:#243128;">To <strong>${safeNewEmail}</strong></div>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
      : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F4E7D9;color:#243128;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E7D9;">
      <tr>
        <td align="center" style="padding:36px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FBF5E8;border:1px solid #E8DBC8;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(47,79,63,0.10);">
            <tr>
              <td style="padding:34px 36px 8px;background:#FBF5E8;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">${logoMarkup}</td>
                  </tr>
                </table>

                <div style="margin-top:30px;font-size:12px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8D5E34;font-weight:700;">${escapeHtml(copy.eyebrow)}</div>
                <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:1.02;color:#2F4F3F;font-weight:700;">${escapeHtml(copy.title)}</h1>
                <p style="margin:20px 0 0;max-width:520px;font-size:17px;line-height:1.65;color:#756F64;">
                  ${escapeHtml(copy.body)}
                </p>
              </td>
            </tr>
${detailsRow}
            <tr>
              <td align="center" style="padding:30px 36px 8px;background:#FBF5E8;">
                <a href="${safeActionUrl}" style="display:inline-block;background:#1F3A2D;color:#FFF9EE;text-decoration:none;border-radius:999px;padding:15px 24px;font-size:16px;line-height:1;font-weight:800;">${escapeHtml(copy.cta)}</a>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 36px 34px;background:#FBF5E8;">
                <p style="margin:0;text-align:center;font-size:13px;line-height:1.6;color:#8B7F70;">${escapeHtml(copy.closing)}</p>
                <p style="margin:18px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#8B7F70;">
                  If the button does not work, copy and paste this link into your browser:<br />
                  <a href="${safeActionUrl}" style="color:#B95A40;word-break:break-all;">${safeActionUrl}</a>
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
    copy.title,
    "",
    copy.body,
    "",
    `${copy.cta}: ${actionUrl}`,
    "",
    copy.closing,
  ].join("\n");

  return { subject: copy.subject, html, text };
}
