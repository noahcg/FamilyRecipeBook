"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

export default function BookError({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: "var(--color-paper)" }}
    >
      <div className="recipe-card max-w-sm px-6 py-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--color-paper-warm)" }}
        >
          <AlertCircle size={28} strokeWidth={1.5} className="text-accent-terracotta" />
        </div>
        <h1
          className="text-xl font-bold text-green-deep mb-2"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Couldn&rsquo;t load this page
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          This cookbook did not load cleanly. Try again, or head back to your books.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={reset}>Try again</Button>
          <Link href="/app">
            <Button variant="primary">My book</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
