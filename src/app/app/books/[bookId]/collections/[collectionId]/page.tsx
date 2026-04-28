interface Props {
  params: Promise<{ bookId: string; collectionId: string }>;
}

export default async function CollectionDetailPage({ params }: Props) {
  const { bookId, collectionId } = await params;
  return (
    <div className="app-paper-bg paper-texture min-h-screen">
      <div className="max-w-[760px] mx-auto px-5 pb-28 pt-6">
        <p className="text-ink-muted text-sm">Collection — collectionId: {collectionId}</p>
      </div>
    </div>
  );
}
