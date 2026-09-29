// Page metadata (title, description, canonical URL, Open Graph, Twitter card).
// Pure module: the build step uses it to write static HTML for each route, and
// the app uses it to keep <head> in sync during client-side navigation.
import { displayTitle } from '../lib/nebulae.js';
import { formatDistance, truncate } from '../lib/format.js';
import { typeInfo } from '../lib/types.js';

export const SITE = {
  name: 'Nebula Atlas',
  description:
    "An interactive atlas of the universe's most breathtaking nebulae: emission, reflection and planetary nebulae and supernova remnants, in Hubble, Webb and observatory imagery.",
  themeColor: '#05070f',
  locale: 'en_US',
  image: 'og-image.jpg',
  imageAlt: 'A mosaic of colourful nebulae behind the words Nebula Atlas.',
};

export const pageMeta = {
  home: () => ({
    title: 'Nebula Atlas · Explore the cosmos',
    description: SITE.description,
    path: '/',
  }),
  gallery: ({ type } = {}) => {
    const info = type ? typeInfo(type) : null;
    return {
      title: info ? `${info.plural} · Gallery · Nebula Atlas` : 'Gallery · Nebula Atlas',
      description: info
        ? `Browse every ${info.label.toLowerCase()} in the Nebula Atlas, with images, distances and key facts.`
        : 'Browse every nebula in the Nebula Atlas. Search by name, catalogue number or constellation, and filter by type.',
      path: '/gallery',
    };
  },
  discover: () => ({
    title: 'Discover nebula types · Nebula Atlas',
    description:
      'What makes a nebula glow? Learn the difference between emission, reflection and planetary nebulae and supernova remnants.',
    path: '/discover',
  }),
  contact: () => ({
    title: 'Contact & credits · Nebula Atlas',
    description: 'About the Nebula Atlas, image credits for every nebula, and how to get in touch.',
    path: '/contact',
  }),
  notFound: () => ({
    title: 'Page not found · Nebula Atlas',
    description: 'This page drifted out of the atlas. Head back to explore the cosmos.',
    path: null,
    noindex: true,
  }),
};

export function nebulaMeta(nebula) {
  const facts = `${nebula.typeLabel} in ${nebula.constellation}, ${formatDistance(nebula.distance)} away.`;
  return {
    title: `${displayTitle(nebula)} · Nebula Atlas`,
    description: truncate(`${facts} ${nebula.description}`, 160),
    path: `/nebula/${nebula.id}`,
    image: nebula.image ? `${nebula.imagePath}/og.jpg` : null,
    imageAlt: nebula.imageAlt,
    ogType: 'article',
  };
}

/** Resolve relative paths against the site URL and fill in defaults. */
export function resolveMeta(meta, siteUrl) {
  const absolute = (path) => new URL(String(path).replace(/^\/+/, ''), siteUrl).href;
  return {
    title: meta.title,
    description: meta.description,
    canonical: meta.path ? absolute(meta.path) : null,
    noindex: Boolean(meta.noindex),
    ogType: meta.ogType ?? 'website',
    image: absolute(meta.image ?? SITE.image),
    imageAlt: meta.image ? meta.imageAlt : SITE.imageAlt,
  };
}

/** The tags each page needs, as data. `key` identifies a tag so it can be updated in place. */
export function headTags(meta, siteUrl) {
  const m = resolveMeta(meta, siteUrl);
  const tags = [
    { tag: 'title', text: m.title },
    { tag: 'meta', key: 'name', attrs: { name: 'description', content: m.description } },
    { tag: 'meta', key: 'name', attrs: { name: 'robots', content: m.noindex ? 'noindex' : null } },
    { tag: 'link', key: 'rel', attrs: { rel: 'canonical', href: m.canonical } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:site_name', content: SITE.name } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:locale', content: SITE.locale } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:type', content: m.ogType } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:title', content: m.title } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:description', content: m.description } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:url', content: m.canonical } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:image', content: m.image } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', key: 'property', attrs: { property: 'og:image:alt', content: m.imageAlt } },
    { tag: 'meta', key: 'name', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', key: 'name', attrs: { name: 'twitter:title', content: m.title } },
    { tag: 'meta', key: 'name', attrs: { name: 'twitter:description', content: m.description } },
    { tag: 'meta', key: 'name', attrs: { name: 'twitter:image', content: m.image } },
    { tag: 'meta', key: 'name', attrs: { name: 'twitter:image:alt', content: m.imageAlt } },
  ];
  return tags;
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** Serialise tags to HTML (used at build time). Tags with an empty value are left out. */
export function renderHeadTags(meta, siteUrl) {
  return headTags(meta, siteUrl)
    .map(({ tag, text, attrs }) => {
      if (tag === 'title') return `<title>${escapeHtml(text)}</title>`;
      if (Object.values(attrs).some((value) => value === null || value === undefined)) return '';
      const attributes = Object.entries(attrs)
        .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
        .join(' ');
      return `<${tag} ${attributes} />`;
    })
    .filter(Boolean)
    .join('\n    ');
}
