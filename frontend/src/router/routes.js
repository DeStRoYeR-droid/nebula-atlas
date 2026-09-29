// URL <-> route mapping. Pure: shared by the app, the tests and the build step.

export const PAGE_PATHS = {
  home: '/',
  gallery: '/gallery',
  discover: '/discover',
  contact: '/contact',
};

export const nebulaPath = (id) => `/nebula/${encodeURIComponent(id)}`;

/** Collapse slashes, drop trailing slash and ".html", always start with "/". */
export function normalizePath(pathname) {
  let path = `/${pathname || ''}`.replace(/\/{2,}/g, '/');
  if (path.endsWith('.html')) path = path.slice(0, -'.html'.length);
  if (path.endsWith('/index')) path = path.slice(0, -'index'.length);
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

/** "/nebula-atlas/gallery" with base "/nebula-atlas/" -> "/gallery" */
export function stripBase(pathname, base = '/') {
  const root = base.replace(/\/+$/, '');
  if (!root) return pathname || '/';
  if (pathname === root) return '/';
  return pathname.startsWith(`${root}/`) ? pathname.slice(root.length) : pathname;
}

/** "/gallery?q=x" with base "/nebula-atlas/" -> "/nebula-atlas/gallery?q=x" */
export function withBase(to, base = '/') {
  const root = base.replace(/\/+$/, '');
  if (to === '/' || to === '') return `${root}/`;
  return `${root}${to.startsWith('/') ? to : `/${to}`}`;
}

export function matchRoute(pathname) {
  const path = normalizePath(pathname);
  for (const [name, pagePath] of Object.entries(PAGE_PATHS)) {
    if (path === pagePath) return { name, params: {} };
  }
  const nebula = /^\/nebula\/([^/]+)$/.exec(path);
  if (nebula) {
    let id = nebula[1];
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep the raw value; it simply won't match any nebula
    }
    return { name: 'nebula', params: { id } };
  }
  return { name: 'notFound', params: {} };
}
