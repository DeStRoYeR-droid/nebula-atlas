import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../App.jsx';
import { fixtureDocument } from './fixtures.js';

export function jsonResponse(body, init = {}) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init }),
  );
}

/**
 * Render the whole app at `path` with a mocked nebulae.json.
 * `fetchImpl` can replace the default successful response.
 */
export function renderApp(path = '/', { data = fixtureDocument, fetchImpl } = {}) {
  window.history.replaceState(null, '', path);
  const fetchMock = vi.fn(fetchImpl ?? (() => jsonResponse(data)));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  return { user, fetchMock, ...render(<App />) };
}
