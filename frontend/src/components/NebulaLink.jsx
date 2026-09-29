import { createContext, useContext } from 'react';
import { Link } from '../router/Link.jsx';
import { nebulaPath } from '../router/routes.js';

/** The page currently rendered behind any open dialog. */
export const PageLocationContext = createContext({ pathname: '/', search: '' });

/**
 * Link to a nebula's own URL (/nebula/:id). Remembers the page it was opened
 * from so the dialog can show it in the background and "close" can go back.
 */
export function NebulaLink({ nebula, ...rest }) {
  const page = useContext(PageLocationContext);
  return (
    <Link
      to={nebulaPath(nebula.id)}
      state={{ background: { pathname: page.pathname, search: page.search }, opened: true }}
      data-nebula-link={nebula.id}
      {...rest}
    />
  );
}
