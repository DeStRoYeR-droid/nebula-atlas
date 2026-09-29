import { useSyncExternalStore } from 'react';
import { getLocation, hrefFor, navigate, subscribe } from './history.js';
import { matchRoute } from './routes.js';

export function useLocation() {
  return useSyncExternalStore(subscribe, getLocation, getLocation);
}

const isModifiedClick = (event) =>
  event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

/**
 * An <a> that navigates without a page reload. Real href, so middle-click,
 * "open in new tab" and crawlers all work.
 */
export function Link({ to, replace = false, state, onClick, target, children, ...rest }) {
  function handleClick(event) {
    onClick?.(event);
    if (event.defaultPrevented || isModifiedClick(event) || (target && target !== '_self')) return;
    event.preventDefault();
    navigate(to, { replace, state });
  }
  return (
    <a href={hrefFor(to)} onClick={handleClick} target={target} {...rest}>
      {children}
    </a>
  );
}

/** A link that marks itself as the current page (aria-current="page"). */
export function NavLink({ to, activeRoute, ...rest }) {
  const current = matchRoute(to.split('?')[0]).name === activeRoute;
  return <Link to={to} aria-current={current ? 'page' : undefined} {...rest} />;
}

export { navigate };
