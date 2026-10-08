import { clsx } from "clsx";
import { useAccount } from "@/lib/context/AccountContext";
import { displayRecipeTemperatures } from "@/lib/metricUnits";
import type { RecipeInstruction } from "@/lib/types";

interface InstructionListProps {
  instructions: RecipeInstruction[];
  className?: string;
}

export function InstructionList({ instructions, className }: InstructionListProps) {
  const { metricUnits } = useAccount();
  return (
    <ol className={clsx("space-y-4", className)}>
      {instructions.map((step) => (
        <li key={step.id} className="flex gap-4">
          <span
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-ink-inverse mt-0.5"
            style={{ background: "var(--color-deep-green)" }}
          >
            {step.position}
          </span>
          <p className="text-sm leading-relaxed text-ink pt-1">{displayRecipeTemperatures(step.body, metricUnits)}</p>
        </li>
      ))}
    </ol>
  );
}
