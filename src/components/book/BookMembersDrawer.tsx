"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge, Button, Drawer } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { BookRole } from "@/lib/types";

interface RosterMember {
  user_id: string;
  role: BookRole;
  profile: { full_name: string | null } | null;
}

const ROLE_LABELS: Record<BookRole, string> = {
  keeper: "Keeper",
  contributor: "Contributor",
  family: "Family",
};

const ROLE_ORDER: Record<BookRole, number> = { keeper: 0, contributor: 1, family: 2 };

type RosterState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; members: RosterMember[] };

function MemberList({ bookId }: { bookId: string }) {
  const [state, setState] = useState<RosterState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      try {
        // The signed-in client keeps cookbook and shared-profile RLS in force.
        // Fetch only names and roles, never full profiles or invitation details.
        const { data, error } = await createClient()
          .from("book_members")
          .select("user_id, role, profile:profiles(full_name)")
          .eq("book_id", bookId);

        if (!active) return;
        if (error) {
          setState({ status: "error" });
          return;
        }

        const members = (data as unknown as RosterMember[] ?? []).sort(
          (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
            || (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "")
        );
        setState({ status: "ready", members });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void loadMembers();
    return () => { active = false; };
  }, [bookId, attempt]);

  if (state.status === "loading") {
    return <p role="status" className="py-4 text-sm text-ink-muted">Loading members…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="py-4">
        <p role="alert" className="mb-3 text-sm text-ink-muted">Couldn’t load members. Please try again.</p>
        <Button variant="secondary" size="md" onClick={() => {
          setState({ status: "loading" });
          setAttempt((value) => value + 1);
        }}>Try again</Button>
      </div>
    );
  }

  if (state.members.length === 0) {
    return <p role="status" className="py-4 text-sm text-ink-muted">No members to show. If your access has changed, refresh the cookbook.</p>;
  }

  return (
    <ul aria-label="Cookbook members" className="divide-y divide-line-soft">
      {state.members.map((member) => (
        <li key={member.user_id} className="flex items-center justify-between gap-3 py-4">
          <span className="min-w-0 break-words text-sm font-semibold text-green-deep">
            {member.profile?.full_name?.trim() || "Cookbook member"}
          </span>
          <Badge variant={member.role} className="shrink-0">{ROLE_LABELS[member.role]}</Badge>
        </li>
      ))}
    </ul>
  );
}

export function BookMembersDrawer({ bookId, memberCount }: { bookId: string; memberCount: number }) {
  const [open, setOpen] = useState(false);
  const memberSummary = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 gap-1 px-1 align-baseline font-normal text-ink-muted underline decoration-line underline-offset-4 hover:bg-transparent! hover:text-green-deep hover:decoration-green-deep"
        aria-label={`View cookbook members (${memberSummary})`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {memberSummary}
        <ChevronRight size={13} aria-hidden="true" />
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} eyebrow="This cookbook" title="Members">
        <p className="text-sm text-ink-muted">The people sharing this cookbook.</p>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {open && <MemberList bookId={bookId} />}
        </div>
      </Drawer>
    </>
  );
}
