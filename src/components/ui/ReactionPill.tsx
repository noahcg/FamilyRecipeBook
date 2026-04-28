"use client";

import { clsx } from "clsx";
import { useState } from "react";

type ReactionType = "love" | "made-it" | "favorite";

const REACTION_META: Record<
  ReactionType,
  { emoji: string; label: string; activeColor: string }
> = {
  love: { emoji: "♥", label: "Love", activeColor: "#E76F51" },
  "made-it": { emoji: "🍳", label: "Made it", activeColor: "#D8A053" },
  favorite: { emoji: "★", label: "Favorite", activeColor: "#F2B348" },
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
      style={
        active
          ? { color: meta.activeColor }
          : undefined
      }
    >
      <span aria-hidden="true" className="text-base leading-none">
        {meta.emoji}
      </span>
      <span className="text-xs font-semibold">{meta.label}</span>
      {localCount > 0 && (
        <span className="text-xs opacity-60 ml-0.5">{localCount}</span>
      )}
    </button>
  );
}

interface ReactionBarProps {
  recipeLoves?: number;
  recipeMadeIts?: number;
  recipeFavorites?: number;
  className?: string;
}

function ReactionBar({
  recipeLoves = 0,
  recipeMadeIts = 0,
  recipeFavorites = 0,
  className,
}: ReactionBarProps) {
  return (
    <div className={clsx("flex flex-wrap gap-2", className)}>
      <ReactionPill type="love" count={recipeLoves} />
      <ReactionPill type="made-it" count={recipeMadeIts} />
      <ReactionPill type="favorite" count={recipeFavorites} />
    </div>
  );
}

export { ReactionPill, ReactionBar };
export type { ReactionPillProps, ReactionType };
