import Link from "next/link";
import { notFound } from "next/navigation";

const VARIANTS = [
  {
    slug: "unavailable",
    label: "Invitation no longer valid",
    description: "Generic invalid / not-found invitation link.",
  },
  {
    slug: "expired",
    label: "Invitation expired",
    description: "Token exists but is past its expiry date.",
  },
  {
    slug: "accepted",
    label: "Invitation already accepted",
    description: "Token has already been used.",
  },
  {
    slug: "wrong-account",
    label: "Wrong account",
    description: "Signed in as a different email than the invitation.",
  },
  {
    slug: "signed-out",
    label: "Signed-out CTA",
    description: "Valid invite, user not signed in.",
  },
] as const;

export default function InvitePreviewIndex() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="app-paper-bg paper-texture min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1
          className="text-3xl font-bold text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Invite page previews
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Dev-only previews of the <code>/invite/[token]</code> states. Available in non-production builds.
        </p>

        <ul className="mt-6 space-y-3">
          {VARIANTS.map((v) => (
            <li key={v.slug}>
              <Link
                href={`/dev/invite-preview/${v.slug}`}
                className="block rounded-lg border border-line bg-card p-4 transition hover:bg-white-soft"
              >
                <p className="font-bold text-green-deep">{v.label}</p>
                <p className="mt-1 text-sm text-ink-muted">{v.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
