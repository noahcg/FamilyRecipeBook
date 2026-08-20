/**
 * The sign-in code block, shared by the signup and sign-in emails so
 * the two look identical.
 *
 * The literal word "code" sits directly above the digits on purpose — iOS
 * Mail's "copy code" heuristic looks for a short run of digits near it, and
 * that is what makes one-tap autofill work on the sign-in screen.
 */
export function renderCodeBlockHtml(code: string): string {
  const safeCode = code.replace(/[^0-9]/g, "");
  return `
            <tr>
              <td style="padding:24px 36px 0;background:#FBF5E8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4E2C3;border-radius:8px;">
                  <tr>
                    <td align="center" style="padding:22px 20px;">
                      <div style="font-size:13px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:#8D5E34;font-weight:700;">Your sign-in code</div>
                      <div style="margin-top:12px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:38px;line-height:1.1;letter-spacing:0.22em;color:#1F3A2D;font-weight:700;">${safeCode}</div>
                      <div style="margin-top:12px;font-size:13px;line-height:1.5;color:#8B7F70;">Expires in 10 minutes. Only works once.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
}

export function renderCodeBlockText(code: string): string {
  return `Your sign-in code: ${code.replace(/[^0-9]/g, "")}\n(Expires in 10 minutes. Only works once.)`;
}
