/**
 * Machine-readable inventory of the supported Home Cooked UI building blocks.
 * Keep this list current whenever a component is added, renamed, or retired.
 */
export const UI_LIBRARY = [
  {
    name: "Button",
    importName: "Button",
    source: "src/components/ui/Button.tsx",
    useWhen: "An action submits, saves, starts, or confirms work.",
  },
  {
    name: "Input",
    importName: "Input",
    source: "src/components/ui/Input.tsx",
    useWhen: "A person enters one short value.",
  },
  {
    name: "Textarea",
    importName: "Textarea",
    source: "src/components/ui/Textarea.tsx",
    useWhen: "A person enters a longer note, memory, or description.",
  },
  {
    name: "Select",
    importName: "Select",
    source: "src/components/ui/Select.tsx",
    useWhen: "A person chooses one known option from a compact list.",
  },
  {
    name: "Card",
    importName: "Card",
    source: "src/components/ui/Card.tsx",
    useWhen: "Related content needs a quiet, static surface.",
  },
  {
    name: "RecipeCard",
    importName: "RecipeCard",
    source: "src/components/ui/RecipeCard.tsx",
    useWhen: "Showing a recipe in a collection or search result.",
  },
  {
    name: "Badge",
    importName: "Badge",
    source: "src/components/ui/Badge.tsx",
    useWhen: "A compact role, category, or status label is needed.",
  },
  {
    name: "EmptyState",
    importName: "EmptyState",
    source: "src/components/ui/EmptyState.tsx",
    useWhen: "A list or section has no content and needs a clear next step.",
  },
  {
    name: "Dialog",
    importName: "Dialog",
    source: "src/components/ui/Dialog.tsx",
    useWhen: "An interrupting confirmation or focused task needs attention.",
  },
  {
    name: "Drawer",
    importName: "Drawer",
    source: "src/components/ui/Drawer.tsx",
    useWhen: "A secondary mobile-friendly task belongs beside the current page.",
  },
  {
    name: "SectionHeader",
    importName: "SectionHeader",
    source: "src/components/ui/SectionHeader.tsx",
    useWhen: "A content section needs a heading, context, and optional action.",
  },
  {
    name: "BrandLockup",
    importName: "BrandLockup",
    source: "src/components/ui/BrandLockup.tsx",
    useWhen: "A Home Cooked brand mark is needed in app chrome or an entry screen.",
  },
  {
    name: "BookCoverArt",
    importName: "BookCoverArt",
    source: "src/components/ui/BookCoverArt.tsx",
    useWhen: "Displaying a cookbook cover with the shared art treatment.",
  },
  {
    name: "CookbookIcon",
    importName: "CookbookIcon",
    source: "src/components/ui/CookbookIcon.tsx",
    useWhen: "Displaying the controlled cookbook icon vocabulary.",
  },
  {
    name: "MemberAvatarStack",
    importName: "MemberAvatarStack",
    source: "src/components/ui/MemberAvatarStack.tsx",
    useWhen: "Showing cookbook members compactly, with optional overflow or invite action.",
  },
  {
    name: "ReactionPill",
    importName: "ReactionPill",
    source: "src/components/ui/ReactionPill.tsx",
    useWhen: "Offering a compact love, made-it, or favorite response on a recipe.",
  },
  {
    name: "RecipeStoryNote",
    importName: "RecipeStoryNote",
    source: "src/components/ui/RecipeStoryNote.tsx",
    useWhen: "Displaying the personal story or memory attached to a recipe.",
  },
  {
    name: "BottomNav",
    importName: "BottomNav",
    source: "src/components/ui/BottomNav.tsx",
    useWhen: "Rendering the legacy compact tab navigation pattern.",
  },
] as const;

export type UiLibraryItem = (typeof UI_LIBRARY)[number];
