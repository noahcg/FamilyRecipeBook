import { notFound } from "next/navigation";
import { InviteUnavailable, SignedOutCta, WrongAccount } from "@/app/invite/[token]/states";

interface Props {
  params: Promise<{ variant: string }>;
}

const SAMPLE_TOKEN = "preview-token";
const SAMPLE_NEXT = `/invite/${SAMPLE_TOKEN}`;
const SAMPLE_INVITATION = {
  email: "family@example.com",
  role: "contributor",
  cookbook_title: "Noah's Kitchen",
};

export default async function InvitePreviewVariantPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { variant } = await params;

  switch (variant) {
    case "unavailable":
      return <InviteUnavailable nextPath={SAMPLE_NEXT} />;
    case "expired":
      return (
        <InviteUnavailable
          nextPath={SAMPLE_NEXT}
          message="This invitation has expired. Ask the cookbook keeper to send a new one."
        />
      );
    case "accepted":
      return (
        <InviteUnavailable
          nextPath={SAMPLE_NEXT}
          message="This invitation has already been accepted."
        />
      );
    case "wrong-account":
      return (
        <WrongAccount
          user="someone-else@example.com"
          invite={SAMPLE_INVITATION.email}
          token={SAMPLE_TOKEN}
        />
      );
    case "signed-out":
      return <SignedOutCta invitation={SAMPLE_INVITATION} token={SAMPLE_TOKEN} />;
    default:
      notFound();
  }
}
