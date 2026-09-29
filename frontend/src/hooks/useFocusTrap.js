import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function focusableWithin(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter(
    (el) =>
      !el.closest('[inert]') &&
      !el.closest('[hidden]') &&
      // Skips elements hidden with CSS (e.g. a mobile-only button on desktop).
      (typeof el.checkVisibility === 'function' ? el.checkVisibility() : true),
  );
}

/**
 * Keep Tab / Shift+Tab inside `ref` while `active`. The rest of the page is
 * also made `inert` by the caller, so this is a second line of defence.
 */
export function useFocusTrap(ref, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const container = ref.current;
    if (!container) return undefined;

    function onKeyDown(event) {
      if (event.key !== 'Tab') return;
      const items = focusableWithin(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items.at(-1);
      const current = document.activeElement;
      if (event.shiftKey && (current === first || current === container || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ref, active]);
}
