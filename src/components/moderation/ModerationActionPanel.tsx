"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { moderateCase } from "@/lib/actions/moderation";

const actions = [
  ["hide", "Hide pending review"], ["restore", "Restore"], ["remove_asset", "Remove image"], ["remove_recipe", "Remove recipe"], ["remove_story", "Remove story"], ["restrict_uploads", "Restrict uploads"], ["remove_membership", "Remove from cookbook"], ["suspend", "Suspend for 30 days"], ["ban", "Permanent ban"], ["resolve", "Resolve: no action"],
] as const;

export function ModerationActionPanel({ caseId, targetType }: { caseId: string; targetType: string }) {
  const [action, setAction] = useState<(typeof actions)[number][0]>("hide");
  const [reasonCode, setReasonCode] = useState("other");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const available = actions.filter(([key]) => key === "resolve" || (key === "remove_story" && targetType === "story") || (key === "remove_membership" && targetType === "membership") || (targetType === "recipe" && ["hide", "restore", "remove_asset", "remove_recipe"].includes(key)) || (!["hide", "restore", "remove_asset", "remove_recipe", "remove_story", "remove_membership"].includes(key)));
  function submit() { startTransition(async () => { const result = await moderateCase({ caseId, action, reasonCode, internalNote: note, confirmed }); setMessage(result.success ? "Action recorded." : result.error); if (result.success) setConfirmed(false); }); }
  return <section className="rounded-md border border-line-soft bg-card p-5"><h2 className="text-lg font-black text-ink">Case action</h2><p className="mt-1 text-xs text-ink-muted">Actions are case-scoped and never delete an account or shared cookbook.</p><div className="mt-4 grid gap-3"><label className="text-sm font-bold">Action<select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="mt-1 block w-full rounded-sm border border-line bg-white p-2">{available.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm font-bold">Reason<select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="mt-1 block w-full rounded-sm border border-line bg-white p-2"><option value="inappropriate_image">Inappropriate image</option><option value="harassment">Harassment</option><option value="privacy_concern">Privacy concern</option><option value="copyright_concern">Copyright concern</option><option value="spam_scam">Spam/scam</option><option value="other">Other</option></select></label><label className="text-sm font-bold">Internal note<textarea value={note} onChange={(e) => setNote(e.target.value)} minLength={3} maxLength={2000} className="mt-1 block min-h-24 w-full rounded-sm border border-line bg-white p-2" /></label><label className="flex gap-2 text-sm text-ink-muted"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I confirm this case-specific action.</label>{message && <p className="text-sm text-ink-muted">{message}</p>}<Button onClick={submit} loading={pending} disabled={!confirmed || note.trim().length < 3}>Record action</Button></div></section>;
}
