// Site-wide configuration. Values come from Vite (see vite.config.js and .env.example).
/* global __SITE_URL__, __BUILD_ID__ */

/** Absolute URL of the deployed site, always ending in "/". e.g. https://you.github.io/nebula-atlas/ */
export const SITE_URL = __SITE_URL__;

/** Path the site is served from, e.g. "/nebula-atlas/" on GitHub project pages, or "/". */
export const BASE_PATH = import.meta.env.BASE_URL;

/** Cache-busting token that changes on every build. */
export const BUILD_ID = __BUILD_ID__;

export const DATA_URL = `${BASE_PATH}data/nebulae.json?v=${BUILD_ID}`;

/** Milliseconds between moves of the home-page puzzle. */
export const PUZZLE_INTERVAL_MS = 1500;

/** How many gallery items to render at once before "Show more". */
export const GALLERY_PAGE_SIZE = 24;

/** Optional links for the Contact page (set in .env). */
export const REPO_URL = import.meta.env.VITE_REPO_URL || '';
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

/** URL of a file in public/, respecting the base path. */
export const assetUrl = (path) => `${BASE_PATH}${String(path).replace(/^\/+/, '')}`;
