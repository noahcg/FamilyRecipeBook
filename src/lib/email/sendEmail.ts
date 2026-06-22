import { Resend } from "resend";

export function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for production email links.");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getDefaultLogoUrl() {
  return `${getAppBaseUrl()}/images/homecooked.png`;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export interface BroadcastMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Per-recipient unsubscribe URL, used for the List-Unsubscribe header. */
  unsubscribeUrl: string;
}

export interface BroadcastSendResult {
  sent: number;
  failed: number;
}

const BROADCAST_CHUNK_SIZE = 100;
const BROADCAST_CHUNK_DELAY_MS = 600;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Send a personalized announcement to many recipients via Resend's batch API.
 *
 * Each recipient gets their own message (their address is never exposed to
 * others) with a List-Unsubscribe header so Gmail/Apple Mail can offer
 * one-click unsubscribe. Sends in chunks of <=100 with a small delay between
 * chunks to stay within Resend rate limits. A chunk that fails to dispatch is
 * counted as failed rather than aborting the whole broadcast.
 */
export async function sendBroadcastBatch(
  messages: BroadcastMessage[]
): Promise<BroadcastSendResult> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const chunks = chunk(messages, BROADCAST_CHUNK_SIZE);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i += 1) {
    const batch = chunks[i].map((message) => ({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: {
        "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }));

    try {
      const { error } = await resend.batch.send(batch);
      if (error) {
        console.error("Broadcast chunk failed:", error.message);
        failed += batch.length;
      } else {
        sent += batch.length;
      }
    } catch (err) {
      console.error("Broadcast chunk threw:", err);
      failed += batch.length;
    }

    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, BROADCAST_CHUNK_DELAY_MS));
    }
  }

  return { sent, failed };
}
