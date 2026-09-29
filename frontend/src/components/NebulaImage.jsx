import { memo, useCallback, useState } from 'react';
import { imageUrl, pickWidth, srcSet } from '../lib/images.js';
import { Icon } from './Icon.jsx';

/**
 * Responsive nebula picture:
 *  - AVIF/WebP `srcset` + `sizes`, so each context downloads a suitably small file;
 *  - intrinsic width/height, so the browser reserves space (no layout shift);
 *  - blurred inline placeholder + average colour while loading;
 *  - lazy by default, eager + high priority only when `priority` is set;
 *  - a clear fallback if the image is missing or fails to load.
 */
export const NebulaImage = memo(function NebulaImage({
  nebula,
  sizes,
  priority = false,
  className = '',
  fit = 'object-cover',
}) {
  const [status, setStatus] = useState('loading');
  const image = nebula.image;

  // Images served from cache may already be complete before React attaches onLoad.
  const checkComplete = useCallback((img) => {
    if (img?.complete && img.naturalWidth > 0) setStatus('loaded');
  }, []);

  if (!image || status === 'error') return <ImageFallback nebula={nebula} className={className} />;

  const loaded = status === 'loaded';
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={image.color ? { backgroundColor: image.color } : undefined}
      data-image-state={status}
    >
      {image.placeholder && !loaded && (
        <img
          src={image.placeholder}
          alt=""
          aria-hidden="true"
          className="placeholder-blur absolute inset-0 size-full object-cover"
          decoding="async"
        />
      )}
      <picture>
        {image.formats.includes('avif') && <source type="image/avif" srcSet={srcSet(nebula, 'avif')} sizes={sizes} />}
        <source type="image/webp" srcSet={srcSet(nebula, 'webp')} sizes={sizes} />
        <img
          ref={checkComplete}
          src={imageUrl(nebula, pickWidth(image.widths, 640), 'webp')}
          alt={nebula.imageAlt}
          width={image.width}
          height={image.height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`relative size-full ${fit} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </picture>
    </div>
  );
});

function ImageFallback({ nebula, className }) {
  return (
    <div
      role="img"
      aria-label={`${nebula.imageAlt} (image unavailable)`}
      className={`relative flex flex-col items-center justify-center gap-1.5 overflow-hidden bg-skeleton text-center text-subtle ${className}`}
      data-image-state="fallback"
    >
      <Icon name="image" className="size-5 opacity-80" />
      <span className="px-2 text-[0.625rem] leading-tight sm:text-xs">Image unavailable</span>
    </div>
  );
}
