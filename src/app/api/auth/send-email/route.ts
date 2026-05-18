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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function fail(stage: string, error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[send-email-hook] ${stage} failed:`, message);
  return NextResponse.json(
    { error: `${stage} failed`, detail: message },
    { status }
  );
}

export async function POST(request: NextRequest) {
  const rawSecret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!rawSecret) {
    return fail("config", "SEND_EMAIL_HOOK_SECRET is not set", 500);
  }
  if (!process.env.RESEND_API_KEY) {
    return fail("config", "RESEND_API_KEY is not set", 500);
  }
  if (!process.env.EMAIL_FROM) {
    return fail("config", "EMAIL_FROM is not set", 500);
  }

  // Supabase issues secrets prefixed with `v1,whsec_<base64>`.
  // standardwebhooks already handles the `whsec_` prefix; strip the `v1,` part.
  const secret = rawSecret.trim().replace(/^v1,/, "");

  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  if (!headers["webhook-id"] || !headers["webhook-signature"]) {
    return fail("verify", "Missing webhook headers", 400);
  }

  const rawBody = await request.text();

  let payload: SupabaseSendEmailPayload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, headers) as SupabaseSendEmailPayload;
  } catch (error) {
    return fail("verify", error, 401);
  }

  const { user, email_data } = payload;
  if (!user?.email) return fail("payload", "Missing user.email", 400);
  if (!email_data?.email_action_type) {
    return fail("payload", "Missing email_action_type", 400);
  }

  const siteUrl = email_data.site_url || getAppBaseUrl();
  let logoUrl: string | undefined;
  try {
    logoUrl = getDefaultLogoUrl();
  } catch {
    logoUrl = undefined; // template falls back to text wordmark
  }
  const fullName = user.user_metadata?.full_name ?? null;
  const actionType = email_data.email_action_type;

  console.log("[send-email-hook] handling", {
    actionType,
    to: user.email,
  });

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
    return fail(`send(${actionType})`, error, 500);
  }
}
