interface AccountDeletionTemplateInput {
  recipeCount: number;
  archiveFilename: string;
  logoUrl?: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createAccountDeletionEmail({
  recipeCount,
  archiveFilename,
  logoUrl,
}: AccountDeletionTemplateInput) {
  const subject = "Your Home Cooked account and recipe archive";
  const recipeLabel = `${recipeCount} ${recipeCount === 1 ? "recipe" : "recipes"}`;
  const safeFilename = escapeHtml(archiveFilename);
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
              <td style="padding:34px 36px 8px;background:#FBF5E8;">${logoMarkup}
                <div style="margin-top:30px;font-size:12px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8D5E34;font-weight:700;">Account deletion</div>
                <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:1.02;color:#2F4F3F;font-weight:700;">A copy of your recipes.</h1>
                <p style="margin:20px 0 0;font-size:17px;line-height:1.65;color:#756F64;">An administrator has initiated permanent deletion of your Home Cooked account. We attached an archive of the cookbook content that will be removed.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 0;background:#FBF5E8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E2C3;border-radius:8px;">
                  <tr><td style="padding:18px 20px;">
                    <div style="font-size:13px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:#8D5E34;font-weight:700;">Attached archive</div>
                    <div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#2F4F3F;font-weight:700;">${recipeLabel}</div>
                    <div style="margin-top:8px;font-size:14px;line-height:1.5;color:#756F64;word-break:break-word;">${safeFilename}</div>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 34px;background:#FBF5E8;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#243128;">The archive contains recipe fields, ingredients, instructions, stories, and cookbook details. It is a compressed JSON file (<strong>.json.gz</strong>); save it somewhere private, then extract it with an archive tool when you need it.</p>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#756F64;">Photos and scanned original files are not included. Recipes in shared cookbooks that remain active are not part of this archive.</p>
                <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#8B7F70;">This email is sent before deletion proceeds. If you did not expect this, please contact the Home Cooked administrator.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "An administrator has initiated permanent deletion of your Home Cooked account.",
    "",
    `Your attached archive (${archiveFilename}) contains ${recipeLabel} and the cookbook content that will be removed: recipe fields, ingredients, instructions, stories, and cookbook details.`,
    "",
    "Save this compressed JSON file (.json.gz) somewhere private, then extract it with an archive tool when you need it. Photos and scanned original files are not included. Recipes in shared cookbooks that remain active are not part of this archive.",
    "",
    "This email is sent before deletion proceeds. If you did not expect this, please contact the Home Cooked administrator.",
  ].join("\n");

  return { subject, html, text };
}
