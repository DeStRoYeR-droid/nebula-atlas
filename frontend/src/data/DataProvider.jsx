import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DATA_URL } from '../config.js';
import { DataError, parseNebulae } from '../lib/nebulae.js';

const DataContext = createContext(null);

const INITIAL = { status: 'loading', nebulae: [], error: null };

async function loadNebulae(url, signal) {
  // Plain GET with default options, so it reuses the <link rel="preload"> in the page head.
  const response = await fetch(url, { signal });
  if (!response.ok) throw new DataError(`The nebula data could not be loaded (HTTP ${response.status}).`);
  let raw;
  try {
    raw = await response.json();
  } catch {
    throw new DataError('The nebula data is not valid JSON.');
  }
  const { nebulae, skipped } = parseNebulae(raw);
  if (skipped.length && import.meta.env.DEV) {
    console.warn('[nebula-atlas] Skipped invalid entries in nebulae.json:', skipped);
  }
  return nebulae;
}

/** Fetches nebulae.json once (an "AJAX request" for the JSON file) and shares it. */
export function DataProvider({ url = DATA_URL, children }) {
  const [state, setState] = useState(INITIAL);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadNebulae(url, controller.signal).then(
      (nebulae) => setState({ status: 'ready', nebulae, error: null }),
      (error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', nebulae: [], error });
      },
    );
    return () => controller.abort();
  }, [url, attempt]);

  const retry = useCallback(() => {
    setState(INITIAL);
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ ...state, byId: new Map(state.nebulae.map((n) => [n.id, n])), retry }),
    [state, retry],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useNebulae() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useNebulae must be used inside <DataProvider>');
  return context;
}
