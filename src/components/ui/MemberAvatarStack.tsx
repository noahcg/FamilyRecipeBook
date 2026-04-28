import { clsx } from "clsx";
import { Plus } from "lucide-react";

interface Member {
  id: string;
  name: string;
  avatarUrl?: string;
  initials?: string;
}

const AVATAR_COLORS = [
  { bg: "#DDE7D7", text: "#2F4F3F" },
  { bg: "#F7EEDC", text: "#8D5E34" },
  { bg: "#EEF4EA", text: "#234436" },
  { bg: "#F2E8D8", text: "#B8754B" },
  { bg: "#DDE7D7", text: "#557A55" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface MemberAvatarStackProps {
  members: Member[];
  maxVisible?: number;
  size?: "sm" | "md";
  showAddButton?: boolean;
  onAddMember?: () => void;
  className?: string;
}

function MemberAvatarStack({
  members,
  maxVisible = 4,
  size = "md",
  showAddButton = false,
  onAddMember,
  className,
}: MemberAvatarStackProps) {
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;

  const avatarSize = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const overlapClass = size === "sm" ? "-ml-2" : "-ml-2.5";

  return (
    <div
      className={clsx("flex items-center", className)}
      aria-label={`${members.length} member${members.length !== 1 ? "s" : ""}`}
    >
      {visible.map((member, i) => {
        const colorSet = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const initials = member.initials ?? getInitials(member.name);

        return (
          <div
            key={member.id}
            title={member.name}
            className={clsx(
              "rounded-full border-2 border-paper flex items-center justify-center shrink-0 font-bold overflow-hidden",
              avatarSize,
              i > 0 && overlapClass
            )}
            style={{ background: colorSet.bg, color: colorSet.text }}
          >
            {member.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        );
      })}

      {overflow > 0 && (
        <div
          className={clsx(
            "rounded-full border-2 border-paper flex items-center justify-center shrink-0 font-semibold text-ink-muted",
            avatarSize,
            overlapClass
          )}
          style={{ background: "var(--color-border-soft)" }}
          aria-label={`${overflow} more member${overflow !== 1 ? "s" : ""}`}
        >
          <span className="text-xs">+{overflow}</span>
        </div>
      )}

      {showAddButton && (
        <button
          type="button"
          onClick={onAddMember}
          aria-label="Add someone to this book"
          className={clsx(
            "rounded-full border-2 border-dashed border-line flex items-center justify-center shrink-0 text-ink-soft",
            "hover:border-green-sage hover:text-green-sage transition-colors",
            "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
            avatarSize,
            members.length > 0 && overlapClass
          )}
          style={{ background: "var(--color-paper-soft)" }}
        >
          <Plus size={size === "sm" ? 12 : 14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export { MemberAvatarStack };
export type { MemberAvatarStackProps, Member };
