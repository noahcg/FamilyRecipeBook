"use client";

import { useState, useTransition } from "react";
import { Check, KeyRound, Loader2 } from "lucide-react";
import { sendPasswordResetForUser } from "@/lib/actions/admin";

export function SendResetButton({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(() => {
      sendPasswordResetForUser(userId).then((res) => {
        if (res.success) setDone(true);
        else setError(res.error ?? "Could not send the reset email.");
      });
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || done || !email}
        className="inline-flex items-center gap-2 rounded-md border border-green-deep/30 bg-green-pale px-4 py-2 text-sm font-extrabold text-green-deep transition-colors hover:bg-green-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-green-pale disabled:hover:text-green-deep"
      >
        {done ? (
          <Check size={15} />
        ) : isPending ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <KeyRound size={15} />
        )}
        {done ? "Reset email sent" : "Send password reset"}
      </button>
      {!email ? (
        <p className="mt-2 text-xs text-ink-muted">No email on file for this user.</p>
      ) : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
