"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookCoverArt, Button, Card, Input, Select, Textarea } from "@/components/ui";
import { BOOK_COVER_COLORS } from "@/lib/bookCovers";
import { configureOfficialCollection } from "@/lib/actions/officialCollections";
import type { ConfigureCollectionInput } from "@/lib/validators/officialCollection";

export function AdminCollectionPanel({ initial, baseUrl }: { initial: ConfigureCollectionInput; baseUrl: string }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [published, setPublished] = useState(initial.published);
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [savedValues, setSavedValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function save(makePublished: boolean, settings = values) {
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        const result = await configureOfficialCollection({ ...settings, published: makePublished });
        if (!result.success) { setError(result.error); return; }
        setPublished(result.data.published);
        setSavedSlug(result.data.slug);
        setSavedValues({ ...settings, published: result.data.published });
        setMessage(makePublished ? "Collection published. You can now share its link." : "Collection unpublished. Readers can no longer open its recipes or images.");
        router.refresh();
      } catch {
        setError("Could not save the collection. Please try again.");
      }
    });
  }

  return (
    <Card id="home-cooked-collection" className="mt-6 scroll-mt-6">
      <h2 className="text-xl font-bold text-green-deep">Home Cooked collection</h2>
      <p className="mt-2 text-sm text-ink-muted">Publish this cookbook as a free, read-only collection. Visitors see the cover, description, and chapter list with recipe counts, then sign in to add it. Your recipe changes appear for all readers.</p>
      <p className="mt-2 text-sm text-ink-muted">You must be its only member, with no active invitations and only recipes you created. Collection readers never become family members. Only you can edit the source cookbook while it is designated as a collection.</p>
      <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1fr)_140px]">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save(true); }}>
          <Input label="Public collection title" required maxLength={120} value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} />
          <Textarea label="Public description" required maxLength={2000} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} hint="Shown with the cover and chapter list before sign-in. Recipe details stay behind sign-in." />
          <Input label="Collection link name" required minLength={3} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={values.slug} onChange={(event) => setValues({ ...values, slug: event.target.value })} hint="For example: holiday-recipes. Keep this link name once you share it." />
          <Select label="Public cover color" value={values.coverStyle} onChange={(event) => setValues({ ...values, coverStyle: event.target.value })}>{BOOK_COVER_COLORS.map((color) => <option key={color.hex} value={color.hex}>{color.label}</option>)}</Select>
          <p className="text-sm font-bold text-green-deep">{published ? "Published" : "Not published"}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={pending}>{published ? "Save published collection" : "Publish collection"}</Button>
            {published && <Button type="button" variant="secondary" disabled={pending} onClick={() => save(false, savedValues)}>Unpublish collection</Button>}
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {message && <p role="status" className="text-sm text-green-deep">{message}</p>}
        </form>
        <div><BookCoverArt title={values.title} seed={values.bookId} color={values.coverStyle} /></div>
      </div>
      {published && <div className="mt-5 border-t border-line-soft pt-4">
        <Link href={`/collections/${savedSlug}`} className="inline-flex min-h-11 items-center font-bold text-green-deep underline">Open public collection page</Link>
        <div className="mt-3 flex flex-wrap gap-3">
          <Input label="Share link" readOnly value={`${baseUrl}/collections/${savedSlug}`} />
          <Button type="button" variant="secondary" className="self-end" onClick={async () => {
            try { await navigator.clipboard.writeText(`${baseUrl}/collections/${savedSlug}`); setMessage("Collection link copied."); }
            catch { setError("Copy the share link from the field above."); }
          }}>Copy link</Button>
        </div>
      </div>}
    </Card>
  );
}
