import type { BookRole } from "./types";

export function canManageBook(role: BookRole | null): boolean {
  return role === "keeper";
}

export function canContribute(role: BookRole | null): boolean {
  return role === "keeper" || role === "contributor";
}

export function canView(role: BookRole | null): boolean {
  return role !== null;
}

export function canEditRecipe(
  role: BookRole | null,
  isCreator: boolean
): boolean {
  if (role === "keeper") return true;
  if (role === "contributor" && isCreator) return true;
  return false;
}

export function canDeleteRecipe(
  role: BookRole | null,
  isCreator: boolean
): boolean {
  if (role === "keeper") return true;
  if (isCreator) return true;
  return false;
}

export function canAddStory(role: BookRole | null): boolean {
  return role !== null;
}

export function canReact(role: BookRole | null): boolean {
  return role !== null;
}

export function canManageCollections(role: BookRole | null): boolean {
  return role === "keeper" || role === "contributor";
}

export function canManageMembers(role: BookRole | null): boolean {
  return role === "keeper";
}

export function canCreateInvitation(role: BookRole | null): boolean {
  return role === "keeper";
}
