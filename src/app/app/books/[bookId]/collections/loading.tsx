export default function CollectionsLoading() {
  return (
    <div className="px-5 pt-5 pb-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-36 rounded-lg" style={{ background: "var(--color-sage-soft)" }} />
        <div className="h-8 w-20 rounded-lg" style={{ background: "var(--color-sage-pale)" }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: "var(--color-card)", height: 72 }}
          />
        ))}
      </div>
    </div>
  );
}
