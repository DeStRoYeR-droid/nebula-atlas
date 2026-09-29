import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { formatDistance } from '../lib/format.js';
import { fullSizes, imageUrl, pickWidth, srcSet } from '../lib/images.js';
import { displayTitle } from '../lib/nebulae.js';
import { galleryHref } from '../lib/search.js';
import { typeInfo } from '../lib/types.js';
import { Link } from '../router/Link.jsx';
import { nebulaPath } from '../router/routes.js';
import { nebulaMeta } from '../seo/meta.js';
import { useDocumentHead } from '../seo/useDocumentHead.js';
import { Icon } from './Icon.jsx';
import { NebulaImage } from './NebulaImage.jsx';
import { Breadcrumbs } from './layout/Breadcrumbs.jsx';

const EASE = [0.22, 1, 0.36, 1];
const SWIPE_DISTANCE = 50;

/** Warm the cache for the neighbouring images, using the same srcset/sizes. */
function Preload({ nebulae }) {
  return (
    <div hidden aria-hidden="true">
      {nebulae
        .filter((n) => n.image)
        .map((n) => (
          <picture key={n.id}>
            {n.image.formats.includes('avif') && (
              <source type="image/avif" srcSet={srcSet(n, 'avif')} sizes={fullSizes(n)} />
            )}
            <source type="image/webp" srcSet={srcSet(n, 'webp')} sizes={fullSizes(n)} />
            <img
              src={imageUrl(n, pickWidth(n.image.widths, 640), 'webp')}
              alt=""
              fetchPriority="low"
              decoding="async"
            />
          </picture>
        ))}
    </div>
  );
}

function StepLink({ direction, nebula, state, hideOnPhone }) {
  const previous = direction === 'previous';
  return (
    <Link
      to={nebulaPath(nebula.id)}
      replace
      state={state}
      aria-label={`${previous ? 'Previous' : 'Next'}: ${nebula.name}`}
      aria-keyshortcuts={previous ? 'ArrowLeft' : 'ArrowRight'}
      className={`glass absolute top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-fg transition-colors hover:bg-fg/15 lg:size-12 ${
        previous ? 'left-2 sm:left-3 lg:-left-16' : 'right-2 sm:right-3 lg:-right-16'
      } ${hideOnPhone ? 'max-sm:hidden' : ''}`}
    >
      <Icon name={previous ? 'chevronLeft' : 'chevronRight'} className="size-4" />
    </Link>
  );
}

/**
 * The nebula detail view: a modal dialog over the page it was opened from, on
 * its own URL (/nebula/:id). Esc closes, ← → move between nebulae, focus is
 * trapped inside, and phones get a full-screen view with a swipeable sheet.
 */
