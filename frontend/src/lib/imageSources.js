// Responsive image sources. Pure (the base path is passed in), so the build
// step can use the exact same srcset/sizes to preload a nebula page's hero image.

export const imageFileUrl = (base, nebula, width, format) => `${base}${nebula.imagePath}/${width}.${format}`;

export function buildSrcSet(base, nebula, format) {
  return nebula.image.widths.map((width) => `${imageFileUrl(base, nebula, width, format)} ${width}w`).join(', ');
}

/** Smallest available width that is at least `target`, else the largest. */
export function pickWidth(widths, target) {
  return widths.find((width) => width >= target) ?? widths.at(-1);
}

/** Rendered width of each context, so the browser downloads the right file. */
export const SIZES = {
  // Puzzle tiles: a quarter of the (max-width-capped) grid.
  tile: '(min-width: 1440px) 240px, (min-width: 1024px) 208px, (min-width: 640px) 160px, 25vw',
  // Gallery list thumbnails.
  list: '(min-width: 1024px) 224px, (min-width: 640px) 192px, 40vw',
  // Discover cards.
  card: '(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw',
};

/** The dialog image is cropped to fill the screen, so account for the aspect ratio on phones. */
export function fullSizes(nebula) {
  const aspect = nebula.image ? nebula.image.width / nebula.image.height : 1.5;
  const phoneWidth = aspect > 0.6 ? `calc(100vh * ${aspect.toFixed(2)})` : '100vw';
  return `(min-width: 1440px) min(90vw, 1440px), (min-width: 640px) 92vw, ${phoneWidth}`;
}
