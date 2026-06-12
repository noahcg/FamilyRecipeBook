/**
 * CSS selector matching elements that can hold keyboard focus.
 *
 * Shared so the skip link (which jumps to the first control in <main>) and the
 * modal focus trap agree on what "focusable" means. Excludes elements that opt
 * out of tab order via tabindex="-1".
 */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Returns the focusable descendants of `container` that are actually rendered.
 *
 * Responsive-hidden controls (display:none) match the selector but cannot
 * receive focus — `.focus()` is a no-op on them — so they are filtered out.
 */
export function getVisibleFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (el) =>
      el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
  );
}
