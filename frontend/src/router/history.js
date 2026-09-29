// A minimal History API router store (no library needed for five routes).
import { BASE_PATH } from '../config.js';
import { normalizePath, stripBase, withBase } from './routes.js';

const listeners = new Set();
let snapshot = null;
let lastAction = 'LOAD';
let counter = 0;

function read() {
  const { pathname, search, hash } = window.location;
  const state = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
  return {
    pathname: normalizePath(stripBase(pathname, BASE_PATH)),
    search,
    hash,
    state,
    key: state.key ?? 'initial',
  };
}

/** Stable snapshot for useSyncExternalStore: a new object only when the location changes. */
export function getLocation() {
  const next = read();
  if (
    !snapshot ||
    snapshot.pathname !== next.pathname ||
    snapshot.search !== next.search ||
    snapshot.hash !== next.hash ||
    snapshot.key !== next.key
  ) {
    snapshot = next;
  }
  return snapshot;
}

export const getLastAction = () => lastAction;

function emit(action) {
  lastAction = action;
  for (const listener of listeners) listener();
}

const onPopState = () => emit('POP');

export function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('popstate', onPopState);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('popstate', onPopState);
  };
}

export function hrefFor(to) {
  const url = new URL(to, 'https://placeholder.invalid');
  return withBase(normalizePath(url.pathname), BASE_PATH) + url.search + url.hash;
}

/**
 * navigate('/gallery?q=crab') pushes an entry; { replace: true } replaces it.
 * navigate(-1) goes back.
 */
export function navigate(to, { replace = false, state = {} } = {}) {
  if (typeof to === 'number') {
    window.history.go(to);
    return;
  }
  counter += 1;
  const entry = { ...state, key: `${Date.now().toString(36)}${counter}` };
  window.history[replace ? 'replaceState' : 'pushState'](entry, '', hrefFor(to));
  emit(replace ? 'REPLACE' : 'PUSH');
}

/** Tidy the address bar on first load ("/gallery/" -> "/gallery") without a reload. */
export function normalizeInitialUrl() {
  const { pathname, search, hash } = window.location;
  const clean = hrefFor(normalizePath(stripBase(pathname, BASE_PATH)));
  if (clean !== pathname) window.history.replaceState(window.history.state, '', clean + search + hash);
}
