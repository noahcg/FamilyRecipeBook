export default function SettingsLoading() {
  return (
    <div className="px-5 pt-6 pb-10 animate-pulse">
      <div className="h-7 w-24 rounded-lg mb-6" style={{ background: "var(--color-sage-soft)" }} />
      <div className="rounded-xl p-5 mb-6" style={{ background: "var(--color-card)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full shrink-0" style={{ background: "var(--color-sage-soft)" }} />
          <div className="space-y-2">
            <div className="h-5 w-32 rounded" style={{ background: "var(--color-sage-pale)" }} />
            <div className="h-3 w-48 rounded" style={{ background: "var(--color-border-soft)" }} />
          </div>
        </div>
      </div>
      <div className="h-10 rounded-lg" style={{ background: "var(--color-sage-pale)" }} />
    </div>
  );
}
