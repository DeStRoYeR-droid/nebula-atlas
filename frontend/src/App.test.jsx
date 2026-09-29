import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fixtureDocument } from './test/fixtures.js';
import { jsonResponse, renderApp } from './test/renderApp.jsx';

const dialog = () => screen.findByRole('dialog', {}, { timeout: 3000 });
const currentPath = () => window.location.pathname + window.location.search;

describe('loading, empty and error states', () => {
  it('shows a loading state until the data arrives, then the puzzle', async () => {
    let resolve;
    renderApp('/', { fetchImpl: () => new Promise((r) => (resolve = r)) });
    expect(screen.getByRole('heading', { level: 1, name: /explore the cosmos/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading nebulae/i);

    await act(async () => resolve(await jsonResponse(fixtureDocument)));
    const puzzle = await screen.findByRole('list', { name: 'Nebula puzzle' });
    expect(within(puzzle).getAllByRole('link')).toHaveLength(5);
    expect(within(puzzle).getByRole('link', { name: 'Eagle Nebula' })).toHaveAttribute('href', '/nebula/eagle');
  });

  it('shows an error with a working retry when the data cannot load', async () => {
    let calls = 0;
    const { user } = renderApp('/', {
      fetchImpl: () =>
        calls++ === 0 ? Promise.resolve(new Response('oops', { status: 500 })) : jsonResponse(fixtureDocument),
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/couldn’t load/i);
    expect(alert).toHaveTextContent(/HTTP 500/);

    await user.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('list', { name: 'Nebula puzzle' })).toBeInTheDocument();
  });

  it('shows an empty state when the atlas has no nebulae', async () => {
    renderApp('/gallery', { data: { nebulae: [] } });
    expect(await screen.findByRole('heading', { name: /the atlas is empty/i })).toBeInTheDocument();
  });

  it('falls back gracefully when an image is missing or fails to load', async () => {
    renderApp('/gallery');
    // No generated image at all:
    expect(
      await screen.findByRole('img', { name: /glowing gas crossed by dark lanes of dust\. \(image unavailable\)/i }),
    ).toBeInTheDocument();
    // An image that errors while loading:
    const eagle = screen.getByAltText('Three tall dark pillars of gas in a blue-green haze.');
    expect(eagle).toHaveAttribute('width', '1280');
    expect(eagle).toHaveAttribute('height', '800');
    fireEvent.error(eagle);
    expect(
      await screen.findByRole('img', { name: /three tall dark pillars .* \(image unavailable\)/i }),
    ).toBeInTheDocument();
  });
});

describe('routing', () => {
  it('opens a nebula straight from its URL', async () => {
    renderApp('/nebula/eagle');
    const modal = await dialog();
    expect(within(modal).getByRole('heading', { level: 2, name: 'Eagle Nebula (M16)' })).toBeInTheDocument();
    expect(within(modal).getByText('Serpens')).toBeInTheDocument();
    expect(document.title).toBe('Eagle Nebula (M16) · Nebula Atlas');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:5173/nebula/eagle',
    );
  });

  it('shows the 404 page for an unknown nebula id, with suggestions', async () => {
    renderApp('/nebula/eagel-m16');
    expect(await screen.findByRole('heading', { level: 1, name: /404 nebula not found/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Eagle Nebula' })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex'));
  });

  it('shows the 404 page for unknown routes', async () => {
    renderApp('/no/such/page');
    expect(await screen.findByRole('heading', { level: 1, name: /404 lost in space/i })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(main).getByRole('link', { name: /browse the gallery/i })).toHaveAttribute('href', '/gallery');
  });

  it('marks the active page in the navigation', async () => {
    const { user } = renderApp('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(nav).getByRole('link', { name: 'Gallery' }));
    expect(await screen.findByRole('heading', { level: 1, name: /nebula gallery/i })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Gallery' })).toHaveAttribute('aria-current', 'page');
    expect(currentPath()).toBe('/gallery');
  });
});

describe('the nebula dialog', () => {
  it('opens from a tile, closes with Escape and returns focus to the tile', async () => {
    const { user } = renderApp('/');
    const tile = await screen.findByRole('link', { name: 'Eagle Nebula' });
    await user.click(tile);

    const modal = await dialog();
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(currentPath()).toBe('/nebula/eagle');
    // The page behind is inert while the dialog is open.
    expect(screen.getByRole('main', { hidden: true }).closest('[inert]')).not.toBeNull();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(currentPath()).toBe('/');
    await waitFor(() => expect(screen.getByRole('link', { name: 'Eagle Nebula' })).toHaveFocus());
  });

  it('closes with the close button', async () => {
    const { user } = renderApp('/nebula/helix');
    const modal = await dialog();
    await user.click(within(modal).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(currentPath()).toBe('/gallery');
  });

  it('moves between nebulae with the previous/next buttons and wraps around', async () => {
    const { user } = renderApp('/nebula/orion');
    const modal = await dialog();
    await user.click(within(modal).getByRole('link', { name: 'Next: Eagle Nebula' }));
    expect(await within(modal).findByRole('heading', { name: 'Eagle Nebula (M16)' })).toBeInTheDocument();
    expect(currentPath()).toBe('/nebula/eagle');

    await user.click(within(modal).getByRole('link', { name: 'Previous: Orion Nebula' }));
    await user.click(within(modal).getByRole('link', { name: 'Previous: North America Nebula' }));
    expect(await within(modal).findByRole('heading', { name: 'North America Nebula (NGC 7000)' })).toBeInTheDocument();
  });

  it('supports the arrow keys', async () => {
    const { user } = renderApp('/nebula/eagle');
    await dialog();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(currentPath()).toBe('/nebula/helix'));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    await waitFor(() => expect(currentPath()).toBe('/nebula/orion'));
  });

  it('follows the filtered gallery list it was opened from', async () => {
    const { user } = renderApp('/gallery?type=emission');
    await user.click(await screen.findByRole('link', { name: 'Eagle Nebula' }));
    const modal = await dialog();
    // Helix (planetary) is skipped because the gallery was filtered to emission nebulae.
    expect(within(modal).getByRole('link', { name: 'Next: North America Nebula' })).toBeInTheDocument();
  });

  it('traps keyboard focus inside the dialog', async () => {
    const { user } = renderApp('/nebula/orion');
    const modal = await dialog();
    await waitFor(() => expect(modal).toHaveFocus());
    for (let i = 0; i < 25; i += 1) {
      await user.tab();
      expect(modal.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 10; i += 1) {
      await user.tab({ shift: true });
      expect(modal.contains(document.activeElement)).toBe(true);
    }
  });
});

describe('gallery search and filtering', () => {
  it('debounces the search, updates the URL and shows matching nebulae', async () => {
    const { user } = renderApp('/gallery');
    expect(await screen.findAllByRole('article')).toHaveLength(5);

    await user.type(screen.getByRole('searchbox', { name: 'Search nebulae' }), 'ngc 7293');
    expect(currentPath()).toBe('/gallery'); // not yet: debounced
    await waitFor(() => expect(currentPath()).toBe('/gallery?q=ngc+7293'));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    expect(screen.getByRole('heading', { name: /helix nebula/i })).toBeInTheDocument();
  });

  it('shows a helpful message when nothing matches, and can clear it', async () => {
    const { user } = renderApp('/gallery?q=andromeda');
    expect(await screen.findByRole('heading', { name: 'No nebulae match “andromeda”' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear search and filters/i }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(5));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('filters by nebula type', async () => {
    const { user } = renderApp('/gallery');
    const group = await screen.findByRole('group', { name: 'Filter by type' });
    await user.click(within(group).getByRole('button', { name: /planetary nebulae/i }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    expect(within(group).getByRole('button', { name: /planetary nebulae/i })).toHaveAttribute('aria-pressed', 'true');
    expect(currentPath()).toBe('/gallery?type=planetary');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Planetary nebulae');

    await user.click(within(group).getByRole('button', { name: /^all/i }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(5));
  });
});
