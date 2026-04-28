export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-paper-bg paper-texture min-h-screen">
      <div className="max-w-lg mx-auto px-5 py-12">{children}</div>
    </div>
  );
}
