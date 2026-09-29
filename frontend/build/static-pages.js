// Build step that turns the single-page app into a GitHub Pages–friendly static site:
//
//   index.html, gallery.html, discover.html, contact.html   one per page
//   nebula/<id>.html                                          one per nebula
//   404.html                                                  served by GitHub Pages for unknown URLs
//   sitemap.xml, robots.txt, manifest.webmanifest, .nojekyll
//
// Every HTML file is the same app shell with page-specific <title>, description,
// canonical URL, Open Graph and Twitter tags, a <noscript> fallback, and a
// Content-Security-Policy (with the hash of the inline theme script).
// GitHub Pages serves "gallery.html" for "/gallery", so URLs stay clean.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatDistance } from '../src/lib/format.js';
import { buildSrcSet, fullSizes } from '../src/lib/imageSources.js';
import { displayTitle, parseNebulae } from '../src/lib/nebulae.js';
import { SITE, nebulaMeta, pageMeta, renderHeadTags } from '../src/seo/meta.js';

const HEAD_BLOCK = /<!-- head:start[\s\S]*?<!-- head:end -->/;
const NOSCRIPT_BLOCK = /<!-- noscript:start -->[\s\S]*?<!-- noscript:end -->/;
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

export function contentSecurityPolicy(html) {
  const hashes = [...html.matchAll(INLINE_SCRIPT)].map(
    ([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`,
  );
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function noscriptFor(page, { base, nebulae }) {
  const link = (path, text) => `<a href="${base}${path.replace(/^\//, '')}">${escapeHtml(text)}</a>`;
  const intro = '<p>Nebula Atlas is interactive and works best with JavaScript turned on.</p>';
  if (page.nebula) {
    const n = page.nebula;
    return `<div class="noscript"><h1>${escapeHtml(displayTitle(n))}</h1><p>${escapeHtml(n.typeLabel)} in ${escapeHtml(
      n.constellation,
    )}, ${escapeHtml(formatDistance(n.distance))} away.</p><p>${escapeHtml(n.description)}</p>${intro}<p>${link('/gallery', 'Browse all nebulae')}</p></div>`;
  }
  const list = nebulae.map((n) => `<li>${link(`/nebula/${n.id}`, n.name)}</li>`).join('');
  return `<div class="noscript"><h1>${escapeHtml(page.meta.title)}</h1><p>${escapeHtml(page.meta.description)}</p>${intro}<ul>${list}</ul></div>`;
}

function sitemap(urls) {
  const entries = urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function manifest() {
  return `${JSON.stringify(
    {
      name: SITE.name,
      short_name: SITE.name,
      description: SITE.description,
      lang: 'en',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: SITE.themeColor,
      theme_color: SITE.themeColor,
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  )}\n`;
}

// Lazily loaded code each page needs straight away (preloading avoids a request waterfall).
const PAGE_MODULES = {
  gallery: ['src/pages/GalleryPage.jsx'],
  discover: ['src/pages/DiscoverPage.jsx'],
  contact: ['src/pages/ContactPage.jsx'],
  nebula: ['src/pages/GalleryPage.jsx', 'src/components/NebulaModal.jsx', 'src/motion-features.js'],
  notFound: ['src/pages/NotFoundPage.jsx'],
};

function modulePreloads(bundle, modules, base) {
  const chunks = Object.values(bundle).filter((item) => item.type === 'chunk');
  const entry = chunks.find((chunk) => chunk.isEntry);
  const alreadyLoaded = new Set([entry?.fileName, ...(entry?.imports ?? [])]);
  const files = new Set();
  for (const modulePath of modules) {
    const chunk = chunks.find((c) => c.facadeModuleId?.replaceAll('\\', '/').endsWith(modulePath));
    if (!chunk) continue;
    for (const file of [chunk.fileName, ...chunk.imports]) if (!alreadyLoaded.has(file)) files.add(file);
  }
  return [...files].map((file) => `<link rel="modulepreload" crossorigin href="${base}${file}" />`);
}

function imagePreload(nebula, base) {
  if (!nebula?.image) return [];
  const format = nebula.image.formats.includes('avif') ? 'avif' : 'webp';
  return [
    `<link rel="preload" as="image" type="image/${format}" fetchpriority="high" imagesrcset="${escapeHtml(
      buildSrcSet(base, nebula, format),
    )}" imagesizes="${escapeHtml(fullSizes(nebula))}" />`,
  ];
}

export function staticPages({ siteUrl, publicDir, buildId }) {
  let base = '/';
  return {
    name: 'nebula-atlas:static-pages',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base;
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index) {
        this.error('index.html was not found in the bundle');
        return;
      }
      const template = String(index.source);
      const dataFile = join(publicDir, 'data', 'nebulae.json');
      const { nebulae, skipped } = parseNebulae(JSON.parse(readFileSync(dataFile, 'utf8')));
      if (skipped.length) this.warn(`Skipped invalid entries in nebulae.json: ${JSON.stringify(skipped)}`);
      if (!existsSync(join(publicDir, SITE.image))) {
        this.warn(`public/${SITE.image} is missing; run "python -m app.cli og" in backend/ to generate it.`);
      }
      const missingImages = nebulae.filter((n) => !n.image).map((n) => n.id);
      if (missingImages.length) {
        this.warn(`No images yet for: ${missingImages.join(', ')}. Run "python -m app.cli fetch-images" in backend/.`);
      }

      const csp = contentSecurityPolicy(template);
      // Start downloading the data in parallel with the JavaScript (matches DATA_URL in src/config.js).
      const dataPreload = `<link rel="preload" href="${base}data/nebulae.json?v=${buildId}" as="fetch" crossorigin />`;
      const render = (page) =>
        template
          .replace(
            HEAD_BLOCK,
            [
              `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
              renderHeadTags(page.meta, siteUrl),
              dataPreload,
              ...modulePreloads(bundle, PAGE_MODULES[page.route] ?? [], base),
              ...imagePreload(page.nebula, base),
            ].join('\n    '),
          )
          .replace(NOSCRIPT_BLOCK, `<noscript>${noscriptFor(page, { base, nebulae })}</noscript>`);

      const pages = [
        { file: 'index.html', route: 'home', meta: pageMeta.home() },
        { file: 'gallery.html', route: 'gallery', meta: pageMeta.gallery() },
        { file: 'discover.html', route: 'discover', meta: pageMeta.discover() },
        { file: 'contact.html', route: 'contact', meta: pageMeta.contact() },
        ...nebulae.map((nebula) => ({
          file: `nebula/${nebula.id}.html`,
          route: 'nebula',
          meta: nebulaMeta(nebula),
          nebula,
        })),
        { file: '404.html', route: 'notFound', meta: pageMeta.notFound() },
      ];

      for (const page of pages) {
        const html = render(page);
        if (page.file === 'index.html') index.source = html;
        else this.emitFile({ type: 'asset', fileName: page.file, source: html });
      }

      const urls = pages.filter((p) => p.meta.path).map((p) => new URL(p.meta.path.replace(/^\//, ''), siteUrl).href);
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(urls) });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', siteUrl).href}\n`,
      });
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest() });
      // Tell GitHub Pages not to run Jekyll over the output.
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
    },
  };
}
