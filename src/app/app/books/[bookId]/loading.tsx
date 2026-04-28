export default function BookLoading() {
  return (
    <div className="app-paper-bg min-h-screen px-5 pt-6 pb-24">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4 animate-pulse">
        <div className="h-7 w-48 rounded-lg" style={{ background: "var(--color-sage-soft)" }} />
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-8 h-8 rounded-full" style={{ background: "var(--color-sage-soft)" }} />
          ))}
        </div>
      </div>
      <div className="h-12 rounded-lg mb-8 animate-pulse" style={{ background: "var(--color-sage-pale)" }} />

      {/* Recipe grid skeleton */}
      <div className="h-5 w-32 rounded mb-4 animate-pulse" style={{ background: "var(--color-sage-soft)" }} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl aspect-[3/4] animate-pulse"
            style={{ background: "var(--color-sage-pale)" }}
          />
        ))}
      </div>
    </div>
  );
}
