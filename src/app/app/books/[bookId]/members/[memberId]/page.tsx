interface Props {
  params: Promise<{ bookId: string; memberId: string }>;
}

export default async function MemberProfilePage({ params }: Props) {
  const { bookId, memberId } = await params;
  return (
    <div className="app-paper-bg paper-texture min-h-screen">
      <div className="max-w-[760px] mx-auto px-5 pb-28 pt-6">
        <p className="text-ink-muted text-sm">Member profile — memberId: {memberId}</p>
        {/* MemberProfileCard — built in Prompt 03 */}
      </div>
    </div>
  );
}
