// Image URL helpers bound to the site's base path.
import { BASE_PATH } from '../config.js';
import { buildSrcSet, imageFileUrl } from './imageSources.js';

export { SIZES, fullSizes, pickWidth } from './imageSources.js';

export const imageUrl = (nebula, width, format) => imageFileUrl(BASE_PATH, nebula, width, format);

export const srcSet = (nebula, format) => buildSrcSet(BASE_PATH, nebula, format);
