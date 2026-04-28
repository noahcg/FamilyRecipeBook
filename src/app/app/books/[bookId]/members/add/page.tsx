interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function AddMemberPage({ params }: Props) {
  const { bookId } = await params;
  return (
    <div className="app-paper-bg paper-texture min-h-screen">
      <div className="max-w-[760px] mx-auto px-5 pb-28 pt-6">
        <h1
          className="text-2xl font-bold text-green-deep mb-2"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Add someone to this book
        </h1>
        <p className="text-ink-muted mb-6">
          Invite family to share recipes, memories, and more.
        </p>
        {/* AddMemberForm — built in Prompt 03 */}
      </div>
    </div>
  );
}
