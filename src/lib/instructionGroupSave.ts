/** Older atomic save functions silently ignore group_label, so grouped saves
 * require a migration-specific RPC instead of risking a successful data loss. */
export function recipeSaveRpc(instructions?: { group_label?: string | null }[] | null) {
  return instructions?.some((step) => step.group_label?.trim())
    ? "save_recipe_with_instruction_groups"
    : "save_recipe_atomic";
}

export function recipeSaveError(error: { code?: string; message: string } | null, rpc: string, fallback: string) {
  if (rpc === "save_recipe_with_instruction_groups" && error?.code === "PGRST202") {
    return "Instruction headings could not be saved because the database update has not been applied yet. Please try again after the update.";
  }
  return error?.message ?? fallback;
}
