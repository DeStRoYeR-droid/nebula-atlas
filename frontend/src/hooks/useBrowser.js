import { useEffect, useState, useSyncExternalStore } from 'react';

/** The value, but only after it has stopped changing for `delay` ms. */
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function mediaQueryStore(query) {
  return {
    subscribe(callback) {
      const list = window.matchMedia(query);
      list.addEventListener('change', callback);
      return () => list.removeEventListener('change', callback);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const reducedMotion = mediaQueryStore('(prefers-reduced-motion: reduce)');

export function usePrefersReducedMotion() {
  return useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, () => false);
}

function subscribeVisibility(callback) {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}

export function usePageVisible() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== 'hidden',
    () => true,
  );
}

/** True while the element is (at least partly) on screen. */
export function useInView(ref) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}