export default function NebulaModal({ nebula, sequence, navState, onClose, onNavigate }) {
  const dialog = useRef(null);
  const titleId = useId();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [preloadReady, setPreloadReady] = useState(false);
  const shownId = useRef(nebula.id);
  const pointer = useRef(null);

  const index = Math.max(
    0,
    sequence.findIndex((n) => n.id === nebula.id),
  );
  const hasSiblings = sequence.length > 1;
  const previous = sequence[(index - 1 + sequence.length) % sequence.length];
  const next = sequence[(index + 1) % sequence.length];

  useDocumentHead(nebulaMeta(nebula));
  useFocusTrap(dialog);

  useEffect(() => {
    dialog.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, []);

  // When the nebula changes: collapse the sheet, announce it, then warm the neighbours.
  useEffect(() => {
    setPreloadReady(false);
    const timer = setTimeout(() => setPreloadReady(true), 700);
    if (shownId.current !== nebula.id) {
      shownId.current = nebula.id;
      setExpanded(false);
      setAnnouncement(`${displayTitle(nebula)}, ${index + 1} of ${sequence.length}`);
    }
    return () => clearTimeout(timer);
  }, [nebula, index, sequence.length]);

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (
      hasSiblings &&
      (event.key === 'ArrowRight' || event.key === 'ArrowLeft') &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      onNavigate(event.key === 'ArrowRight' ? next.id : previous.id);
    }
  }

  // Touch gestures: swipe left/right for the next/previous nebula, up/down to open/close the details.
  function onPointerDown(event) {
    if (event.pointerType === 'mouse') return;
    pointer.current = { x: event.clientX, y: event.clientY, inSheet: Boolean(event.target.closest('[data-sheet]')) };
  }
  function onPointerUp(event) {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (hasSiblings && Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.2) {
      onNavigate(dx < 0 ? next.id : previous.id);
    } else if (Math.abs(dy) > SWIPE_DISTANCE && Math.abs(dy) > Math.abs(dx) && !(start.inSheet && expanded && dy > 0)) {
      setExpanded(dy < 0);
    }
  }

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Gallery', to: '/gallery' },
    { label: typeInfo(nebula.typeSlug).plural, to: galleryHref({ type: nebula.typeSlug }) },
    { label: nebula.name },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6 lg:px-24 lg:py-10">
      <m.div
        aria-hidden="true"
        className="absolute inset-0 bg-scrim backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />

      <m.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailsId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative size-full outline-none sm:h-[min(86vh,52rem)] sm:w-full sm:max-w-[76rem] xl:h-[min(88vh,64rem)] xl:max-w-[92rem]"
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <div
          className="relative size-full touch-pinch-zoom overflow-hidden bg-black shadow-2xl sm:rounded-2xl sm:border sm:border-white/10"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (pointer.current = null)}
        >
          <AnimatePresence initial={false}>
            <m.div
              key={nebula.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <NebulaImage nebula={nebula} sizes={fullSizes(nebula)} priority className="size-full" />
            </m.div>
          </AnimatePresence>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent sm:hidden"
          />

          <section
            data-sheet
            aria-label="Nebula details"
            className="glass-strong absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex max-h-[calc(100%-5.5rem)] flex-col overflow-hidden rounded-2xl sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-4 sm:max-h-[calc(100%-2rem)] sm:w-[22rem] lg:w-[25rem]"
          >
            <div
              className={`overscroll-contain p-4 sm:overflow-y-auto sm:p-5 ${expanded ? 'overflow-y-auto' : 'overflow-hidden'}`}
            >
              <Breadcrumbs items={breadcrumbs} className="mb-2.5 hidden sm:block" />
              <h2 id={titleId} className="text-base font-extrabold uppercase tracking-[0.06em] text-fg sm:text-lg">
                {displayTitle(nebula)}
              </h2>

              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-muted sm:text-sm">
                <dt className="font-semibold text-fg">Type:</dt>
                <dd>{nebula.typeLabel}</dd>
                <dt className="font-semibold text-fg">Distance:</dt>
                <dd>{formatDistance(nebula.distance)}</dd>
                <dt className="font-semibold text-fg">Constellation:</dt>
                <dd>{nebula.constellation}</dd>
                {nebula.size && (
                  <>
                    <dt className={`font-semibold text-fg ${expanded ? '' : 'max-sm:hidden'}`}>Size:</dt>
                    <dd className={expanded ? '' : 'max-sm:hidden'}>{nebula.size}</dd>
                  </>
                )}
              </dl>

              <div id={detailsId} className="mt-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-accent">
                  {nebula.nickname ?? 'Overview'}
                </h3>
                <p className={`mt-1 text-sm leading-relaxed text-muted ${expanded ? '' : 'max-sm:line-clamp-2'}`}>
                  {nebula.description}
                </p>
              </div>

              <div className={expanded ? '' : 'max-sm:hidden'}>
                {nebula.facts.length > 0 && (
                  <>
                    <h3 className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-accent">Quick facts</h3>
                    <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-muted marker:text-accent">
                      {nebula.facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  </>
                )}
                {nebula.credits && (
                  <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-subtle">
                    Image: {nebula.credits}
                    {nebula.sourcePage && (
                      <>
                        {' · '}
                        <a
                          href={nebula.sourcePage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent underline-offset-2 hover:underline"
                        >
                          Source<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              className="flex items-center justify-center gap-1.5 border-t border-line py-2.5 text-xs font-semibold text-muted sm:hidden"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
            >
              <Icon name={expanded ? 'chevronDown' : 'chevronUp'} className="size-3" />
              {expanded ? 'Show less' : 'Swipe up for more'}
            </button>
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          aria-keyshortcuts="Escape"
          className="glass absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex size-10 items-center justify-center rounded-full text-fg transition-colors hover:bg-fg/15 sm:right-4 sm:top-4"
        >
          <Icon name="close" className="size-4" />
        </button>

        {hasSiblings && (
          <>
            {/* On phones the expanded details sheet covers the image; swiping still works. */}
            <StepLink direction="previous" nebula={previous} state={navState} hideOnPhone={expanded} />
            <StepLink direction="next" nebula={next} state={navState} hideOnPhone={expanded} />
          </>
        )}

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </m.div>

      {preloadReady && hasSiblings && <Preload nebulae={previous === next ? [next] : [previous, next]} />}
    </div>
  );
}
