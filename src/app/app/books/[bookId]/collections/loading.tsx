export default function CollectionsLoading() {
  return (
    <div className="px-5 pt-5 pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton-surface h-7 w-36 rounded-lg" />
        <div className="skeleton-surface h-8 w-20 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="skeleton-surface rounded-xl p-4"
            style={{ height: 72 }}
          />
        ))}
      </div>
    </div>
  );
}
