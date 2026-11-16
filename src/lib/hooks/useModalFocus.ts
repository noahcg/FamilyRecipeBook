"use client";

import { useEffect, type RefObject } from "react";
import { getVisibleFocusable } from "@/lib/a11y";

interface UseModalFocusOptions {
  /** The element whose focusable descendants should be trapped. */
  containerRef: RefObject<HTMLElement | null>;
  /** Whether the modal is currently open. */
  open: boolean;
}

/**
 * Keyboard focus management for modal surfaces (dialogs, drawers).
 *
 * On open it moves focus into the container and remembers what was focused
 * before; while open it traps Tab/Shift+Tab so focus cannot escape to the page
 * behind; on close it restores focus to the original element.
 *
 * Body scroll-lock and Escape-to-close are intentionally left to the caller,
 * which already handles them.
 */
export function useModalFocus({ containerRef, open }: UseModalFocusOptions) {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the modal. Prefer the first focusable control; otherwise
    // make the container itself focusable so screen readers land inside it.
    const [first] = getVisibleFocusable(container);
    if (first) {
      first.focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const candidates = getVisibleFocusable(container).filter((el) => el.tabIndex >= 0);
      // A radio group has one tab stop: the checked radio, or its first option.
      const focusable = candidates.filter((el) => {
        if (!(el instanceof HTMLInputElement) || el.type !== "radio" || !el.name) return true;
        const group = candidates.filter((candidate): candidate is HTMLInputElement =>
          candidate instanceof HTMLInputElement && candidate.type === "radio" && candidate.name === el.name && candidate.form === el.form
        );
        return el === (group.find((candidate) => candidate.checked) ?? group[0]);
      });
      if (focusable.length === 0) {
        // Nothing to tab between — keep focus on the container.
        event.preventDefault();
        container.setAttribute("tabindex", "-1");
        container.focus();
        return;
      }
      // WebKit can skip buttons during native tab navigation, escaping the
      // modal before a boundary-only trap sees the last control. Move focus
      // explicitly so every supported browser stays within the dialog.
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? (index <= 0 ? focusable.length - 1 : index - 1)
        : (index < 0 || index === focusable.length - 1 ? 0 : index + 1);
      event.preventDefault();
      focusable[next].focus();
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      // Restore focus to the trigger when the modal closes/unmounts.
      previouslyFocused?.focus?.();
    };
    // containerRef is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
