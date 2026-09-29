// Search and filtering. Pure functions so they're cheap to memoise and easy to test.
import { normalizeText } from './nebulae.js';

export function tokenize(query) {
  return normalizeText(query ?? '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Every token of the query must appear in the nebula's searchable text. */
export function searchNebulae(nebulae, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return nebulae;
  return nebulae.filter((nebula) => tokens.every((token) => nebula.searchText.includes(token)));
}

export function filterByType(nebulae, typeSlug) {
  if (!typeSlug) return nebulae;
  return nebulae.filter((nebula) => nebula.typeSlug === typeSlug);
}

export function applyFilters(nebulae, { q = '', type = '' } = {}) {
  return filterByType(searchNebulae(nebulae, q), type);
}

/** Types present in the data, in first-seen order, with counts. */
export function typeCounts(nebulae) {
  const counts = new Map();
  for (const nebula of nebulae) counts.set(nebula.typeSlug, (counts.get(nebula.typeSlug) ?? 0) + 1);
  return [...counts].map(([slug, count]) => ({ slug, count }));
}

const STOP_WORDS = new Set(['nebula', 'the', 'of', 'and']);

/** Loose matches for "did you mean…" suggestions: best token overlap first. */
export function suggestNebulae(nebulae, text, limit = 3) {
  const tokens = tokenize(text).filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  if (tokens.length === 0) return [];
  return nebulae
    .map((nebula) => ({ nebula, score: tokens.filter((token) => nebula.searchText.includes(token)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ nebula }) => nebula);
}

export function readGalleryParams(search) {
  const params = new URLSearchParams(search);
  return { q: params.get('q') ?? '', type: params.get('type') ?? '' };
}

export function galleryHref({ q = '', type = '' } = {}) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (q.trim()) params.set('q', q.trim());
  const query = params.toString();
  return query ? `/gallery?${query}` : '/gallery';
}
