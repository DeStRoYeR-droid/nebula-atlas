// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { matchRoute, nebulaPath, normalizePath, stripBase, withBase } from './routes.js';

describe('routes', () => {
  it('matches the static pages', () => {
    expect(matchRoute('/').name).toBe('home');
    expect(matchRoute('/gallery').name).toBe('gallery');
    expect(matchRoute('/discover').name).toBe('discover');
    expect(matchRoute('/contact').name).toBe('contact');
  });

  it('matches nebula pages and extracts the id', () => {
    expect(matchRoute('/nebula/eagle')).toEqual({ name: 'nebula', params: { id: 'eagle' } });
    expect(matchRoute(nebulaPath('north-america'))).toEqual({ name: 'nebula', params: { id: 'north-america' } });
  });

  it('sends anything else to the 404 route', () => {
    expect(matchRoute('/nebula').name).toBe('notFound');
    expect(matchRoute('/nebula/eagle/extra').name).toBe('notFound');
    expect(matchRoute('/galaxies').name).toBe('notFound');
  });

  it('tolerates trailing slashes, doubled slashes and .html (as served by GitHub Pages)', () => {
    expect(normalizePath('/gallery/')).toBe('/gallery');
    expect(normalizePath('//nebula//eagle')).toBe('/nebula/eagle');
    expect(normalizePath('/gallery.html')).toBe('/gallery');
    expect(normalizePath('/index.html')).toBe('/');
    expect(matchRoute('/nebula/eagle.html').params.id).toBe('eagle');
  });

  it('handles the GitHub project-pages base path', () => {
    const base = '/nebula-atlas/';
    expect(stripBase('/nebula-atlas/gallery', base)).toBe('/gallery');
    expect(stripBase('/nebula-atlas', base)).toBe('/');
    expect(stripBase('/nebula-atlas/', base)).toBe('/');
    expect(withBase('/', base)).toBe('/nebula-atlas/');
    expect(withBase('/nebula/eagle', base)).toBe('/nebula-atlas/nebula/eagle');
    expect(withBase('/gallery', '/')).toBe('/gallery');
  });
});
