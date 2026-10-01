"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Flag } from "lucide-react";
import { Button, Dialog } from "@/components/ui";
import { submitModerationReport } from "@/lib/actions/moderation";

export function ReportContentButton({ targetId, compact = false }: { targetId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("inappropriate_image");
  const [statement, setStatement] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function submit() {
    startTransition(async () => {
      const result = await submitModerationReport({ targetType: "recipe", targetId, reasonCode, statement });
      setMessage(result.success ? "Thanks. Your report was received." : result.error);
      if (result.success) setStatement("");
    });
  }
  return <>
    <button type="button" onClick={() => { setMessage(null); setOpen(true); }} className={compact ? "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-green-pale" : "inline-flex items-center gap-1 text-xs font-bold text-ink-soft hover:text-accent-cinnamon"}>
      <Flag size={compact ? 15 : 14} strokeWidth={1.75} /> Report
    </button>
    <Dialog open={open} onClose={() => setOpen(false)} title="Report this recipe">
      {message ? <div className="space-y-4"><p className="text-sm text-ink-muted">{message}</p><Button onClick={() => setOpen(false)} fullWidth>Done</Button></div> : <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-muted">Reports are private. The recipe owner will not be told who submitted this report.</p>
        <label className="block text-sm font-bold text-ink">Reason
          <span className="relative mt-1.5 block">
            <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className="block w-full appearance-none rounded-sm border border-line bg-card px-3 py-3 pr-12 text-sm">
              <option value="inappropriate_image">Inappropriate image</option><option value="harassment">Harassment</option><option value="privacy_concern">Privacy concern</option><option value="copyright_concern">Copyright concern</option><option value="spam_scam">Spam or scam</option><option value="other">Other</option>
            </select>
            <ChevronDown aria-hidden="true" size={20} strokeWidth={2} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink" />
          </span>
        </label>
        <label className="block text-sm font-bold text-ink">Details <span className="font-normal text-ink-soft">(optional)</span><textarea value={statement} maxLength={1000} onChange={(event) => setStatement(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-sm border border-line bg-card p-3 text-sm" /></label>
        <Button onClick={submit} loading={pending} fullWidth>Submit report</Button>
      </div>}
    </Dialog>
  </>;
}
