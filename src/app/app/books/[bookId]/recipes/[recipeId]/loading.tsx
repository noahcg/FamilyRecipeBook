export default function RecipeLoading() {
  return (
    <div className="animate-pulse">
      <div className="w-full aspect-video" style={{ background: "var(--color-sage-pale)" }} />
      <div className="px-5 pt-5 space-y-4">
        <div className="h-8 w-3/4 rounded-lg" style={{ background: "var(--color-sage-soft)" }} />
        <div className="h-4 w-1/3 rounded" style={{ background: "var(--color-sage-pale)" }} />
        <div className="h-24 rounded-lg" style={{ background: "var(--color-paper-warm)" }} />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-5 rounded" style={{ background: "var(--color-sage-pale)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
