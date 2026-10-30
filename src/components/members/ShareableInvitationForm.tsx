"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, Share2 } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { createShareableInvitation } from "@/lib/actions/shareableInvitations";

type Allowance = { isFree: boolean; canShare: boolean; remaining: number | null } | null;

export function ShareableInvitationForm({ bookId, sharingAllowance }: { bookId: string; sharingAllowance: Allowance }) {
  const router = useRouter();
  const [role, setRole] = useState<"family" | "contributor">("family");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function createLink() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await createShareableInvitation(bookId, role);
      if (!result.success) setError(result.error);
      else {
        setUrl(result.data.url);
        router.refresh();
      }
    } catch {
      setError("Could not create a link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied. Paste it into a message to share it.");
      setError("");
    } catch {
      setError("Could not copy the link. Select it above and copy it manually.");
    }
  }

  async function shareLink() {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: "Join my cookbook", url });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Could not share the link. Try copying it instead.");
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Share a link</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">Share one link with your group. Anyone with the link can join, so share it only with people you trust. It expires after 7 days.</p>
        {sharingAllowance?.isFree && <p className="mt-2 text-sm leading-relaxed text-ink-muted">People fill the cookbook’s available Family spots as they join. The link itself does not reserve a spot.</p>}
      </div>
      {url ? (
        <div className="space-y-3">
          <Input label="Invitation link" value={url} readOnly onFocus={(event) => event.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={copyLink}><Copy size={16} /> Copy link</Button>
            <Button type="button" variant="secondary" onClick={shareLink}><Share2 size={16} /> Share</Button>
          </div>
          <p className="text-xs text-ink-muted">Copy or share this link now. You can cancel it from the Members page.</p>
          <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => { setUrl(""); setMessage(""); setError(""); }}>Create another link</Button>
        </div>
      ) : (
        <>
          <Select label="Role for people joining" value={role} onChange={(event) => setRole(event.target.value as "family" | "contributor")}>
            <option value="family">Family</option>
            {!sharingAllowance?.isFree && <option value="contributor">Contributor</option>}
          </Select>
          <Button type="button" variant="secondary" loading={loading} disabled={!sharingAllowance || !sharingAllowance.canShare} onClick={createLink}><Link2 size={16} /> Create invitation link</Button>
          {sharingAllowance?.remaining === 0 && <p className="text-sm text-ink-muted">All sharing spots are in use. People can join when a spot opens or the owner upgrades to Plus.</p>}
        </>
      )}
      {message && <p role="status" className="text-sm text-green-deep">{message}</p>}
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
    </section>
  );
}
