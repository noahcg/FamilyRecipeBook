"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Card } from "@/components/ui";

export default function CollectionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppShell><div className="p-5 sm:p-8"><Card>
    <h1 className="text-2xl font-bold text-green-deep">Couldn’t load this collection</h1>
    <p className="my-4 text-sm text-ink-muted">Try again, or return to your bookshelf.</p>
    <Button type="button" onClick={reset}>Try again</Button>
    <Link href="/app/bookshelf" className="ml-4 inline-flex min-h-11 items-center font-bold text-green-deep underline">My bookshelf</Link>
  </Card></div></AppShell>;
}
