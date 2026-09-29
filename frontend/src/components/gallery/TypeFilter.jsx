import { memo } from 'react';
import { typeInfo } from '../../lib/types.js';

const chipClass =
  'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ' +
  'border-[var(--glass-border)] bg-[var(--glass)] text-muted hover:text-fg ' +
  'aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent';

/** Toggle buttons for each nebula type present in the data. */
export const TypeFilter = memo(function TypeFilter({ types, total, active, onChange }) {
  return (
    <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={!active} className={chipClass} onClick={() => onChange('')}>
        All <span className="font-normal">{total}</span>
      </button>
      {types.map(({ slug, count }) => (
        <button
          key={slug}
          type="button"
          aria-pressed={active === slug}
          className={chipClass}
          onClick={() => onChange(active === slug ? '' : slug)}
        >
          {typeInfo(slug).plural} <span className="font-normal">{count}</span>
        </button>
      ))}
    </div>
  );
});
