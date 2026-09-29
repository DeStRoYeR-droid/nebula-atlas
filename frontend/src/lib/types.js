// Nebula types: labels, URL slugs and short explanations.
// Pure module (no React, no browser APIs) so the build step can import it too.

export const TYPE_INFO = [
  {
    slug: 'emission',
    type: 'Emission',
    label: 'Emission nebula',
    plural: 'Emission nebulae',
    description:
      'Clouds of gas, mostly hydrogen, that glow on their own because hot young stars inside them strip electrons from the atoms. That hydrogen light gives them their typical red-pink colour.',
  },
  {
    slug: 'reflection',
    type: 'Reflection',
    label: 'Reflection nebula',
    plural: 'Reflection nebulae',
    description:
      "Dusty clouds that don't shine by themselves but scatter the light of nearby stars. They usually look blue, for the same reason Earth's sky is blue.",
  },
  {
    slug: 'planetary',
    type: 'Planetary',
    label: 'Planetary nebula',
    plural: 'Planetary nebulae',
    description:
      'Glowing shells of gas cast off by Sun-like stars at the end of their lives. The name is historical: through early telescopes their round discs looked like planets.',
  },
  {
    slug: 'supernova-remnant',
    type: 'Supernova remnant',
    label: 'Supernova remnant',
    plural: 'Supernova remnants',
    description:
      'The expanding debris of a star that exploded. The blast wave keeps heating the gas it runs into, so the wreckage glows for thousands of years.',
  },
  {
    slug: 'dark',
    type: 'Dark',
    label: 'Dark nebula',
    plural: 'Dark nebulae',
    description:
      'Dense clouds of cold dust that block the light of whatever lies behind them, showing up as silhouettes against brighter regions of sky.',
  },
];

const BY_SLUG = new Map(TYPE_INFO.map((info) => [info.slug, info]));

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Info for a type slug, or a generic entry for types we have no copy for. */
export function typeInfo(slug) {
  if (BY_SLUG.has(slug)) return BY_SLUG.get(slug);
  const type = slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return { slug, type, label: `${type} nebula`, plural: `${type} nebulae`, description: '' };
}
