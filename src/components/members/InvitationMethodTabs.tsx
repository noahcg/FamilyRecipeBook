"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { clsx } from "clsx";
import { AddMemberForm } from "@/components/book/AddMemberForm";
import { ShareableInvitationForm } from "@/components/members/ShareableInvitationForm";

type SharingAllowance = { isFree: boolean; canShare: boolean; used: number; remaining: number | null } | null;
type Method = "email" | "link";

export function InvitationMethodTabs({ bookId, bookTitle, sharingAllowance }: { bookId: string; bookTitle: string; sharingAllowance: SharingAllowance }) {
  const [method, setMethod] = useState<Method>("email");
  const id = useId();
  const buttons = useRef<Record<Method, HTMLButtonElement | null>>({ email: null, link: null });
  const options: { id: Method; label: string }[] = [
    { id: "email", label: "Invite via email" },
    { id: "link", label: "Share a link" },
  ];

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next: Method = event.key === "Home" ? "email" : event.key === "End" ? "link" : method === "email" ? "link" : "email";
    setMethod(next);
    buttons.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Invitation method" className="mb-6 inline-flex max-w-full rounded-full border border-line bg-paper-soft p-1 shadow-xs">
        {options.map((option) => {
          const selected = method === option.id;
          return (
            <button
              key={option.id}
              ref={(element) => { buttons.current[option.id] = element; }}
              id={`${id}-${option.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-${option.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setMethod(option.id)}
              onKeyDown={onTabKeyDown}
              className={clsx("min-h-11 rounded-full px-4 py-2 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]", selected ? "bg-green-deep text-ink-inverse shadow-xs" : "text-green-deep hover:bg-green-pale")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-email-panel`} aria-labelledby={`${id}-email-tab`} hidden={method !== "email"}>
        <p className="mb-4 text-sm text-ink-muted">We&rsquo;ll send an invitation to their email address.</p>
        <AddMemberForm sharingAllowance={sharingAllowance} bookId={bookId} bookTitle={bookTitle} onSuccessRedirect={`/app/books/${bookId}/members`} />
      </div>
      <div role="tabpanel" id={`${id}-link-panel`} aria-labelledby={`${id}-link-tab`} hidden={method !== "link"}>
        <ShareableInvitationForm bookId={bookId} sharingAllowance={sharingAllowance} />
      </div>
    </div>
  );
}
