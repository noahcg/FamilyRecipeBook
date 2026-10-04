"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, Loader2, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { deleteUser, reinstateUser, suspendUser, type AccountDeletionImpact, type AdminSuspendDuration } from "@/lib/actions/admin";

const durations: { value: AdminSuspendDuration; label: string }[] = [
  { value: "24h", label: "1 day" },
  { value: "168h", label: "7 days" },
  { value: "720h", label: "30 days" },
  { value: "876000h", label: "Indefinitely" },
];

interface Props {
  userId: string;
  email: string;
  isSuspended: boolean;
  canManage: boolean;
  deletionImpact: AccountDeletionImpact;
}

export function UserAccountControls({ userId, email, isSuspended, canManage, deletionImpact }: Props) {
  const router = useRouter();
  const [duration, setDuration] = useState<AdminSuspendDuration>("168h");
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [ownershipTransfers, setOwnershipTransfers] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    onSuccess?: () => void
  ) {
    setError(null);
    startTransition(() => {
      action().then((result) => {
        if (!result.success) setError(result.error ?? "Could not update this account.");
        else {
          setDeleteOpen(false);
          onSuccess?.();
        }
      });
    });
  }

  const ownershipResolved = deletionImpact.sharedCookbooks.every((book) => Boolean(ownershipTransfers[book.id]));

  if (!canManage) {
    return (
      <section className="recipe-card border border-line-soft p-5">
        <h2 className="text-base font-black text-ink">Account controls</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          This is a configured platform administrator. Administrator accounts cannot be suspended or deleted here.
        </p>
      </section>
    );
  }

  return (
    <section className="recipe-card border border-line-soft p-5">
      <h2 className="text-base font-black text-ink">Account controls</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        Changes are recorded in the admin activity log. Suspending blocks new sign-ins; deletion is permanent and only proceeds after a recipe archive is emailed to this address.
      </p>

      {error ? (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {isSuspended ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => reinstateUser({ userId }))}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-green-deep px-4 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            Reinstate account
          </button>
        ) : (
          <>
            <label className="grid gap-1 text-xs font-bold text-ink-muted">
              Suspension length
              <span className="relative block">
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value as AdminSuspendDuration)}
                  disabled={isPending}
                  className="h-10 min-w-40 appearance-none rounded-full border border-amber-700/30 bg-amber-50 px-4 pr-11 text-sm font-extrabold text-amber-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-700/30 disabled:opacity-60"
                >
                  {durations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <ChevronDown
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-amber-800"
                />
              </span>
            </label>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => suspendUser({ userId, duration }))}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-amber-700/30 bg-amber-50 px-4 text-sm font-extrabold text-amber-800 disabled:opacity-60"
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldOff size={15} />}
              Suspend account
            </button>
          </>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={() => { setError(null); setDeleteOpen(true); }}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-red-700/30 bg-red-50 px-4 text-sm font-extrabold text-red-700 disabled:opacity-60"
        >
          <Trash2 size={15} /> Delete account
        </button>
      </div>

      {deleteOpen ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-red-800"><AlertTriangle size={17} /> Permanently delete {email}?</p>
          <p className="mt-1 text-sm text-red-800/85">This removes personal data and private cookbooks. Recipes contributed to other cookbooks remain. A compact archive of deleted cookbook content is emailed first; if delivery fails, nothing is deleted.</p>
          <div className="mt-3 grid gap-2 text-sm text-red-900/85 sm:grid-cols-2">
            <p><strong>{deletionImpact.privateCookbookCount}</strong> private cookbook{deletionImpact.privateCookbookCount === 1 ? "" : "s"} · <strong>{deletionImpact.privateRecipeCount}</strong> recipe{deletionImpact.privateRecipeCount === 1 ? "" : "s"} deleted</p>
            <p><strong>{deletionImpact.survivingContributions}</strong> contributed recipe{deletionImpact.survivingContributions === 1 ? "" : "s"} preserved elsewhere</p>
          </div>
          {deletionImpact.sharedCookbooks.length ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950">
              <p className="font-black">Transfer shared cookbooks before deletion</p>
              <p className="mt-1 text-xs leading-relaxed">These cookbooks have other members and will remain available. Choose an existing member to become the keeper of each one.</p>
              <div className="mt-3 grid gap-3">
                {deletionImpact.sharedCookbooks.map((book) => (
                  <label key={book.id} className="grid gap-1 text-xs font-bold">
                    {book.title} · {book.recipeCount} recipes
                    <select
                      value={ownershipTransfers[book.id] ?? ""}
                      onChange={(event) => setOwnershipTransfers((current) => ({ ...current, [book.id]: event.target.value }))}
                      className="h-10 max-w-sm rounded-md border border-amber-400 bg-white px-3 text-sm font-semibold text-ink"
                    >
                      <option value="">Choose a new keeper</option>
                      {book.members.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.role})</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-4 text-sm text-red-800/85">Type <strong>DELETE</strong> to continue.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              placeholder="Type DELETE"
              className="h-10 rounded-md border border-red-200 bg-white px-3 text-sm text-ink"
              aria-label="Confirm permanent account deletion"
            />
            <button
              type="button"
              disabled={isPending || deleteText !== "DELETE" || !ownershipResolved}
              onClick={() => run(() => deleteUser({
                userId,
                ownershipTransfers: deletionImpact.sharedCookbooks.map((book) => ({ bookId: book.id, newOwnerId: ownershipTransfers[book.id] ?? "" })),
              }), () => { router.replace("/app/admin"); router.refresh(); })}
              className="h-10 rounded-full bg-red-700 px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Deleting…" : "Permanently delete"}
            </button>
            <button type="button" disabled={isPending} onClick={() => setDeleteOpen(false)} className="h-10 px-2 text-sm font-bold text-ink-muted hover:underline">Cancel</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
