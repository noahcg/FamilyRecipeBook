"use client";

import { useEffect, useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { saveShareCard } from "@/lib/actions/shareCard";
import { mediaUrl, storageMediaReference } from "@/lib/media";
import { uploadRecipeImage } from "@/lib/upload";
import { createClient } from "@/lib/supabase/client";
import { SHARE_CARD_OVERLAY } from "@/lib/shareCardStyle";

type RecipeOption = { id: string; title: string; photo_url: string };

export function ShareCardForm({ bookId, bookTitle, userId, initialRecipeId, initialCustomPath, recipes, needsReview }: { bookId: string; bookTitle: string; userId: string; initialRecipeId: string | null; initialCustomPath: string | null; recipes: RecipeOption[]; needsReview: boolean }) {
  const initialSelection = initialCustomPath ? "custom" : initialRecipeId ?? "";
  const [selected, setSelected] = useState(initialSelection);
  const [saved, setSaved] = useState(initialSelection);
  const [customPath, setCustomPath] = useState(initialCustomPath);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewNeeded, setReviewNeeded] = useState(needsReview);
  const recipe = recipes.find((item) => item.id === selected);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);
  const customPreview = filePreview ?? (customPath ? `/api/media/recipe-images/${customPath.split("/").map(encodeURIComponent).join("/")}` : null);
  const preview = selected === "custom" ? customPreview : recipe ? mediaUrl(recipe.photo_url) : null;

  async function save() {
    setSaving(true);
    setMessage("");
    let uploadedPath: string | null = null;
    try {
      if (selected === "custom" && file) {
        const uploaded = await uploadRecipeImage(file, userId);
        if ("error" in uploaded) { setMessage(uploaded.error); return; }
        uploadedPath = storageMediaReference(uploaded.url)?.path ?? null;
        if (!uploadedPath) { setMessage("Could not prepare the image. Please try again."); return; }
      }
      const result = await saveShareCard(bookId, selected === "custom" ? null : selected || null, selected === "custom" ? uploadedPath ?? customPath : null);
      if (!result.success) {
        if (uploadedPath) await createClient().storage.from("recipe-images").remove([uploadedPath]);
        setMessage(result.error);
        return;
      }
      setSaved(selected);
      setCustomPath(selected === "custom" ? uploadedPath ?? customPath : null);
      setFile(null);
      setFilePreview(null);
      setReviewNeeded(false);
      setMessage("Sharing image saved.");
    } catch {
      setMessage("Could not save the sharing image. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-3 border-t border-line-soft pt-5">
    <h3 className="text-base font-bold text-green-deep">Invitation sharing image</h3>
    <p className="text-sm leading-relaxed text-ink-muted">Choose the image shown when an invitation link is shared. The cookbook remains private, but anyone with the link and the services showing its preview can see the selected photo and cookbook name. Those services may keep a cached copy.</p>
    <Select label="Sharing image" value={selected} disabled={saving} onChange={(event) => { setSelected(event.target.value); setMessage(""); }}>
      <option value="">Default Home Cooked card</option>
      <option value="custom">Upload a custom photo</option>
      {initialRecipeId && !recipes.some((item) => item.id === initialRecipeId) && <option value={initialRecipeId} disabled>Previously selected photo is unavailable</option>}
      {recipes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
    </Select>
    {selected === "custom" && <Input label={customPath ? "Replace custom photo" : "Choose a custom photo"} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={saving} hint="JPEG, PNG, WebP, or HEIC up to 8 MB. Save to use this photo in invitation previews." onChange={(event) => { const nextFile = event.target.files?.[0] ?? null; setFile(nextFile); setFilePreview(nextFile ? URL.createObjectURL(nextFile) : null); setMessage(""); }} />}
    {recipes.length === 0 && <p className="text-sm text-ink-muted">Recipe photos will appear here when this cookbook has an uploaded or Pexels photo.</p>}
    {reviewNeeded && <p className="text-sm text-ink-muted">The selected photo changed or is unavailable. The default card is being used until you save a choice.</p>}
    <div className="relative aspect-[1200/630] max-w-lg overflow-hidden rounded-lg bg-green-deep" aria-label="Approximate sharing card preview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview ?? "/opengraph-image"} alt="" className="h-full w-full object-cover" />
      {preview && <><div className="absolute inset-0" style={{ backgroundImage: SHARE_CARD_OVERLAY }} /><div className="absolute inset-y-0 left-0 flex w-[64%] flex-col justify-center p-4 text-white sm:p-7"><span className="text-[10px] font-bold tracking-widest sm:text-xs">HOME COOKED</span><span className={`mt-2 break-words font-bold leading-tight ${bookTitle.length > 65 ? "text-sm sm:text-lg" : bookTitle.length > 40 ? "text-base sm:text-xl" : "text-xl sm:text-3xl"}`}>{bookTitle}</span><span className="mt-2 text-xs sm:text-sm">You’re invited to the table.</span></div></>}
    </div>
    <p className="text-xs text-ink-muted">Preview is approximate. Apps may crop or cache the card differently.</p>
    <Button type="button" size="sm" variant="secondary" disabled={(selected === saved && !reviewNeeded && !(selected === "custom" && file)) || saving || (selected === "custom" ? !file && !customPath : !!selected && !recipe)} loading={saving} onClick={save}>Save sharing image</Button>
    {message && <p role="status" className="text-sm font-semibold text-green-deep">{message}</p>}
  </div>;
}
