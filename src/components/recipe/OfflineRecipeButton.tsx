"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import {
  isRecipeSavedOffline,
  removeRecipeOffline,
  saveRecipeOffline,
} from "@/lib/offlineRecipes";
import type { RecipeWithRelations } from "@/lib/types";

interface OfflineRecipeButtonProps {
  recipe: RecipeWithRelations;
  bookId: string;
  userId: string;
  variant?: "header" | "menu";
  className?: string;
}

export function OfflineRecipeButton({
  recipe,
  bookId,
  userId,
  variant = "header",
  className,
}: OfflineRecipeButtonProps) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    isRecipeSavedOffline(recipe.id, userId)
      .then((isSaved) => {
        if (active) setSaved(isSaved);
      })
      .catch(() => {
        if (active) setSaved(false);
      });

    return () => {
      active = false;
    };
  }, [recipe.id, userId]);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        if (saved) {
          await removeRecipeOffline(recipe.id, userId);
          setSaved(false);
          setMessage("Removed from offline recipes.");
          return;
        }

        await saveRecipeOffline(recipe, bookId, userId);
        setSaved(true);
        setMessage("Saved for offline viewing.");
      } catch {
        setMessage("Could not update offline recipes on this device.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={clsx(
          variant === "menu"
            ? "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-green-pale disabled:opacity-65"
            : "inline-flex h-10 items-center gap-2 rounded-full border border-white/35 bg-white-soft/88 px-3 text-sm font-extrabold text-green-deep shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition hover:bg-white-soft disabled:opacity-65",
          className
        )}
      >
        {saved ? (
          <Trash2
            size={variant === "menu" ? 15 : 16}
            strokeWidth={1.9}
            className={variant === "menu" ? "text-ink-soft" : undefined}
          />
        ) : (
          <Download
            size={variant === "menu" ? 15 : 16}
            strokeWidth={1.9}
            className={variant === "menu" ? "text-ink-soft" : undefined}
          />
        )}
        <span className={clsx(variant === "header" && "hidden sm:inline")}>
          {isPending ? "Saving" : saved ? "Saved offline" : "Save offline"}
        </span>
      </button>
      {message && (
        <div className="fixed bottom-5 right-5 z-[100] w-[min(calc(100vw-2.5rem),360px)] rounded-xl border border-green-deep/20 bg-green-forest-dark px-4 py-3 text-sm font-bold text-ink-inverse shadow-[0_18px_44px_rgba(31,58,45,0.28)]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white-soft/14 text-green-soft">
              <Download size={17} />
            </span>
            <p className="min-w-0 flex-1 leading-snug">{message}</p>
          </div>
        </div>
      )}
    </>
  );
}
