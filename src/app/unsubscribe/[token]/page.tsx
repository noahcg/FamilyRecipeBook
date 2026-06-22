import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { EntryShell } from "@/components/layout/EntryShell";
import { unsubscribeByToken } from "@/lib/actions/marketing";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;

  // Idempotent and quiet: we always show the same confirmation regardless of
  // whether the token matched, so we never leak whether a token exists.
  await unsubscribeByToken(token);

  return (
    <EntryShell
      eyebrow="Email preferences"
      title="You're unsubscribed"
      description="You won't receive product announcement emails from Home Cooked anymore."
      maxWidth="md"
      sideImageSrc="/images/entry/add-family.jpg"
      sideImageAlt="Family-style dinner table"
      sideTitle="We'll still keep your kitchen running."
      sideDescription="Account and cookbook emails (invitations, password resets) will still reach you — only announcements are turned off."
      sideNote="You can turn announcements back on anytime in Settings."
    >
      <div className="text-center">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
          style={{ background: "var(--color-sage-soft)" }}
        >
          <MailCheck size={26} className="text-green-deep" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-ink-muted">
          Changed your mind? You can re-subscribe to product announcements from
          your account settings.
        </p>
        <Link href="/app/settings" className="inline-flex">
          <Button variant="primary">Go to settings</Button>
        </Link>
      </div>
    </EntryShell>
  );
}
