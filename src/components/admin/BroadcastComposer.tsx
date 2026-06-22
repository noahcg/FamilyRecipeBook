"use client";

import { useMemo, useState, useTransition } from "react";
import { Megaphone, Send, TestTube2 } from "lucide-react";
import { Button, Dialog, Input, Textarea } from "@/components/ui";
import { formatBroadcastBody } from "@/lib/email/broadcastTemplate";
import { sendBroadcast } from "@/lib/actions/broadcasts";

type Feedback = { tone: "success" | "error"; text: string } | null;

export function BroadcastComposer({ audienceCount }: { audienceCount: number }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  const canSend = subject.trim().length > 0 && body.trim().length > 0;
  const previewHtml = useMemo(() => formatBroadcastBody(body), [body]);

  function runSend(testOnly: boolean) {
    setConfirmOpen(false);
    startTransition(async () => {
      setFeedback(null);
      const result = await sendBroadcast({ subject, body, testOnly });
      if (!result.success) {
        setFeedback({ tone: "error", text: result.error });
        return;
      }
      if (testOnly) {
        setFeedback({ tone: "success", text: "Test sent to your email address." });
      } else {
        setFeedback({ tone: "success", text: "Broadcast sent." });
        setSubject("");
        setBody("");
      }
    });
  }

  return (
    <div className="recipe-card overflow-hidden">
      <div className="border-b border-line-soft px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-sm bg-green-pale text-green-deep">
            <Megaphone size={16} />
          </span>
          <h2 className="text-base font-black text-ink">Compose announcement</h2>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Sends to {audienceCount.toLocaleString()} confirmed, opted-in account
          {audienceCount === 1 ? "" : "s"}. Every email includes an unsubscribe link.
        </p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Input
            label="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's new in Home Cooked"
            maxLength={200}
          />
          <Textarea
            label="Message"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement. Leave a blank line between paragraphs."
            rows={12}
            hint="Plain text. Blank lines become paragraphs; links are not auto-formatted yet."
          />

          {feedback ? (
            <p
              role={feedback.tone === "error" ? "alert" : undefined}
              className={
                feedback.tone === "error"
                  ? "text-sm font-bold text-danger"
                  : "text-sm font-bold text-green-deep"
              }
            >
              {feedback.text}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => runSend(true)}
              disabled={!canSend || isPending}
            >
              <TestTube2 size={16} />
              Send test to me
            </Button>
            <Button
              variant="primary"
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend || isPending || audienceCount === 0}
            >
              <Send size={16} />
              Send broadcast
            </Button>
            {isPending ? (
              <span className="text-sm font-bold text-ink-muted">Working…</span>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-line-soft bg-white-soft/70 p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">
            Preview
          </p>
          <h3 className="mt-2 text-xl font-black leading-tight text-ink">
            {subject.trim() || "Subject preview"}
          </h3>
          <div className="mt-3 text-sm leading-relaxed text-ink">
            <p className="mb-3">Hi there,</p>
            {body.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <p className="text-ink-muted">Your message will appear here.</p>
            )}
          </div>
          <p className="mt-4 border-t border-line-soft pt-3 text-xs text-ink-soft">
            You are receiving this because you have a Home Cooked account.
            Unsubscribe from announcements.
          </p>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send this broadcast?"
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          This will email{" "}
          <strong className="text-ink">
            {audienceCount.toLocaleString()} account
            {audienceCount === 1 ? "" : "s"}
          </strong>{" "}
          right now. This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => runSend(false)} disabled={isPending}>
            {isPending ? "Sending…" : "Send now"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
