import Link from "next/link";
import { ChefHat } from "lucide-react";
import { EntryShell } from "@/components/layout/EntryShell";
import { JoinShareableInvitationButton } from "@/components/members/JoinShareableInvitationButton";
import { Button } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import { lookupShareableInvitation } from "@/lib/actions/shareableInvitations";
import { getUser } from "@/lib/auth";
import { InviteUnavailable } from "../../[token]/states";

export default async function ShareableInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const nextPath = `/invite/link/${token}`;
  const [invitation, user] = await Promise.all([lookupShareableInvitation(token), getUser()]);
  if (!invitation) {
    return <InviteUnavailable nextPath={nextPath} message="This invitation link has expired, has already been used, or is no longer available. Ask the cookbook keeper for a new link." />;
  }

  const roleLabel = invitation.role === "contributor" ? "contributor" : "family member";
  return (
    <EntryShell
      eyebrow="You have been invited"
      title="Pull up a chair."
      description={`Join ${invitation.cookbookTitle} as a ${roleLabel}.`}
      maxWidth="md"
      sideImageSrc="/images/entry/add-family.jpg"
      sideImageAlt="Family-style dinner table"
      sideTitle="The recipes are waiting for one more cook."
      sideDescription="Join the people who share this cookbook."
      sideNote="Recipes are better when everyone can add their part."
    >
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-soft text-green-deep">
          <ChefHat size={26} />
        </div>
        <p className="mb-2 text-sm font-bold text-green-deep">{invitation.cookbookTitle}</p>
        {user ? (
          <>
            <p className="mb-5 text-sm text-ink-muted">Signed in as <strong>{user.email}</strong>. Confirm below to join this cookbook.</p>
            <JoinShareableInvitationButton token={token} />
            <form action={signOut} className="mt-4">
              <input type="hidden" name="redirect_to" value={nextPath} />
              <Button type="submit" variant="ghost" size="sm" className="min-h-11">Use a different account</Button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-5 text-sm text-ink-muted">Sign in or create an account, then confirm that you want to join.</p>
            <Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`} className="block">
              <Button variant="primary" fullWidth>Continue to sign in</Button>
            </Link>
          </>
        )}
      </div>
    </EntryShell>
  );
}
