export default function MembersLoading() {
  return (
    <div className="px-5 pt-5 pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton-surface h-7 w-32 rounded-lg" />
        <div className="skeleton-surface h-8 w-28 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="recipe-card p-5 flex items-center gap-4"
          >
            <div className="skeleton-surface w-14 h-14 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-surface h-4 w-36 rounded" />
              <div className="skeleton-surface h-3 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
