"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function CollectionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="app-paper-bg min-h-dvh px-5 py-12"><Card className="mx-auto max-w-lg">
    <h1 className="text-2xl font-bold text-green-deep">Couldn’t load this collection</h1>
    <p className="my-4 text-sm text-ink-muted">Please try again. If the collection was unpublished, its recipes will be unavailable.</p>
    <Button type="button" onClick={reset}>Try again</Button>
    <Link href="/" className="ml-4 inline-flex min-h-11 items-center font-bold text-green-deep underline">Home Cooked home</Link>
  </Card></div>;
}
