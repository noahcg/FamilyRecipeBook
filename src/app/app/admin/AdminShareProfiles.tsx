"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Search, Share2, X } from "lucide-react";
import { shareBookWithUser } from "@/lib/actions/admin";

export interface AdminProfileOption {
  id: string;
  name: string;
  email: string | null;
}

export interface AdminCookbookOption {
  id: string;
  title: string;
}

interface Props {
  profiles: AdminProfileOption[];
  cookbooks: AdminCookbookOption[];
  /** `${bookId}:${userId}` for every existing membership (includes owners). */
  memberships: string[];
}

type ShareRole = "family" | "contributor";

const ROLES: { value: ShareRole; label: string; hint: string }[] = [
  { value: "family", label: "Family", hint: "View only" },
  { value: "contributor", label: "Contributor", hint: "Can edit" },
];

export function AdminShareProfiles({ profiles, cookbooks, memberships }: Props) {
  const [activeProfile, setActiveProfile] = useState<AdminProfileOption | null>(null);
  // Membership keys created during this session, so the modal reflects new shares.
  const [sharedNow, setSharedNow] = useState<Set<string>>(new Set());
  const [lastShared, setLastShared] = useState<Record<string, string>>({});

  const existing = useMemo(() => new Set(memberships), [memberships]);

  function isShared(bookId: string, userId: string) {
    const key = `${bookId}:${userId}`;
    return existing.has(key) || sharedNow.has(key);
  }

  return (
    <div className="recipe-card flex max-h-[34rem] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-line-soft px-5 py-4">
        <h2 className="text-base font-black text-ink">Profiles</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Click Share to add someone to a cookbook of your choosing.
        </p>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto">
        {profiles.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-muted">No profiles found.</p>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">
                  {profile.name || "Unnamed profile"}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {profile.email ?? profile.id}
                </p>
                {lastShared[profile.id] ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-green-deep">
                    <Check size={13} />
                    {lastShared[profile.id]}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setActiveProfile(profile)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-green-deep/30 bg-green-pale px-3 py-1.5 text-xs font-extrabold text-green-deep transition-colors hover:bg-green-deep hover:text-white"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
          ))
        )}
      </div>

      {activeProfile ? (
        <ShareDialog
          profile={activeProfile}
          cookbooks={cookbooks}
          isShared={(bookId) => isShared(bookId, activeProfile.id)}
          onClose={() => setActiveProfile(null)}
          onShared={(bookId, bookTitle) => {
            setSharedNow((prev) => new Set(prev).add(`${bookId}:${activeProfile.id}`));
            setLastShared((prev) => ({
              ...prev,
              [activeProfile.id]: `Shared into ${bookTitle}`,
            }));
          }}
        />
      ) : null}
    </div>
  );
}

interface ShareDialogProps {
  profile: AdminProfileOption;
  cookbooks: AdminCookbookOption[];
  isShared: (bookId: string) => boolean;
  onClose: () => void;
  onShared: (bookId: string, bookTitle: string) => void;
}

function ShareDialog({ profile, cookbooks, isShared, onClose, onShared }: ShareDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [role, setRole] = useState<ShareRole | null>(null); // asked each time, no default
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cookbooks;
    return cookbooks.filter((book) => book.title.toLowerCase().includes(q));
  }, [cookbooks, search]);

  const selectedBook = cookbooks.find((book) => book.id === selectedBookId) ?? null;
  const canShare = Boolean(selectedBookId && role) && !isShared(selectedBookId);

  function handleShare() {
    if (!selectedBook || !role) return;
    setError(null);
    startTransition(() => {
      shareBookWithUser({ bookId: selectedBook.id, userId: profile.id, role }).then((res) => {
        if (res.success) {
          onShared(selectedBook.id, selectedBook.title);
          onClose();
        } else {
          setError(res.error ?? "Could not share.");
        }
      });
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-card shadow-xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-black text-ink">
              Share with {profile.name || "this person"}
            </h3>
            <p className="mt-0.5 truncate text-xs text-ink-muted">
              {profile.email ?? profile.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-ink-soft transition-colors hover:bg-green-pale hover:text-green-deep"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs font-bold text-ink-soft">Cookbook</p>
          <div className="mt-1.5 flex h-10 items-center gap-2 rounded-md border border-line-soft bg-white-soft/70 px-3">
            <Search size={15} className="shrink-0 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cookbooks"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
            />
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-line-soft">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">No cookbooks match.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {filtered.map((book) => {
                  const already = isShared(book.id);
                  const selected = book.id === selectedBookId;
                  return (
                    <li key={book.id}>
                      <button
                        type="button"
                        disabled={already}
                        onClick={() => setSelectedBookId(book.id)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed ${
                          selected
                            ? "bg-green-pale font-black text-green-deep"
                            : "text-ink hover:bg-green-pale/60"
                        } ${already ? "opacity-60" : ""}`}
                      >
                        <span className="truncate">{book.title}</span>
                        {already ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-green-deep">
                            <Check size={13} /> Shared
                          </span>
                        ) : selected ? (
                          <Check size={15} className="shrink-0 text-green-deep" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="mt-4 text-xs font-bold text-ink-soft">Role</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-green-deep bg-green-pale"
                      : "border-line-soft bg-card hover:border-green-deep/40"
                  }`}
                >
                  <span className="block text-sm font-black text-ink">{r.label}</span>
                  <span className="block text-xs text-ink-muted">{r.hint}</span>
                </button>
              );
            })}
          </div>

          {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-bold text-ink-soft transition-colors hover:bg-green-pale hover:text-green-deep"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!canShare || isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-green-deep px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-green-deep/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
