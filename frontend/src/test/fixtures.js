// A small, realistic data set for tests.
const image = (color) => ({
  width: 1280,
  height: 800,
  widths: [320, 640, 1280],
  formats: ['avif', 'webp'],
  placeholder: 'data:image/webp;base64,UklGRg==',
  color,
});

const base = {
  size: 'about 10 light-years across',
  facts: ['A first fact.', 'A second fact.'],
  credits: 'NASA, ESA',
};

export const fixtureNebulae = [
  {
    ...base,
    id: 'orion',
    name: 'Orion Nebula',
    catalog: 'M42',
    nickname: 'Great Orion Nebula',
    type: 'Emission',
    constellation: 'Orion',
    distance: 1300,
    description: 'The closest large stellar nursery to Earth.',
    image_path: 'images/nebulae/orion',
    image_alt: 'Glowing red and blue clouds around bright young stars.',
    image: image('#553344'),
  },
  {
    ...base,
    id: 'eagle',
    name: 'Eagle Nebula',
    catalog: 'M16',
    nickname: 'Pillars of Creation',
    type: 'Emission',
    constellation: 'Serpens',
    distance: 5700,
    description: 'Home of the Pillars of Creation.',
    image_path: 'images/nebulae/eagle',
    image_alt: 'Three tall dark pillars of gas in a blue-green haze.',
    image: image('#224433'),
  },
  {
    ...base,
    id: 'helix',
    name: 'Helix Nebula',
    catalog: 'NGC 7293',
    type: 'Planetary',
    constellation: 'Aquarius',
    distance: 650,
    description: 'A planetary nebula that looks like a giant eye.',
    image_path: 'images/nebulae/helix',
    image_alt: 'A glowing ring of red and blue gas.',
    image: image('#443322'),
  },
  {
    ...base,
    id: 'crab',
    name: 'Crab Nebula',
    catalog: 'M1',
    type: 'Supernova remnant',
    constellation: 'Taurus',
    distance: 6500,
    description: 'The remains of a supernova seen in 1054.',
    image_path: 'images/nebulae/crab',
    image_alt: 'An oval cloud of tangled orange filaments.',
    image: image('#664422'),
  },
  {
    ...base,
    id: 'north-america',
    name: 'North America Nebula',
    catalog: 'NGC 7000',
    type: 'Emission',
    constellation: 'Cygnus',
    distance: 2600,
    description: 'Shaped like the continent.',
    image_path: 'images/nebulae/north-america',
    image_alt: 'Glowing gas crossed by dark lanes of dust.',
    // No generated images yet: exercises the fallback.
  },
];

export const fixtureDocument = { nebulae: fixtureNebulae };
