interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  return (
    <div className="app-paper-bg min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <h1
          className="text-3xl font-bold text-green-deep mb-4"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          You&apos;ve been invited
        </h1>
        <p className="text-ink-muted mb-8">
          Accept your invitation to join this recipe book.
        </p>
        {/* AcceptInviteFlow — built in Prompt 03 */}
      </div>
    </div>
  );
}
