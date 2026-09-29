// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from '../../build/static-pages.js';
import { parseNebulae } from '../lib/nebulae.js';
import { fixtureDocument } from '../test/fixtures.js';
import { nebulaMeta, pageMeta, renderHeadTags, resolveMeta } from './meta.js';

const SITE = 'https://example.github.io/nebula-atlas/';
const { nebulae } = parseNebulae(fixtureDocument);

describe('page metadata', () => {
  it('builds absolute canonical and Open Graph URLs under the base path', () => {
    const meta = resolveMeta(nebulaMeta(nebulae[1]), SITE);
    expect(meta.canonical).toBe('https://example.github.io/nebula-atlas/nebula/eagle');
    expect(meta.image).toBe('https://example.github.io/nebula-atlas/images/nebulae/eagle/og.jpg');
    expect(meta.title).toBe('Eagle Nebula (M16) · Nebula Atlas');
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });

  it('falls back to the site share image when a nebula has no image yet', () => {
    const meta = resolveMeta(nebulaMeta(nebulae.at(-1)), SITE);
    expect(meta.image).toBe('https://example.github.io/nebula-atlas/og-image.jpg');
  });

  it('marks the 404 page noindex and gives it no canonical URL', () => {
    const html = renderHeadTags(pageMeta.notFound(), SITE);
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('rel="canonical"');
  });

  it('renders escaped Open Graph and Twitter tags', () => {
    const html = renderHeadTags({ title: 'A "quoted" <title>', description: 'd', path: '/' }, SITE);
    expect(html).toContain('<title>A &quot;quoted&quot; &lt;title&gt;</title>');
    expect(html).toContain('<link rel="canonical" href="https://example.github.io/nebula-atlas/" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
  });
});

describe('content security policy', () => {
  it('allows exactly the inline scripts in the page by hash', () => {
    const csp = contentSecurityPolicy('<script>console.log(1)</script><script type="module" src="/a.js"></script>');
    expect(csp).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
    expect(csp.match(/sha256-/g)).toHaveLength(1);
    expect(csp).toContain("object-src 'none'");
  });
});
