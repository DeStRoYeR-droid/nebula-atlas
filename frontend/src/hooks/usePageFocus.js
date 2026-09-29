import { useEffect } from 'react';
import { getLastAction } from '../router/history.js';

let firstPageShown = false;

/**
 * After client-side navigation, move keyboard/screen-reader focus to the new
 * page's <h1 id="page-title"> so the change is announced. Skipped on first load.
 */
export function usePageFocus() {
  useEffect(() => {
    if (!firstPageShown || getLastAction() === 'LOAD') {
      firstPageShown = true;
      return;
    }
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, []);
}
