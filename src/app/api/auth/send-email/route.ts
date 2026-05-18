import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { createSignupWelcomeEmail } from "@/lib/email/signupWelcomeTemplate";
import {
  createAuthActionEmail,
  type AuthActionType,
} from "@/lib/email/authActionTemplate";
import {
  getAppBaseUrl,
  getDefaultLogoUrl,
  sendEmail,
} from "@/lib/email/sendEmail";

interface SupabaseSendEmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: { full_name?: string };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function buildConfirmationUrl(
  siteUrl: string,
  tokenHash: string,
  type: string,
  redirectTo: string
) {
  const params = new URLSearchParams({ token_hash: tokenHash, type });
  if (redirectTo) params.set("redirect_to", redirectTo);
  return `${siteUrl.replace(/\/$/, "")}/auth/confirm?${params.toString()}`;
}

export async function POST(request: NextRequest) {
  const rawSecret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!rawSecret) {
    return NextResponse.json(
      { error: "Send email hook is not configured." },
      { status: 500 }
    );
  }

  // Supabase issues secrets prefixed with `v1,whsec_<base64>`.
  // standardwebhooks handles the `whsec_` prefix; strip the `v1,` part.
  const secret = rawSecret.replace(/^v1,/, "");

  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  const rawBody = await request.text();

  let payload: SupabaseSendEmailPayload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, headers) as SupabaseSendEmailPayload;
  } catch (error) {
    console.error("[send-email-hook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { user, email_data } = payload;
  const siteUrl = email_data.site_url || getAppBaseUrl();
  const logoUrl = getDefaultLogoUrl();
  const fullName = user.user_metadata?.full_name ?? null;
  const actionType = email_data.email_action_type;

  try {
    if (actionType === "signup") {
      const confirmationUrl = buildConfirmationUrl(
        siteUrl,
        email_data.token_hash,
        "signup",
        email_data.redirect_to
      );
      const { subject, html, text } = createSignupWelcomeEmail({
        confirmationUrl,
        fullName,
        email: user.email,
        logoUrl,
      });
      await sendEmail({ to: user.email, subject, html, text });
      return NextResponse.json({ ok: true });
    }

    const useNewToken = actionType === "email_change_new";
    const tokenHash = useNewToken
      ? email_data.token_hash_new ?? email_data.token_hash
      : email_data.token_hash;
    const actionUrl = buildConfirmationUrl(
      siteUrl,
      tokenHash,
      actionType,
      email_data.redirect_to
    );

    const { subject, html, text } = createAuthActionEmail({
      actionType: actionType as AuthActionType,
      actionUrl,
      email: user.email,
      logoUrl,
    });
    await sendEmail({ to: user.email, subject, html, text });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[send-email-hook] send failed", {
      actionType,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
