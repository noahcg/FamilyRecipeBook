export default function BookLoading() {
  return (
    <div className="app-paper-bg min-h-screen px-5 pt-6 pb-24">
      <div className="mx-auto max-w-[980px]">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton-surface h-7 w-48 rounded-lg" />
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-surface w-8 h-8 rounded-full" />
          ))}
        </div>
      </div>
      <div className="skeleton-surface h-12 rounded-lg mb-8" />

      {/* Recipe grid skeleton */}
      <div className="skeleton-surface h-5 w-32 rounded mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="skeleton-surface rounded-xl aspect-[3/4]"
          />
        ))}
      </div>
      </div>
    </div>
  );
}
