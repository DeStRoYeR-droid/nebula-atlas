// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fixtureDocument } from '../test/fixtures.js';
import { parseNebulae } from './nebulae.js';
import {
  applyFilters,
  filterByType,
  galleryHref,
  readGalleryParams,
  searchNebulae,
  suggestNebulae,
  typeCounts,
} from './search.js';

const { nebulae } = parseNebulae(fixtureDocument);
const ids = (list) => list.map((n) => n.id);

describe('search', () => {
  it('returns everything for an empty query', () => {
    expect(searchNebulae(nebulae, '')).toBe(nebulae);
    expect(searchNebulae(nebulae, '   ')).toBe(nebulae);
  });

  it('matches names case-insensitively', () => {
    expect(ids(searchNebulae(nebulae, 'EAGLE'))).toEqual(['eagle']);
  });

  it('matches catalogue numbers with or without spaces', () => {
    expect(ids(searchNebulae(nebulae, 'm16'))).toEqual(['eagle']);
    expect(ids(searchNebulae(nebulae, 'ngc 7293'))).toEqual(['helix']);
    expect(ids(searchNebulae(nebulae, 'ngc7293'))).toEqual(['helix']);
  });

  it('matches constellations, nicknames and types', () => {
    expect(ids(searchNebulae(nebulae, 'cygnus'))).toEqual(['north-america']);
    expect(ids(searchNebulae(nebulae, 'pillars'))).toEqual(['eagle']);
    expect(ids(searchNebulae(nebulae, 'supernova'))).toEqual(['crab']);
  });

  it('requires every word to match', () => {
    expect(ids(searchNebulae(nebulae, 'nebula orion'))).toEqual(['orion']);
    expect(searchNebulae(nebulae, 'orion taurus')).toEqual([]);
  });

  it('ignores accents and punctuation', () => {
    expect(ids(searchNebulae(nebulae, 'Órion!'))).toEqual(['orion']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(searchNebulae(nebulae, 'andromeda')).toEqual([]);
  });
});

describe('filtering', () => {
  it('filters by type slug', () => {
    expect(ids(filterByType(nebulae, 'emission'))).toEqual(['orion', 'eagle', 'north-america']);
    expect(ids(filterByType(nebulae, 'planetary'))).toEqual(['helix']);
    expect(filterByType(nebulae, '')).toBe(nebulae);
    expect(filterByType(nebulae, 'dark')).toEqual([]);
  });

  it('combines search and type filters', () => {
    expect(ids(applyFilters(nebulae, { q: 'm', type: 'emission' }))).toEqual(['orion', 'eagle', 'north-america']);
    expect(ids(applyFilters(nebulae, { q: 'm42', type: 'emission' }))).toEqual(['orion']);
    expect(applyFilters(nebulae, { q: 'm42', type: 'planetary' })).toEqual([]);
  });

  it('counts types in first-seen order', () => {
    expect(typeCounts(nebulae)).toEqual([
      { slug: 'emission', count: 3 },
      { slug: 'planetary', count: 1 },
      { slug: 'supernova-remnant', count: 1 },
    ]);
  });
});

describe('gallery URLs', () => {
  it('round-trips search and type through the query string', () => {
    const href = galleryHref({ q: ' crab ', type: 'supernova-remnant' });
    expect(href).toBe('/gallery?type=supernova-remnant&q=crab');
    expect(readGalleryParams(href.split('?')[1])).toEqual({ q: 'crab', type: 'supernova-remnant' });
    expect(galleryHref()).toBe('/gallery');
  });
});

describe('suggestions', () => {
  it('suggests close matches for a mistyped id, ignoring the word "nebula"', () => {
    expect(ids(suggestNebulae(nebulae, 'eagle-nebula-m99'))).toEqual(['eagle']);
    expect(suggestNebulae(nebulae, 'nebula')).toEqual([]);
  });
});
