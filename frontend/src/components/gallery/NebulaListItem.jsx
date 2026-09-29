import { memo } from 'react';
import { formatDistance } from '../../lib/format.js';
import { SIZES } from '../../lib/images.js';
import { NebulaImage } from '../NebulaImage.jsx';
import { NebulaLink } from '../NebulaLink.jsx';

/** One row of the descriptive gallery (View 2). The whole card is clickable via a stretched link. */
export const NebulaListItem = memo(function NebulaListItem({ nebula, priority = false }) {
  const titleId = `nebula-${nebula.id}-title`;
  return (
    <li className="cv-auto">
      <article
        aria-labelledby={titleId}
        className="glass relative flex h-full gap-3 rounded-2xl p-3 transition-[border-color,box-shadow] duration-300 hover:border-accent/60 hover:shadow-[0_0_32px_-12px_var(--accent)] sm:gap-5 sm:p-4"
      >
        <NebulaImage
          nebula={nebula}
          sizes={SIZES.list}
          priority={priority}
          className="aspect-[4/3] w-[38%] shrink-0 self-start rounded-xl sm:w-48 lg:w-56"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-accent">{nebula.typeLabel}</p>
          <h2 id={titleId} className="text-base font-bold leading-snug text-fg sm:text-lg">
            <NebulaLink
              nebula={nebula}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
            >
              {nebula.name}
            </NebulaLink>
            {nebula.catalog && <span className="font-normal text-subtle"> ({nebula.catalog})</span>}
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs text-muted sm:text-sm">
            <dt className="text-subtle">Constellation</dt>
            <dd>{nebula.constellation}</dd>
            <dt className="text-subtle">Distance</dt>
            <dd>{formatDistance(nebula.distance)}</dd>
          </dl>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted sm:line-clamp-3">{nebula.description}</p>
        </div>
      </article>
    </li>
  );
});
