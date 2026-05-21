"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, UserPlus, Settings, X } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  bookId: string;
}

// Shown once right after a cookbook is created (via the `?created=1` param), so
// the create flow can drop users straight into the book while still surfacing
// sharing and invite options up front.
export function NewBookBanner({ bookId }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative mb-6 w-full max-w-xl overflow-hidden rounded-xl border border-green-deep/20 bg-green-soft p-4 shadow-xs sm:p-5">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-card/70 hover:text-ink"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-2.5 pr-8">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-deep text-ink-inverse">
          <Sparkles size={15} strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-green-deep">
            Your cookbook is ready
          </p>
          <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-ink-muted">
            It&rsquo;s private to you. Invite family to add recipes together, or
            keep it to yourself — change sharing anytime in settings.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Link href={`/app/books/${bookId}/members/add`}>
              <Button variant="primary" size="sm" className="rounded-md">
                <UserPlus size={14} /> Invite family
              </Button>
            </Link>
            <Link href={`/app/books/${bookId}/settings`}>
              <Button variant="secondary" size="sm" className="rounded-md">
                <Settings size={14} /> Sharing settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
