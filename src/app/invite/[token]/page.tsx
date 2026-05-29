import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { acceptInvitation, lookupInvitation } from "@/lib/actions/members";
import { InviteUnavailable, SignedOutCta, WrongAccount } from "./states";

interface Props {
  params: Promise<{ token: string }>;
}

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
