import { useMemo } from 'react';
import { Icon } from '../components/Icon.jsx';
import { NebulaImage } from '../components/NebulaImage.jsx';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.jsx';
import { DataErrorState, EmptyAtlas } from '../components/states/DataStates.jsx';
import { CardSkeleton, LoadingAnnouncement } from '../components/states/Skeletons.jsx';
import { useNebulae } from '../data/DataProvider.jsx';
import { SIZES } from '../lib/images.js';
import { galleryHref, typeCounts } from '../lib/search.js';
import { typeInfo } from '../lib/types.js';
import { Link } from '../router/Link.jsx';
import { pageMeta } from '../seo/meta.js';
import { useDocumentHead } from '../seo/useDocumentHead.js';

/** Explains each nebula type and links to the gallery filtered by it. */
export default function DiscoverPage() {
  const { status, nebulae, error, retry } = useNebulae();
  useDocumentHead(pageMeta.discover());

  const groups = useMemo(
    () =>
      typeCounts(nebulae).map(({ slug, count }) => ({
        info: typeInfo(slug),
        count,
        example: nebulae.find((n) => n.typeSlug === slug && n.image) ?? nebulae.find((n) => n.typeSlug === slug),
      })),
    [nebulae],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 xl:max-w-[88rem]">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Discover' }]} />
      <header className="mb-8 mt-4">
        <h1
          id="page-title"
          tabIndex={-1}
          className="text-2xl font-extrabold uppercase tracking-[0.05em] text-fg sm:text-4xl"
        >
          Discover nebula types
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          A nebula is a cloud of gas and dust in space. Some are stellar nurseries where new stars are born; others are
          the remains of stars that have died. Here is how to tell them apart.
        </p>
      </header>

      {status === 'loading' && (
        <>
          <LoadingAnnouncement />
          <CardSkeleton />
        </>
      )}
      {status === 'error' && <DataErrorState error={error} onRetry={retry} />}
      {status === 'ready' && nebulae.length === 0 && <EmptyAtlas />}

      {status === 'ready' && groups.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map(({ info, count, example }) => (
            <li key={info.slug}>
              <article className="glass flex h-full flex-col overflow-hidden rounded-2xl">
                {example && <NebulaImage nebula={example} sizes={SIZES.card} className="aspect-[16/9]" />}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h2 className="text-lg font-bold text-fg">{info.plural}</h2>
                  {info.description && <p className="flex-1 text-sm leading-relaxed text-muted">{info.description}</p>}
                  {example && <p className="text-xs text-subtle">Pictured: {example.name}</p>}
                  <Link
                    to={galleryHref({ type: info.slug })}
                    className="mt-1 inline-flex items-center gap-2 self-start rounded-lg text-sm font-semibold text-accent hover:underline"
                  >
                    Browse {count} {count === 1 ? info.label.toLowerCase() : info.plural.toLowerCase()}
                    <Icon name="chevronRight" className="size-3" />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
