import { clsx } from "clsx";
import type { MemberWithProfile } from "@/lib/types";

interface MemberProfileCardProps {
  member: MemberWithProfile;
  recipeCount?: number;
  className?: string;
}

const ROLE_LABEL: Record<string, string> = {
  keeper: "Keeper",
  contributor: "Contributor",
  family: "Family",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MemberProfileCard({
  member,
  recipeCount,
  className,
}: MemberProfileCardProps) {
  const profile = member.profile;

  return (
    <div className={clsx("recipe-card p-5 flex items-start gap-4", className)}>
      {/* Avatar */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
        style={{ background: "var(--color-sage-soft)", color: "var(--color-deep-green)" }}
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? "Member"}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getInitials(profile.full_name)
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className="font-bold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {profile.full_name ?? "Family member"}
          </h3>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-pill"
            style={{
              background: "var(--color-sage-pale)",
              color: "var(--color-deep-green)",
            }}
          >
            {ROLE_LABEL[member.role] ?? member.role}
          </span>
        </div>

        {profile.known_for && (
          <p className="text-sm text-ink-muted mt-0.5 italic">
            Known for: {profile.known_for}
          </p>
        )}

        {recipeCount != null && (
          <p className="text-xs text-ink-soft mt-1">
            {recipeCount} recipe{recipeCount !== 1 ? "s" : ""} added
          </p>
        )}
      </div>
    </div>
  );
}
