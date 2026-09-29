// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fixtureDocument, fixtureNebulae } from '../test/fixtures.js';
import { DataError, displayTitle, parseNebulae } from './nebulae.js';

describe('parseNebulae', () => {
  it('parses the canonical { nebulae: [...] } document', () => {
    const { nebulae, skipped } = parseNebulae(fixtureDocument);
    expect(skipped).toEqual([]);
    expect(nebulae.map((n) => n.id)).toEqual(['orion', 'eagle', 'helix', 'crab', 'north-america']);
  });

  it('also accepts a bare array', () => {
    expect(parseNebulae(fixtureNebulae).nebulae).toHaveLength(fixtureNebulae.length);
  });

  it('normalises fields and derives helpers', () => {
    const [orion] = parseNebulae(fixtureDocument).nebulae;
    expect(orion).toMatchObject({
      id: 'orion',
      shortName: 'Orion',
      typeSlug: 'emission',
      typeLabel: 'Emission nebula',
      imagePath: 'images/nebulae/orion',
      imageAlt: 'Glowing red and blue clouds around bright young stars.',
    });
    expect(orion.image.widths).toEqual([320, 640, 1280]);
    expect(displayTitle(orion)).toBe('Orion Nebula (M42)');
  });

  it('gives supernova remnants a readable label and slug', () => {
    const crab = parseNebulae(fixtureDocument).nebulae.find((n) => n.id === 'crab');
    expect(crab.typeSlug).toBe('supernova-remnant');
    expect(crab.typeLabel).toBe('Supernova remnant');
  });

  it('treats missing or malformed image metadata as "no image"', () => {
    const [entry] = fixtureNebulae;
    const broken = { ...entry, image: { width: 'wide', height: 10, widths: [320], formats: ['webp'] } };
    expect(parseNebulae([broken]).nebulae[0].image).toBeNull();
    expect(parseNebulae([{ ...entry, image: undefined }]).nebulae[0].image).toBeNull();
  });

  it('skips invalid entries and duplicates instead of failing', () => {
    const [orion, eagle] = fixtureNebulae;
    const { nebulae, skipped } = parseNebulae([
      orion,
      { ...eagle, id: 'Not A Slug' },
      { ...eagle, name: '' },
      { ...eagle, distance: -1 },
      { ...orion },
      null,
    ]);
    expect(nebulae.map((n) => n.id)).toEqual(['orion']);
    expect(skipped.map((s) => s.reason)).toEqual([
      'missing or invalid "id"',
      'missing "name"',
      'missing or invalid "distance"',
      'duplicate id "orion"',
      'not an object',
    ]);
  });

  it('rejects documents without a list of nebulae', () => {
    expect(() => parseNebulae({ items: [] })).toThrow(DataError);
    expect(() => parseNebulae('nope')).toThrow(DataError);
  });
});
