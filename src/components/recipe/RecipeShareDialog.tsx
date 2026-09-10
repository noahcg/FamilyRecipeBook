"use client";

import { useState } from "react";
import { FileText, Link2, Share2 } from "lucide-react";
import { Button, Dialog } from "@/components/ui";
import { getOrCreateRecipeShare } from "@/lib/actions/recipeShares";
import { createRecipePdf, downloadRecipePdf } from "@/lib/recipePdf";
import type { RecipeWithRelations } from "@/lib/types";

interface RecipeShareDialogProps {
  open: boolean;
  onClose: () => void;
  recipe: RecipeWithRelations;
  bookId: string;
  onMessage: (message: string) => void;
}

async function copyText(value: string) {
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
  await navigator.clipboard.writeText(value);
}

export function RecipeShareDialog({ open, onClose, recipe, bookId, onMessage }: RecipeShareDialogProps) {
  const [loading, setLoading] = useState<"pdf" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setError(null); onClose(); };

  async function sharePdf() {
    setLoading("pdf");
    setError(null);
    try {
      const file = await createRecipePdf(recipe);
      const shareData = { title: recipe.title, text: `${recipe.title} — shared from Home Cooked`, files: [file] };
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share(shareData);
        close();
      } else {
        downloadRecipePdf(file);
        close(); onMessage("PDF ready to download");
      }
    } catch (error) {
      // A user dismissing the share sheet is not an error worth alarming them about.
      if (error instanceof DOMException && error.name === "AbortError") close();
      else setError("Unable to prepare the PDF. Please try again.");
    } finally { setLoading(null); }
  }

  async function shareLink() {
    setLoading("link");
    setError(null);
    try {
      const result = await getOrCreateRecipeShare(bookId, recipe.id);
      if (!result.success) throw new Error(result.error);
      const url = `${window.location.origin}/r/${result.data.shareId}`;
      const shareData = { title: recipe.title, text: `${recipe.title} - shared from Home Cooked`, url };
      if (navigator.share) {
        await navigator.share(shareData);
        close();
      } else {
        await copyText(url);
        close(); onMessage("Link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") close();
      else setError(error instanceof Error ? error.message : "Unable to share the link.");
    } finally { setLoading(null); }
  }

  return (
    <Dialog open={open} onClose={close} title="Share recipe">
      <p className="mb-4 text-sm leading-6 text-ink-muted">Choose how you&apos;d like to share this recipe.</p>
      <div className="space-y-3">
        <button type="button" onClick={sharePdf} disabled={loading !== null} className="flex w-full items-start gap-3 rounded-xl border border-line-soft bg-card p-4 text-left transition hover:border-green-mid hover:bg-green-pale disabled:cursor-wait disabled:opacity-70">
          <span className="mt-0.5 rounded-full bg-accent-honey/15 p-2 text-accent-cinnamon"><FileText size={19} /></span>
          <span className="min-w-0 flex-1"><span className="block font-bold text-green-deep">Share recipe</span><span className="mt-1 block text-sm leading-5 text-ink-muted">Send the complete recipe as a PDF. The recipient doesn&apos;t need Home Cooked.</span></span>
          {loading === "pdf" && <span className="text-xs font-semibold text-ink-soft">Preparing…</span>}
        </button>
        <button type="button" onClick={shareLink} disabled={loading !== null} className="flex w-full items-start gap-3 rounded-xl border border-line-soft bg-card p-4 text-left transition hover:border-green-mid hover:bg-green-pale disabled:cursor-wait disabled:opacity-70">
          <span className="mt-0.5 rounded-full bg-green-pale p-2 text-green-deep"><Link2 size={19} /></span>
          <span className="min-w-0 flex-1"><span className="block font-bold text-green-deep">Share Home Cooked link</span><span className="mt-1 block text-sm leading-5 text-ink-muted">Send a link to an interactive version of this recipe.</span></span>
          {loading === "link" && <span className="text-xs font-semibold text-ink-soft">Creating…</span>}
        </button>
      </div>
      {error && <p className="mt-4 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger" role="alert">{error}</p>}
      <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" size="sm" onClick={close} disabled={loading !== null}><Share2 size={15} />Cancel</Button></div>
    </Dialog>
  );
}
