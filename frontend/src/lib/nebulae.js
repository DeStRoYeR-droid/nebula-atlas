// Parse and normalise nebulae.json. Pure: used by the app and by the build step.
import { slugify, typeInfo } from './types.js';

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export class DataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataError';
  }
}

const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const optionalText = (value) => (isText(value) ? value.trim() : null);
const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Lower-case, accent-free text used for matching search queries. */
export function normalizeText(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function parseImage(image) {
  if (!image || typeof image !== 'object') return null;
  const { width, height, widths, formats, placeholder, color } = image;
  if (!isPositiveNumber(width) || !isPositiveNumber(height)) return null;
  if (!Array.isArray(widths) || widths.length === 0 || !widths.every(isPositiveNumber)) return null;
  const knownFormats = Array.isArray(formats) ? formats.filter((f) => f === 'avif' || f === 'webp') : [];
  if (!knownFormats.includes('webp')) return null; // webp is the universal fallback
  return Object.freeze({
    width,
    height,
    widths: [...widths].sort((a, b) => a - b),
    formats: knownFormats,
    placeholder: isText(placeholder) && placeholder.startsWith('data:image/') ? placeholder : null,
    color: isText(color) && COLOR_PATTERN.test(color) ? color : null,
  });
}

/** Returns a normalised nebula, or a string describing why the entry was rejected. */
export function normalizeNebula(item) {
  if (!item || typeof item !== 'object') return 'not an object';
  if (!isText(item.id) || !ID_PATTERN.test(item.id)) return 'missing or invalid "id"';
  for (const field of ['name', 'type', 'constellation', 'description', 'image_alt']) {
    if (!isText(item[field])) return `missing "${field}"`;
  }
  if (!isPositiveNumber(item.distance)) return 'missing or invalid "distance"';

  const name = item.name.trim();
  const catalog = optionalText(item.catalog);
  const nickname = optionalText(item.nickname);
  const type = item.type.trim();
  const typeSlug = slugify(type);
  const constellation = item.constellation.trim();
  const imagePath = isText(item.image_path)
    ? item.image_path.trim().replace(/^\/+|\/+$/g, '')
    : `images/nebulae/${item.id}`;

  const searchText = normalizeText(
    [item.id, name, catalog, catalog?.replace(/\s+/g, ''), nickname, constellation, type, typeInfo(typeSlug).label]
      .filter(Boolean)
      .join(' '),
  );

  return Object.freeze({
    id: item.id,
    name,
    shortName: name.replace(/\s+nebula$/i, '') || name,
    catalog,
    nickname,
    type,
    typeSlug,
    typeLabel: typeInfo(typeSlug).label,
    constellation,
    distance: item.distance,
    size: optionalText(item.size),
    description: item.description.trim(),
    facts: Array.isArray(item.facts) ? item.facts.filter(isText).map((fact) => fact.trim()) : [],
    imagePath,
    imageAlt: item.image_alt.trim(),
    credits: optionalText(item.credits),
    sourcePage: optionalText(item.source_page),
    image: parseImage(item.image),
    searchText,
  });
}

/**
 * Parse the decoded JSON document.
 * Invalid entries are skipped (and reported) rather than breaking the site.
 * @returns {{ nebulae: object[], skipped: { index: number, reason: string }[] }}
 */
export function parseNebulae(raw) {
  const items = Array.isArray(raw) ? raw : raw?.nebulae;
  if (!Array.isArray(items)) {
    throw new DataError('The nebula data is not in the expected format.');
  }
  const nebulae = [];
  const skipped = [];
  const seen = new Set();
  items.forEach((item, index) => {
    const result = normalizeNebula(item);
    if (typeof result === 'string') {
      skipped.push({ index, reason: result });
    } else if (seen.has(result.id)) {
      skipped.push({ index, reason: `duplicate id "${result.id}"` });
    } else {
      seen.add(result.id);
      nebulae.push(result);
    }
  });
  return { nebulae, skipped };
}

/** Title as shown in the UI: "Eagle Nebula (M16)". */
export function displayTitle(nebula) {
  return nebula.catalog ? `${nebula.name} (${nebula.catalog})` : nebula.name;
}
