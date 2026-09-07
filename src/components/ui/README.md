# Home Cooked UI Library

This directory is the canonical UI library for Home Cooked. The visual catalog lives at `/dev/ui` in development; it is intentionally unavailable in production. It renders every public visual permutation of each shared primitive, not just a representative sample.

## Before creating or changing UI

1. Check `registry.ts` and `/dev/ui` for a matching primitive or pattern.
2. Import shared primitives from `@/components/ui`, not from individual source files.
3. Compose existing primitives before creating a new one. A screen-specific composition belongs with its feature, not in this directory.
4. Add a primitive only when the same accessible behavior and visual treatment will be used in more than one feature. Update `registry.ts`, this guide, and every relevant state in the visual catalog in the same change.
5. Preserve the existing semantic tokens from `src/app/globals.css`; do not introduce one-off colors, radii, shadows, or control styles for normal product UI.

## Visual language

- **Tone:** warm, calm, practical, and family-centered. Paper surfaces, restrained warmth, generous whitespace.
- **Color:** deep green is the primary action and heading color. Terracotta is warm emphasis. `danger` is reserved for errors and destructive actions. Use CSS/Tailwind semantic tokens rather than raw hex values.
- **Type:** Playfair Display is for page-level and meaningful content headings. Nunito is for navigation, labels, body copy, controls, and dense product UI.
- **Shape:** use the provided radius tokens. Keep cards modestly rounded; use pills only for compact labels or circular controls.
- **Motion:** transitions should clarify feedback, not decorate. Hover lift is only for genuinely clickable cards.

## Component rules

| Need | Use | Rule |
| --- | --- | --- |
| Primary or supporting action | `Button` | One clear `primary` action per context. Use `secondary` or `ghost` for supporting actions; `danger` only for destructive actions. |
| One-line value | `Input` | Always provide a visible `label`, unless an accessible label is the better pattern. Use `hint` or `error`, not both. |
| Long-form value | `Textarea` | Use for descriptions, memories, notes, and instructions. |
| One known choice | `Select` | Use the native select primitive rather than styling `<select>` inline. |
| Static grouped content | `Card` | Do not make it appear clickable unless it is clickable. |
| Recipe in a collection | `RecipeCard` | Use only for recipe browsing/search contexts. |
| Compact status or role | `Badge` | Keep labels short; badges do not replace instructions or validation. |
| Recipe response | `ReactionPill` / `ReactionBar` | Use the love, made-it, and favorite vocabulary; do not introduce an ad hoc reaction treatment. |
| Blank content area | `EmptyState` | State what is missing, why it matters, and one useful next step. |
| Interrupting task or confirmation | `Dialog` | Confirm consequential/destructive actions here. Keep a safe escape route. |
| Secondary side task | `Drawer` | Prefer a drawer when context should remain visible and the task is not a blocking decision. |
| Cookbook cover | `BookCoverArt` | Use the controlled cover palette from `lib/bookCovers`; never draw a one-off cover treatment. |
| Cookbook icon | `CookbookIcon` | Choose from `cookbookIconOptions`; the larger `cookbookIconCatalog` also renders legacy values. |
| Compact people display | `MemberAvatarStack` | Use for members, overflow, and an optional share action. |
| Recipe memory | `RecipeStoryNote` | Use for a personal recipe story or memory, not general page copy. |
| Product mark | `BrandLockup` | Use the default or `compact` size; do not recreate the logo as text. |
| Compact tab navigation | `BottomNav` | Use its five mutually exclusive active states as a single navigation object. |

## Accessibility is part of the primitive

- Use native controls for button, input, textarea, and select behavior.
- Keep visible labels connected to controls. Use `aria-label` only when a visible label would be redundant.
- Error copy must explain how to recover; never rely on color alone.
- `Dialog` and `Drawer` manage focus, Escape, and scroll locking. Do not recreate those behaviors in feature code.
- Use `focus-visible` states already supplied by the system and maintain 44px-or-larger touch targets for standalone controls.

## AI implementation brief

When asked to create UI in this project, follow this contract:

> First inspect `src/components/ui/registry.ts`, this guide, and the closest existing feature. Use `@/components/ui` primitives and semantic Tailwind tokens. Do not create a bespoke button, field, dialog, card treatment, raw color, or shadow when a shared pattern exists. Add a reusable primitive only for a repeated cross-feature behavior; document it in the registry and `/dev/ui` catalog. Include loading, empty, error, success, keyboard, and mobile states appropriate to the interaction.

## Validation

After a library change, run `npm run lint`, `npm run build`, and inspect `/dev/ui` at mobile and desktop widths. Test dialogs and drawers with keyboard navigation, Escape, and a narrow viewport.
