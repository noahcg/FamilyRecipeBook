"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, Clock, Search, Send, UserPlus, Users } from "lucide-react";
import { Badge, Button, Card, Dialog, EmptyState, Input } from "@/components/ui";
import { inviteUserToBook } from "@/lib/actions/admin";

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
  /** `${bookId}:${email}` for every pending (unaccepted) invitation. */
  pendingInvites: string[];
}

type ShareRole = "family" | "contributor";

const ROLES: { value: ShareRole; label: string; hint: string }[] = [
  { value: "family", label: "Family", hint: "View, react, and add notes and memories" },
  { value: "contributor", label: "Contributor", hint: "Can edit" },
];

type BookStatus = "member" | "invited" | null;

export function AdminShareProfiles({ profiles, cookbooks, memberships, pendingInvites }: Props) {
  const [activeProfile, setActiveProfile] = useState<AdminProfileOption | null>(null);
  // Invitations sent during this session, so the modal reflects them immediately.
  const [invitedNow, setInvitedNow] = useState<Set<string>>(new Set());
  const [lastInvited, setLastInvited] = useState<Record<string, string>>({});

  const members = useMemo(() => new Set(memberships), [memberships]);
  const pending = useMemo(() => new Set(pendingInvites), [pendingInvites]);

  function bookStatus(bookId: string, profile: AdminProfileOption): BookStatus {
    if (members.has(`${bookId}:${profile.id}`)) return "member";
    if (invitedNow.has(`${bookId}:${profile.id}`)) return "invited";
    if (profile.email && pending.has(`${bookId}:${profile.email.toLowerCase()}`)) return "invited";
    return null;
  }

  return (
    <Card padded={false} className="flex max-h-[34rem] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-line-soft px-4 pb-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-bold leading-tight text-green-deep">Profiles</h2>
          <Badge variant="sage">{profiles.length} shown</Badge>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          Invite people to a cookbook you keep. They choose to accept before it joins their shelf.
        </p>
      </div>

      <div role="region" aria-label="Profiles" tabIndex={0} className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto">
        {profiles.length === 0 ? (
          <EmptyState icon={<Users size={24} aria-hidden="true" className="text-green-sage" />} title="No profiles found" description="Try another search to find a profile." className="!py-8" />
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
            >
              <div className="min-w-0">
                <Link
                  href={`/app/admin/users/${profile.id}`}
                  className="block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-deep hover:underline"
                >
                  <p className="truncate text-sm font-bold text-green-deep">
                    {profile.name || "Unnamed profile"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {profile.email ?? profile.id}
                  </p>
                </Link>
                {lastInvited[profile.id] ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-green-deep">
                    <Check size={13} />
                    {lastInvited[profile.id]}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveProfile(profile)}
                className="min-h-11 shrink-0"
              >
                <UserPlus size={14} />
                Invite
              </Button>
            </div>
          ))
        )}
      </div>

      {activeProfile ? (
        <InviteDialog
          profile={activeProfile}
          cookbooks={cookbooks}
          statusFor={(bookId) => bookStatus(bookId, activeProfile)}
          onClose={() => setActiveProfile(null)}
          onInvited={(bookId, bookTitle) => {
            setInvitedNow((prev) => new Set(prev).add(`${bookId}:${activeProfile.id}`));
            setLastInvited((prev) => ({
              ...prev,
              [activeProfile.id]: `Invited to ${bookTitle}`,
            }));
          }}
        />
      ) : null}
    </Card>
  );
}

interface InviteDialogProps {
  profile: AdminProfileOption;
  cookbooks: AdminCookbookOption[];
  statusFor: (bookId: string) => BookStatus;
  onClose: () => void;
  onInvited: (bookId: string, bookTitle: string) => void;
}

function InviteDialog({ profile, cookbooks, statusFor, onClose, onInvited }: InviteDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [role, setRole] = useState<ShareRole | null>(null); // asked each time, no default
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cookbooks;
    return cookbooks.filter((book) => book.title.toLowerCase().includes(q));
  }, [cookbooks, search]);

  const selectedBook = cookbooks.find((book) => book.id === selectedBookId) ?? null;
  const canInvite = Boolean(selectedBookId && role) && statusFor(selectedBookId) === null;

  function handleInvite() {
    if (!selectedBook || !role) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await inviteUserToBook({ bookId: selectedBook.id, userId: profile.id, role });
        if (res.success) {
          onInvited(selectedBook.id, selectedBook.title);
          onClose();
        } else {
          setError(res.error ?? "Could not send invite.");
        }
      } catch {
        setError("Could not send invite. Check your connection and try again.");
      }
    });
  }

  return (
    <Dialog open onClose={() => { if (!isPending) onClose(); }} title={`Invite ${profile.name || "this person"}`} className="max-h-[85dvh] overflow-y-auto">
      <p className="mb-4 break-all text-sm text-ink-muted">{profile.email ?? profile.id}</p>
      <div>
          <Input
            label="Cookbook"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cookbooks"
            rightElement={<Search size={17} aria-hidden="true" className="text-ink-soft" />}
            className="min-h-11"
          />

          <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-line-soft">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">No cookbooks match.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {filtered.map((book) => {
                  const status = statusFor(book.id);
                  const unavailable = status !== null;
                  const selected = book.id === selectedBookId;
                  return (
                    <li key={book.id}>
                      <button
                        type="button"
                        disabled={unavailable}
                        aria-pressed={selected}
                        onClick={() => setSelectedBookId(book.id)}
                        className={`flex w-full items-center justify-between gap-2 min-h-11 px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-deep disabled:cursor-not-allowed ${
                          selected
                            ? "bg-green-pale font-black text-green-deep"
                            : "text-ink hover:bg-green-pale/60"
                        } ${unavailable ? "opacity-60" : ""}`}
                      >
                        <span className="truncate">{book.title}</span>
                        {status === "member" ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-green-deep">
                            <Check size={13} /> Member
                          </span>
                        ) : status === "invited" ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-accent-cinnamon">
                            <Clock size={13} /> Invited
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

          <fieldset className="mt-4">
          <legend className="text-xs font-bold text-ink-soft">Role</legend>
          <div className="mt-1.5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <label
                  key={r.value}
                  className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-deep ${
                    selected
                      ? "border-green-deep bg-green-pale"
                      : "border-line-soft bg-card hover:border-green-deep/40"
                  }`}
                >
                  <input type="radio" name="invite-role" value={r.value} checked={selected} onChange={() => setRole(r.value)} className="mt-1 accent-green-deep" />
                  <span><span className="block text-sm font-black text-ink">{r.label}</span>
                  <span className="block text-xs text-ink-muted">{r.hint}</span></span>
                </label>
              );
            })}
          </div>
          </fieldset>

          {error ? <p role="alert" className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4">
          <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="min-h-11" onClick={handleInvite} disabled={!canInvite || isPending} loading={isPending}>
            {!isPending && <Send size={15} aria-hidden="true" />}
            {isPending ? "Sending…" : "Send invite"}
          </Button>
        </div>
    </Dialog>
  );
}
