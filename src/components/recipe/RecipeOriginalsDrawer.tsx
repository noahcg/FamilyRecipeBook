"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { Button, Drawer } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { listRecipeOriginals, prepareRecipeOriginalUpload, removeRecipeOriginal } from "@/lib/actions/recipeOriginals";
import type { RecipeOriginal } from "@/lib/recipeOriginals";

export function RecipeOriginalsDrawer({ recipeId, canEdit, onClose }: {
  recipeId: string;
  canEdit: boolean;
  onClose: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [originals, setOriginals] = useState<RecipeOriginal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  async function refresh() {
    const result = await listRecipeOriginals(recipeId);
    if (!result.success) throw new Error(result.error);
    setOriginals(result.data);
  }

  useEffect(() => {
    let active = true;
    listRecipeOriginals(recipeId).then((result) => {
      if (!active) return;
      if (result.success) setOriginals(result.data);
      else setError(result.error);
    }).catch(() => {
      if (active) setError("Could not load originals. Please try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recipeId]);

  // Keep short-lived private links usable while the drawer stays open.
  useEffect(() => {
    if (busy) return;
    let active = true;
    const renew = async () => {
      try {
        const result = await listRecipeOriginals(recipeId);
        if (!active) return;
        if (result.success) setOriginals(result.data);
        else setError(result.error);
      } catch {
        if (active) setError("Could not refresh originals. Please reload the list.");
      }
    };
    const timer = window.setInterval(() => void renew(), 4 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") void renew(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [recipeId, busy]);

  async function upload(files: File[]) {
    if (!files.length || busy || loading || !canEdit) return;
    setDragging(false);
    setBusy(true);
    setError("");
    setMessage("");
    let saved = 0;
    try {
      const supabase = createClient();
      for (const file of files) {
        const result = await prepareRecipeOriginalUpload(recipeId, file.name, file.size, file.type);
        if (!result.success) throw new Error(result.error);
        const { error: uploadError } = await supabase.storage.from("recipe-originals")
          .uploadToSignedUrl(result.data.path, result.data.token, file, { contentType: file.type });
        if (uploadError) throw new Error("Could not upload this file. Please try again.");
        saved++;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not attach the original. Please try again.");
    } finally {
      if (saved) setMessage(`${saved} original ${saved === 1 ? "file attached" : "files attached"}.`);
      try { await refresh(); } catch { setError("Could not refresh originals. Reload the list before uploading again."); }
      setBusy(false);
    }
  }

  async function remove(path: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await removeRecipeOriginal(recipeId, path);
      if (!result.success) throw new Error(result.error);
      setOriginals((items) => items.filter((item) => item.path !== path));
      setRemoving(null);
      setMessage("Original file removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this file. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <Drawer open onClose={() => { if (!busy) onClose(); }} title="Original recipe" eyebrow="Keep the memories">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-6">
        <p className="text-sm text-ink-soft">Keep the handwritten card, cookbook page, or original PDF alongside this recipe. Originals are visible to members of this cookbook.</p>
        {loading && <p role="status" className="text-sm text-ink-soft">Loading originals…</p>}
        {canEdit && (
          <div>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              aria-label="Choose original recipe files"
              accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
              multiple
              disabled={busy || loading}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                void upload(files);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={busy || loading}
              aria-describedby="original-upload-hint"
              className={`flex-col gap-2 border-dashed px-4 py-6 text-center ${dragging ? "border-green-deep bg-green-pale" : "border-line bg-paper-soft"}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = busy || loading ? "none" : "copy";
                if (!busy && !loading) setDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void upload(Array.from(event.dataTransfer.files));
              }}
            >
              <Upload size={24} strokeWidth={1.5} aria-hidden="true" />
              <span className="text-sm font-bold">{dragging ? "Drop to attach" : "Add original recipe"}</span>
              <span className="text-xs font-normal text-ink-soft">Drag files here or tap to browse</span>
            </Button>
            <p id="original-upload-hint" className="mt-2 text-center text-xs text-ink-soft">JPG, PNG, WebP or PDF · Up to 20 MB each</p>
          </div>
        )}
        {!canEdit && !loading && !error && originals.length === 0 && (
          <div className="flex items-center gap-2 py-3 text-sm text-ink-soft">
            <Paperclip size={18} />
            <p>No original attached yet</p>
          </div>
        )}
        {originals.length > 0 && <section aria-label="Attached originals" className="space-y-2">
          <p className="text-xs font-semibold text-ink-soft">{originals.length} {originals.length === 1 ? "attachment" : "attachments"}</p>
          <ul className="divide-y divide-line-soft">
            {originals.map((original) => (
              <li key={original.path} className="py-3">
                <div className="flex items-center gap-1">
                  <a href={original.url} target="_blank" rel="noopener noreferrer" title={original.name}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm text-green-deep transition-colors hover:bg-green-pale focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]">
                    <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line-soft bg-paper-soft">
                      <FileText size={22} strokeWidth={1.5} aria-hidden="true" />
                      {/\.(jpe?g|png|webp)$/i.test(original.name) && (
                        // Private, short-lived URLs are displayed directly without image optimization.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={original.url} alt="" className="absolute inset-0 size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold group-hover:underline">{original.name}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">{original.name.toLowerCase().endsWith(".pdf") ? "PDF document" : "Original photo"}</span>
                    </span>
                    <ExternalLink size={15} className="mr-1 shrink-0 text-ink-soft" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {canEdit && <Button type="button" variant="ghost" disabled={busy} className="min-h-11! w-11 shrink-0 p-0! text-ink-soft hover:text-danger"
                    onClick={() => setRemoving(original.path)} aria-label={`Remove ${original.name}`} title="Remove attachment">
                    <Trash2 size={16} strokeWidth={1.75} />
                  </Button>}
                </div>
                {canEdit && removing === original.path && (
                  <div className="mt-3 space-y-3 rounded-sm bg-paper-soft p-3">
                    <p className="text-sm text-ink">Remove this original file? This cannot be undone.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" disabled={busy} onClick={() => setRemoving(null)}>Keep file</Button>
                      <Button variant="danger" loading={busy} onClick={() => remove(original.path)}>Remove</Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>}
        {busy && <p role="status" className="text-sm text-ink-soft">Saving changes… Please keep this open.</p>}
        {error && <div role="alert" className="space-y-2 text-sm text-danger">
          <p>{error}</p>
          <Button variant="secondary" disabled={busy} onClick={async () => {
            setLoading(true);
            setError("");
            try { await refresh(); } catch { setError("Could not load originals. Please try again."); }
            finally { setLoading(false); }
          }}>Reload originals</Button>
        </div>}
        {message && <p role="status" className="text-sm font-semibold text-green-deep">{message}</p>}
      </div>
    </Drawer>
  );
}
