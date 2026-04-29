"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { Flame, Heart, Star } from "lucide-react";
import { toggleReaction } from "@/lib/actions/reactions";

type ReactionType = "love" | "made_it" | "favorite";

const REACTION_META: Record<
  ReactionType,
  { Icon: typeof Heart; label: string; activeColor: string }
> = {
  love: { Icon: Heart, label: "Love", activeColor: "#E76F51" },
  made_it: { Icon: Flame, label: "Made it", activeColor: "#D8A053" },
  favorite: { Icon: Star, label: "Favorite", activeColor: "#F2B348" },
};

interface ReactionPillProps {
  type: ReactionType;
  count?: number;
  initialActive?: boolean;
  onToggle?: (active: boolean) => void;
  className?: string;
}

function ReactionPill({
  type,
  count = 0,
  initialActive = false,
  onToggle,
  className,
}: ReactionPillProps) {
  const [active, setActive] = useState(initialActive);
  const [localCount, setLocalCount] = useState(count);
  const meta = REACTION_META[type];
  const Icon = meta.Icon;

  function handleClick() {
    const next = !active;
    setActive(next);
    setLocalCount((c) => c + (next ? 1 : -1));
    onToggle?.(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={`${meta.label}: ${localCount}`}
      className={clsx("reaction-pill", active && "active", className)}
      style={active ? { color: meta.activeColor } : undefined}
    >
      <Icon aria-hidden="true" size={16} fill={active ? "currentColor" : "none"} strokeWidth={1.9} />
      <span className="text-xs font-semibold">{meta.label}</span>
      {localCount > 0 && (
        <span className="text-xs opacity-60 ml-0.5">{localCount}</span>
      )}
    </button>
  );
}

interface ReactionBarProps {
  bookId: string;
  recipeId: string;
  counts: { love: number; made_it: number; favorite: number };
  userReactions: { love: boolean; made_it: boolean; favorite: boolean };
  className?: string;
}

function ReactionBar({
  bookId,
  recipeId,
  counts,
  userReactions,
  className,
}: ReactionBarProps) {
  async function handleToggle(type: ReactionType) {
    await toggleReaction(bookId, recipeId, type);
  }

  return (
    <div className={clsx("flex flex-wrap gap-2", className)}>
      {(["love", "made_it", "favorite"] as ReactionType[]).map((type) => (
        <ReactionPill
          key={type}
          type={type}
          count={counts[type]}
          initialActive={userReactions[type]}
          onToggle={() => handleToggle(type)}
        />
      ))}
    </div>
  );
}

export { ReactionPill, ReactionBar };
export type { ReactionPillProps, ReactionType };
