interface LifetimePlusTemplateInput {
  accountUrl: string;
  fullName?: string | null;
  logoUrl?: string;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function createLifetimePlusEmail({ accountUrl, fullName, logoUrl }: LifetimePlusTemplateInput) {
  const firstName = fullName?.trim().split(/\s+/)[0] || "there";
  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(accountUrl);
  const subject = "You have lifetime Home Cooked Plus access";
  const logoMarkup = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="220" alt="Home Cooked" style="display:block;border:0;width:220px;max-width:60%;height:auto;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1;color:#2F4F3F;font-weight:700;">Home Cooked</div>`;

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${subject}</title></head>
  <body style="margin:0;padding:0;background:#F4E7D9;color:#243128;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E7D9;">
      <tr><td align="center" style="padding:36px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FBF5E8;border:1px solid #E8DBC8;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:34px 36px 8px;">${logoMarkup}
            <div style="margin-top:30px;font-size:12px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8D5E34;font-weight:700;">A gift for your kitchen</div>
            <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.05;color:#2F4F3F;">Plus, for good.</h1>
            <p style="margin:20px 0 0;font-size:17px;line-height:1.65;color:#756F64;">Hi ${safeName}, you now have lifetime access to Home Cooked Plus. It has been added to your account, with no subscription or payment needed.</p>
          </td></tr>
          <tr><td style="padding:24px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E2C3;border-radius:8px;"><tr><td style="padding:18px 20px;">
              <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8D5E34;font-weight:700;">Your access</div>
              <div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#2F4F3F;font-weight:700;">Lifetime Home Cooked Plus</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#756F64;">Keep more cookbooks and recipes, import and export recipes, plan meals, and enjoy the other Plus features.</div>
            </td></tr></table>
          </td></tr>
          <tr><td align="center" style="padding:30px 36px 8px;"><a href="${safeUrl}" style="display:inline-block;background:#1F3A2D;color:#FFF9EE;text-decoration:none;border-radius:999px;padding:15px 24px;font-size:16px;font-weight:800;">View your account</a></td></tr>
          <tr><td style="padding:18px 36px 34px;text-align:center;font-size:12px;line-height:1.6;color:#8B7F70;">Your access is ready whenever you sign in.<br />If the button does not work, open <a href="${safeUrl}" style="color:#B95A40;word-break:break-all;">${safeUrl}</a>.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Hi ${firstName},\n\nYou now have lifetime access to Home Cooked Plus. It has been added to your account, with no subscription or payment needed.\n\nKeep more cookbooks and recipes, import and export recipes, plan meals, and enjoy the other Plus features.\n\nView your account: ${accountUrl}`;
  return { subject, html, text };
}
