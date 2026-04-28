import { clsx } from "clsx";
import { Pencil } from "lucide-react";

interface RecipeStoryNoteProps {
  story: string;
  author?: string;
  className?: string;
}

function RecipeStoryNote({ story, author, className }: RecipeStoryNoteProps) {
  return (
    <div className={clsx("story-note relative", className)}>
      <Pencil
        size={14}
        strokeWidth={1.75}
        className="absolute top-3 right-3 opacity-30"
        style={{ color: "var(--color-cinnamon)" }}
      />
      <p className="pr-5">{story}</p>
      {author && (
        <p
          className="mt-2 text-sm opacity-70"
          style={{ fontFamily: "var(--font-caveat)" }}
        >
          — {author}
        </p>
      )}
    </div>
  );
}

export { RecipeStoryNote };
export type { RecipeStoryNoteProps };
