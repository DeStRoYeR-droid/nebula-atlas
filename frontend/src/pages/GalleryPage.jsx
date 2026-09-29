import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GALLERY_PAGE_SIZE } from '../config.js';
import { Icon } from '../components/Icon.jsx';
import { NebulaListItem } from '../components/gallery/NebulaListItem.jsx';
import { SearchBox } from '../components/gallery/SearchBox.jsx';
import { TypeFilter } from '../components/gallery/TypeFilter.jsx';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.jsx';
import { DataErrorState, EmptyAtlas } from '../components/states/DataStates.jsx';
import { ListSkeleton, LoadingAnnouncement } from '../components/states/Skeletons.jsx';
import { StatusMessage, buttonClass } from '../components/states/StatusMessage.jsx';
import { useNebulae } from '../data/DataProvider.jsx';
import { applyFilters, galleryHref, readGalleryParams, typeCounts } from '../lib/search.js';
import { typeInfo } from '../lib/types.js';
import { navigate } from '../router/Link.jsx';
import { pageMeta } from '../seo/meta.js';
import { useDocumentHead } from '../seo/useDocumentHead.js';

const RESULTS_ID = 'gallery-results';

function resultsSummary({ shown, total, q, type }) {
  if (!q && !type) return `${total} ${total === 1 ? 'nebula' : 'nebulae'}`;
  if (shown === 0) return 'No results';
  const details = [type && typeInfo(type).plural, q && `“${q}”`].filter(Boolean).join(' · ');
  return `Showing ${shown} of ${total} nebulae · ${details}`;
}

/** View 2: the descriptive, searchable, filterable list of nebulae. */
export default function GalleryPage({ location }) {
  const { status, nebulae, error, retry } = useNebulae();
  const { q, type } = useMemo(() => readGalleryParams(location.search), [location.search]);
  const results = useMemo(() => applyFilters(nebulae, { q, type }), [nebulae, q, type]);
  const types = useMemo(() => typeCounts(nebulae), [nebulae]);
  const knownType = types.some((t) => t.slug === type) ? type : '';

  // Render in pages so a large atlas never mounts hundreds of cards at once.
  const [limit, setLimit] = useState(GALLERY_PAGE_SIZE);
  const filterKey = `${q}|${type}`;
  const [limitFor, setLimitFor] = useState(filterKey);
  if (limitFor !== filterKey) {
    setLimitFor(filterKey);
    setLimit(GALLERY_PAGE_SIZE);
  }

  useDocumentHead(pageMeta.gallery({ type: knownType }));

  const searchInput = useRef(null);
  useEffect(() => {
    if (location.state?.focusSearch) searchInput.current?.focus();
  }, [location.key, location.state]);

  const onSearch = useCallback((value) => navigate(galleryHref({ q: value, type }), { replace: true }), [type]);
  const onType = useCallback((value) => navigate(galleryHref({ q, type: value })), [q]);
  const clearAll = useCallback(() => navigate('/gallery', { replace: true }), []);

  const ready = status === 'ready' && nebulae.length > 0;
  const visible = results.slice(0, limit);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 xl:max-w-[88rem]">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Gallery', to: knownType ? '/gallery' : undefined },
          ...(knownType ? [{ label: typeInfo(knownType).plural }] : []),
        ]}
      />

      <header className="mb-6 mt-4">
        <h1
          id="page-title"
          tabIndex={-1}
          className="text-2xl font-extrabold uppercase tracking-[0.05em] text-fg sm:text-4xl"
        >
          Nebula Gallery
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Every nebula in the atlas with its type, distance and constellation. Search or filter, then choose one to see
          it in full.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-4">
        <SearchBox value={q} onSearch={onSearch} inputRef={searchInput} controls={RESULTS_ID} />
        {ready && <TypeFilter types={types} total={nebulae.length} active={type} onChange={onType} />}
      </div>

      <p role="status" className="mb-4 min-h-5 text-sm text-subtle">
        {ready ? resultsSummary({ shown: results.length, total: nebulae.length, q, type }) : ''}
      </p>

      {/* Everything the search box controls lives in this region. */}
      <div id={RESULTS_ID}>
        {status === 'loading' && (
          <>
            <LoadingAnnouncement />
            <ListSkeleton />
          </>
        )}
        {status === 'error' && <DataErrorState error={error} onRetry={retry} />}
        {status === 'ready' && nebulae.length === 0 && <EmptyAtlas />}

        {ready && results.length === 0 && (
          <StatusMessage
            icon="search"
            title={q ? `No nebulae match “${q}”` : `No ${type ? typeInfo(type).plural.toLowerCase() : 'nebulae'} yet`}
            actions={
              <button type="button" className={buttonClass.primary} onClick={clearAll}>
                <Icon name="close" /> Clear search and filters
              </button>
            }
          >
            <p>Try a different name, a catalogue number such as “M42”, or a constellation such as “Cygnus”.</p>
          </StatusMessage>
        )}

        {ready && results.length > 0 && (
          <ul className="grid gap-4 lg:grid-cols-2">
            {visible.map((nebula, index) => (
              <NebulaListItem key={nebula.id} nebula={nebula} priority={index < 2} />
            ))}
          </ul>
        )}

        {ready && results.length > limit && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className={buttonClass.secondary}
              onClick={() => setLimit((n) => n + GALLERY_PAGE_SIZE)}
            >
              Show more <span className="text-subtle">({results.length - limit} more)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
