"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui";
import { setHomeRecipe } from "@/lib/actions/homeRecipe";

export function HomeRecipeButton({ recipeId, initialPinned }: { recipeId: string; initialPinned: boolean }) {
  const [pinned, setPinned] = useState(initialPinned);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    setMessage(null);
    startTransition(async () => {
      const result = await setHomeRecipe(recipeId, !pinned);
      if (!result.success) { setMessage(result.error); return; }
      setPinned(!pinned);
      setMessage(pinned ? "Removed from your home page." : "Pinned to your home page.");
      router.refresh();
    });
  }

  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={toggle} loading={pending}>
        {pinned ? <PinOff size={16} /> : <Pin size={16} />}
        {pinned ? "Remove from home" : "Pin to my home"}
      </Button>
      {message && <p role="status" className="mt-1 text-sm text-ink-muted">{message}</p>}
    </div>
  );
}
