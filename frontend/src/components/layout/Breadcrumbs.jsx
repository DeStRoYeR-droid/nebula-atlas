import { Link } from '../../router/Link.jsx';
import { Icon } from '../Icon.jsx';

/**
 * items: [{ label, to? }] - the last item is the current page (no link).
 */
export function Breadcrumbs({ items, className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-subtle sm:text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {last || !item.to ? (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-muted' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="rounded hover:text-fg hover:underline">
                  {item.label}
                </Link>
              )}
              {!last && <Icon name="chevronRight" className="size-2.5 opacity-60" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
