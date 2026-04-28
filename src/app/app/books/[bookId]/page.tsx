interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function BookHomePage({ params }: Props) {
  const { bookId } = await params;
  return (
    <div className="app-paper-bg paper-texture min-h-screen">
      <div className="max-w-[760px] mx-auto px-5 pb-28 pt-6">
        <p className="text-ink-muted text-sm">Book home — bookId: {bookId}</p>
        {/* BookHome — built in Prompt 03 */}
      </div>
    </div>
  );
}
