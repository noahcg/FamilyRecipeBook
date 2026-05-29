import Link from "next/link";
import { Plus, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { JoinInvitationButton } from "@/components/book/JoinInvitationButton";
import { getPendingInvitationsForCurrentUser } from "@/lib/actions/members";
import { requireUser } from "@/lib/auth";

const ROLE_LABELS: Record<string, string> = {
  contributor: "contributor",
  family: "family member",
};

const TIPS = [
  {
    label: "Joining is instant",
    description: "Accept an invitation and you're in the cookbook right away.",
    icon: Users,
  },
  {
    label: "Start your own",
    description: "Create a cookbook and add your first recipe in minutes.",
    icon: Plus,
  },
  {
    label: "Cook together",
    description: "Members can add recipes, notes, and reactions to shared books.",
    icon: Sparkles,
  },
];

export default async function OnboardingPage() {
  const [user, invitations] = await Promise.all([
    requireUser(),
    getPendingInvitationsForCurrentUser(),
  ]);

  const hasInvites = invitations.length > 0;

  return (
    <AppShell lockNav>
      <div className="px-4 py-8 sm:px-5 lg:px-8">
        <div className="mb-7 border-b border-line-soft pb-6">
          <h1
            className="text-3xl font-bold leading-tight text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Welcome to Home Cooked
          </h1>
          <p className="mt-2 max-w-prose text-sm text-ink-muted">
            Join a cookbook you&rsquo;ve been invited to, or start your own. You
            can do both whenever you like.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
          <div className="space-y-6">
            <section className="rounded-xl border border-line-soft bg-card p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink">
                Join an existing cookbook
              </h2>
              {hasInvites ? (
                <ul className="mt-4 space-y-3">
                  {invitations.map((invite) => {
                    const roleLabel = ROLE_LABELS[invite.role] ?? invite.role;
                    return (
                      <li
                        key={invite.token}
                        className="flex items-center justify-between gap-4 rounded-lg border border-line-soft bg-white-soft/60 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-green-deep">
                            {invite.cookbook_title}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {invite.invited_by_name
                              ? `Invited by ${invite.invited_by_name} · ${roleLabel}`
                              : roleLabel}
                          </p>
                        </div>
                        <JoinInvitationButton token={invite.token} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  Ask the cookbook&rsquo;s keeper to invite{" "}
                  <strong>{user.email}</strong>. Once they do, it&rsquo;ll show
                  up here to join.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-line-soft bg-card p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink">
                Create your own cookbook
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Start a fresh cookbook, add your recipes, and invite family when
                you&rsquo;re ready.
              </p>
              <Link href="/onboarding/create-book" className="mt-4 inline-block">
                <Button variant="primary">
                  <Plus size={16} strokeWidth={2} />
                  Create a cookbook
                </Button>
              </Link>
            </section>
          </div>

          <aside>
            <div className="rounded-xl border border-line-soft bg-card/70 p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink">How it works</h2>
              <ul className="mt-4 space-y-4">
                {TIPS.map(({ label, description, icon: Icon }) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-soft text-green-deep">
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
