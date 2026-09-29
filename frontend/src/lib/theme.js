// Light / dark theme. The initial class is set by a tiny inline script in
// index.html (before first paint, so there is no flash); this module keeps it
// in sync afterwards.
import { useSyncExternalStore } from 'react';

export const THEME_STORAGE_KEY = 'nebula-atlas:theme';
const listeners = new Set();

const root = () => document.documentElement;
export const getTheme = () => (root().classList.contains('dark') ? 'dark' : 'light');

function apply(theme) {
  root().classList.toggle('dark', theme === 'dark');
  root().style.colorScheme = theme;
  for (const listener of listeners) listener();
}

function storedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or storage disabled: the choice still applies to this visit.
  }
  apply(theme);
}

function subscribe(listener) {
  listeners.add(listener);
  // Follow the operating system until the visitor picks a theme themselves.
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const onSystemChange = (event) => {
    if (!storedTheme()) apply(event.matches ? 'light' : 'dark');
  };
  media.addEventListener('change', onSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', onSystemChange);
  };
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => 'dark');
}
