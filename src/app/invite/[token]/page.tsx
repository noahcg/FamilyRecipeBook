import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ChefHat, MailWarning } from "lucide-react";
import { Button } from "@/components/ui";
import { EntryShell } from "@/components/layout/EntryShell";
import { getUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { acceptInvitation, lookupInvitation } from "@/lib/actions/members";

interface Props {
  params: Promise<{ token: string }>;
}

const ROLE_LABELS: Record<string, string> = {
  contributor: "contributor",
  family: "family member",
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invitation = await lookupInvitation(token);
  const nextPath = `/invite/${token}`;

  if (!invitation) {
    return <InviteUnavailable nextPath={nextPath} />;
  }

  const user = await getUser();
  const emailMatches =
    user?.email?.toLowerCase() === invitation.email.toLowerCase();
  const isExpired = new Date(invitation.expires_at) < new Date();
  const isAccepted = !!invitation.accepted_at;

  if (user && emailMatches && !isExpired) {
    if (!isAccepted) {
      const result = await acceptInvitation(token);
      if (!result.success) {
        return (
          <InviteUnavailable nextPath={nextPath} message={result.error} />
        );
      }
    }
    redirect(`/app/books/${invitation.book_id}`);
  }

  if (isExpired || isAccepted) {
    return (
      <InviteUnavailable
        nextPath={nextPath}
        message={
          isAccepted
            ? "This invitation has already been accepted."
            : "This invitation has expired. Ask the cookbook keeper to send a new one."
        }
      />
    );
  }

  if (user && !emailMatches) {
    return <WrongAccount user={user.email!} invite={invitation.email} token={token} />;
  }

  return <SignedOutCta invitation={invitation} token={token} />;
}

function InviteUnavailable({
  nextPath,
  message = "This invitation link is no longer valid.",
}: {
  nextPath: string;
  message?: string;
}) {
  return (
    <EntryShell
      eyebrow="Invitation"
      title="Invitation no longer valid"
      description={message}
      maxWidth="md"
      sideImageSrc="/images/entry/add-family.jpg"
      sideImageAlt="Family-style dinner table"
      sideTitle="The recipes keep cooking, with or without this invite."
      sideDescription="If you think this is wrong, ask the cookbook keeper to send a fresh invitation."
      sideNote="Recipes are better when everyone can add their part."
    >
      <div className="recipe-card w-full p-6 text-center">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
          style={{ background: "var(--color-sage-soft)" }}
        >
          <AlertCircle size={26} className="text-accent-cinnamon" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-ink-muted">
          {message}
        </p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(nextPath)}`}
          className="inline-flex"
        >
          <Button variant="primary">Open Home Cooked</Button>
        </Link>
      </div>
    </EntryShell>
  );
}

function WrongAccount({
  user,
  invite,
  token,
}: {
  user: string;
  invite: string;
  token: string;
}) {
  const nextPath = `/invite/${token}`;
  return (
    <EntryShell
      eyebrow="Switch accounts"
      title="This invitation is for a different account"
      description={`You are signed in as ${user}, but the invitation was sent to ${invite}. Sign out and continue to accept the invitation.`}
      maxWidth="md"
      sideImageSrc="/images/entry/add-family.jpg"
      sideImageAlt="Family-style dinner table"
      sideTitle="Right person, right invite."
      sideDescription={`Sign out so we can sign you back in as ${invite} and add you to the cookbook.`}
      sideNote="Make sure the right cook joins the kitchen."
    >
      <div className="recipe-card w-full p-6 text-center">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
          style={{ background: "var(--color-sage-soft)" }}
        >
          <MailWarning size={26} className="text-accent-cinnamon" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-ink-muted">
          You can sign out and return here to accept as <strong>{invite}</strong>.
        </p>
        <form action={signOut} className="space-y-3">
          <input type="hidden" name="redirect_to" value={nextPath} />
          <Button type="submit" variant="primary" fullWidth>
            Sign out and continue
          </Button>
        </form>
        <Link
          href="/app"
          className="mt-4 inline-block text-sm text-ink-soft hover:text-ink"
        >
          Stay signed in and go to my cookbook
        </Link>
      </div>
    </EntryShell>
  );
}

function SignedOutCta({
  invitation,
  token,
}: {
  invitation: { email: string; role: string; cookbook_title: string };
  token: string;
}) {
  const nextParam = encodeURIComponent(`/invite/${token}`);
  const emailParam = encodeURIComponent(invitation.email);
  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role;
  return (
    <EntryShell
      eyebrow="You have been invited"
      title="Pull up a chair."
      description={`Join ${invitation.cookbook_title} as a ${roleLabel}. Create an account or sign in with ${invitation.email} to accept.`}
      maxWidth="md"
      sideImageSrc="/images/entry/add-family.jpg"
      sideImageAlt="Family-style dinner table"
      sideTitle="The recipes are waiting for one more cook."
      sideDescription={`Use ${invitation.email} to join — we kept your spot at the table.`}
      sideNote="Recipes are better when everyone can add their part."
    >
      <div className="recipe-card w-full p-6 sm:p-7">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
          style={{ background: "var(--color-sage-soft)" }}
        >
          <ChefHat size={26} className="text-green-deep" />
        </div>
        <p className="mb-2 text-center text-sm font-bold text-green-deep">
          {invitation.cookbook_title}
        </p>
        <p className="mb-6 text-center text-sm leading-relaxed text-ink-muted">
          Sent to <strong>{invitation.email}</strong>
        </p>

        <div className="space-y-3">
          <Link href={`/sign-up?next=${nextParam}&email=${emailParam}`} className="block">
            <Button variant="primary" fullWidth>
              Create account &amp; accept
            </Button>
          </Link>
          <Link href={`/sign-in?next=${nextParam}&email=${emailParam}`} className="block">
            <Button variant="secondary" fullWidth>
              I already have an account
            </Button>
          </Link>
        </div>

        <p className="mt-5 text-center text-xs text-ink-soft">
          We will add you to the cookbook automatically once you sign in.
        </p>
      </div>
    </EntryShell>
  );
}
