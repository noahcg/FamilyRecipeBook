export default function MembersLoading() {
  return (
    <div className="px-5 pt-5 pb-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 rounded-lg" style={{ background: "var(--color-sage-soft)" }} />
        <div className="h-8 w-28 rounded-lg" style={{ background: "var(--color-sage-pale)" }} />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 flex items-center gap-4"
            style={{ background: "var(--color-card)" }}
          >
            <div className="w-14 h-14 rounded-full shrink-0" style={{ background: "var(--color-sage-soft)" }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded" style={{ background: "var(--color-sage-pale)" }} />
              <div className="h-3 w-24 rounded" style={{ background: "var(--color-border-soft)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
