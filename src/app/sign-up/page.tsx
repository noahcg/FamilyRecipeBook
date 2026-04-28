export default function SignUpPage() {
  return (
    <div className="app-paper-bg min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1
          className="text-3xl font-bold text-green-deep text-center mb-2"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Create your recipe book
        </h1>
        <p className="text-center text-ink-muted text-sm mb-8">
          A place for your family&apos;s recipes and memories.
        </p>
        {/* SignUpForm — built in Prompt 03 */}
        <p className="text-center text-ink-muted text-sm">Sign-up form coming soon.</p>
      </div>
    </div>
  );
}
