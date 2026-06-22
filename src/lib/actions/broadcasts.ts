"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createBroadcastEmail,
  formatBroadcastBody,
} from "@/lib/email/broadcastTemplate";
import {
  getAppBaseUrl,
  getDefaultLogoUrl,
  sendBroadcastBatch,
  type BroadcastMessage,
} from "@/lib/email/sendEmail";
import { logAdminAction } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/types";

const sendBroadcastSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required.").max(200),
  body: z.string().trim().min(1, "Message body is required."),
  testOnly: z.boolean().optional(),
});

export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;

interface Recipient {
  email: string;
  fullName: string | null;
  unsubscribeToken: string;
}

/** Gather confirmed, opted-in accounts joined to their profile preferences. */
async function gatherRecipients(
  service: ReturnType<typeof createServiceClient>
): Promise<Recipient[]> {
  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, full_name, marketing_opt_in, unsubscribe_token");
  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const optedIn = new Map(
    (profiles ?? [])
      .filter((p) => p.marketing_opt_in)
      .map((p) => [
        p.id as string,
        {
          fullName: (p.full_name as string | null) ?? null,
          unsubscribeToken: p.unsubscribe_token as string,
        },
      ])
  );

  const recipients: Recipient[] = [];
  const perPage = 1000;
  let page = 1;

  // Paginate auth.users so we only email confirmed addresses.
  for (;;) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }
    for (const user of data.users) {
      if (!user.email || !user.email_confirmed_at) continue;
      const profile = optedIn.get(user.id);
      if (!profile) continue;
      recipients.push({
        email: user.email,
        fullName: profile.fullName,
        unsubscribeToken: profile.unsubscribeToken,
      });
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return recipients;
}

/** Count of accounts a broadcast would currently reach (for the composer UI). */
export async function getBroadcastAudienceCount(): Promise<ActionResult<number>> {
  await requireAdmin();
  try {
    const service = createServiceClient();
    const recipients = await gatherRecipients(service);
    return { success: true, data: recipients.length };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to count audience." };
  }
}

export interface BroadcastSummary {
  id: string;
  subject: string;
  recipientCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
}

/** Recent broadcast history for the admin composer page. */
export async function listRecentBroadcasts(): Promise<ActionResult<BroadcastSummary[]>> {
  await requireAdmin();
  const service = createServiceClient();
  const { data, error } = await service
    .from("broadcasts")
    .select("id, subject, recipient_count, failed_count, status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    return { success: false, error: error.message };
  }
  return {
    success: true,
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      subject: row.subject as string,
      recipientCount: row.recipient_count as number,
      failedCount: row.failed_count as number,
      status: row.status as string,
      createdAt: row.created_at as string,
    })),
  };
}

/**
 * Admin-only: send an announcement to all confirmed, opted-in accounts.
 *
 * testOnly sends a single copy to the acting admin and does not record a
 * broadcasts row. Real sends record a broadcasts row and an admin_actions
 * audit entry (counts only — never recipient PII).
 */
export async function sendBroadcast(input: SendBroadcastInput): Promise<ActionResult> {
  const adminUser = await requireAdmin();

  const parsed = sendBroadcastSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { subject, body, testOnly } = parsed.data;

  const service = createServiceClient();
  const baseUrl = getAppBaseUrl();
  const logoUrl = getDefaultLogoUrl();
  const postalAddress = process.env.EMAIL_POSTAL_ADDRESS ?? null;
  const bodyHtml = formatBroadcastBody(body);

  const buildMessage = (recipient: Recipient): BroadcastMessage => {
    // Friendly page link shown in the footer; one-click endpoint for the header.
    const pageUrl = `${baseUrl}/unsubscribe/${recipient.unsubscribeToken}`;
    const oneClickUrl = `${baseUrl}/api/unsubscribe/${recipient.unsubscribeToken}`;
    const email = createBroadcastEmail({
      subject,
      bodyHtml,
      bodyText: body,
      firstName: recipient.fullName,
      unsubscribeUrl: pageUrl,
      postalAddress,
      logoUrl,
    });
    return {
      to: recipient.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      unsubscribeUrl: oneClickUrl,
    };
  };

  try {
    if (testOnly) {
      if (!adminUser.email) {
        return { success: false, error: "Your account has no email address to send a test to." };
      }
      // Use the admin's own profile token so the test mirrors a real send.
      const { data: profile } = await service
        .from("profiles")
        .select("full_name, unsubscribe_token")
        .eq("id", adminUser.id)
        .single();
      const recipient: Recipient = {
        email: adminUser.email,
        fullName: (profile?.full_name as string | null) ?? null,
        unsubscribeToken: (profile?.unsubscribe_token as string) ?? "test",
      };
      await sendBroadcastBatch([buildMessage(recipient)]);
      return { success: true, data: undefined };
    }

    const recipients = await gatherRecipients(service);
    if (recipients.length === 0) {
      return { success: false, error: "No confirmed, opted-in recipients to send to." };
    }

    const { sent, failed } = await sendBroadcastBatch(recipients.map(buildMessage));
    const status = failed === 0 ? "sent" : "partial_failure";

    const { error: insertError } = await service.from("broadcasts").insert({
      sent_by: adminUser.id,
      subject,
      body_html: bodyHtml,
      recipient_count: sent,
      failed_count: failed,
      status,
    });
    if (insertError) {
      console.error("Failed to record broadcast:", insertError.message);
    }

    await logAdminAction(service, {
      actorId: adminUser.id,
      action: "send_broadcast",
      targetType: "broadcast",
      summary: `Sent broadcast "${subject}" to ${sent} recipients (${failed} failed)`,
      metadata: { sent, failed, status },
    });

    revalidatePath("/app/admin/broadcasts");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send broadcast." };
  }
}
