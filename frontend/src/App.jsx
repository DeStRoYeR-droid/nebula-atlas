import { Suspense, lazy, useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig } from 'motion/react';
import { PageLocationContext } from './components/NebulaLink.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { MobileTabBar } from './components/layout/MobileTabBar.jsx';
import { Navbar, openSearch } from './components/layout/Navbar.jsx';
import { Sky } from './components/layout/Sky.jsx';
import { ErrorBoundary } from './components/states/ErrorBoundary.jsx';
import { PageLoading } from './components/states/Skeletons.jsx';
import { ErrorState, buttonClass } from './components/states/StatusMessage.jsx';
import { DataProvider, useNebulae } from './data/DataProvider.jsx';
import { usePageFocus } from './hooks/usePageFocus.js';
import { applyFilters, readGalleryParams } from './lib/search.js';
import HomePage from './pages/HomePage.jsx';
import { getLastAction } from './router/history.js';
import { Link, navigate, useLocation } from './router/Link.jsx';
import { matchRoute, nebulaPath } from './router/routes.js';

// Code splitting: only the home page ships in the initial bundle.
const GalleryPage = lazy(() => import('./pages/GalleryPage.jsx'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const loadModal = () => import('./components/NebulaModal.jsx');
const NebulaModal = lazy(loadModal);
const loadMotionFeatures = () => import('./motion-features.js').then((module) => module.default);

/** Page shown behind a nebula opened directly from its URL. */
const DEFAULT_BACKGROUND = { pathname: '/gallery', search: '' };

export default function App() {
  return (
    <ErrorBoundary fallback={({ error }) => <RootError error={error} />}>
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          <DataProvider>
            <Shell />
          </DataProvider>
        </MotionConfig>
      </LazyMotion>
    </ErrorBoundary>
  );
}

function renderPage(page, pageLocation, modalOpen) {
  switch (page.name) {
    case 'home':
      return <HomePage paused={modalOpen} />;
    case 'gallery':
      return <GalleryPage location={pageLocation} />;
    case 'discover':
      return <DiscoverPage />;
    case 'contact':
      return <ContactPage />;
    default:
      return <NotFoundPage nebulaId={page.params?.nebulaId} />;
  }
}

function PageFocus() {
  usePageFocus();
  return null;
}

function Shell() {
  const location = useLocation();
  const { status, nebulae, byId } = useNebulae();
  const route = matchRoute(location.pathname);

  // A nebula URL renders as a dialog over the page it was opened from.
  const isNebulaRoute = route.name === 'nebula';
  const nebula = isNebulaRoute && status === 'ready' ? (byId.get(route.params.id) ?? null) : null;
  const unknownNebula = isNebulaRoute && status === 'ready' && !nebula;
  const background = location.state?.background ?? DEFAULT_BACKGROUND;
  const showsBackground = isNebulaRoute && !unknownNebula;

  const pageLocation = useMemo(
    () =>
      showsBackground
        ? { pathname: background.pathname, search: background.search, state: {}, key: 'background' }
        : location,
    [showsBackground, background.pathname, background.search, location],
  );

  let page = unknownNebula
    ? { name: 'notFound', params: { nebulaId: route.params.id } }
    : matchRoute(pageLocation.pathname);
  if (showsBackground && (page.name === 'nebula' || page.name === 'notFound'))
    page = matchRoute(DEFAULT_BACKGROUND.pathname);
  const pageKey = `${page.name}:${page.params?.nebulaId ?? ''}`;

  const pageContext = useMemo(
    () => ({ pathname: pageLocation.pathname, search: pageLocation.search }),
    [pageLocation.pathname, pageLocation.search],
  );

  // Previous/next follows the list the visitor came from (e.g. a filtered gallery).
  const sequence = useMemo(() => {
    if (!nebula) return nebulae;
    if (pageLocation.pathname === '/gallery') {
      const filtered = applyFilters(nebulae, readGalleryParams(pageLocation.search));
      if (filtered.some((n) => n.id === nebula.id)) return filtered;
    }
    return nebulae;
  }, [nebula, nebulae, pageLocation.pathname, pageLocation.search]);

  const closeModal = useCallback(() => {
    if (location.state?.opened) navigate(-1);
    else navigate(`${background.pathname}${background.search}`, { replace: true });
  }, [location.state, background.pathname, background.search]);

  const goToNebula = useCallback(
    (id) => navigate(nebulaPath(id), { replace: true, state: location.state }),
    [location.state],
  );

  // New page: start at the top (focus moves to its heading via <PageFocus>).
  useEffect(() => {
    if (getLastAction() === 'PUSH') window.scrollTo(0, 0);
  }, [pageKey]);

  // Dialog closed: return focus to the tile/card of the nebula last shown.
  const lastShown = useRef(null);
  useEffect(() => {
    if (nebula) {
      lastShown.current = nebula.id;
      return;
    }
    const id = lastShown.current;
    if (!id) return;
    lastShown.current = null;
    requestAnimationFrame(() => {
      const target = document.querySelector(`[data-nebula-link="${id}"]`) ?? document.getElementById('page-title');
      target?.focus();
    });
  }, [nebula]);

  // Warm the dialog's code once the data is in, so the first click opens instantly.
  useEffect(() => {
    if (status !== 'ready') return undefined;
    const timer = setTimeout(loadModal, 1200);
    return () => clearTimeout(timer);
  }, [status]);

  // "/" jumps to search, like many sites.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || nebula) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      event.preventDefault();
      openSearch();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [nebula]);

  const modalOpen = Boolean(nebula);

  return (
    <PageLocationContext.Provider value={pageContext}>
      <Sky />
      <div inert={modalOpen} className="flex min-h-dvh flex-col pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-0">
        <a
          href="#main"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById('main')?.focus();
          }}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-on-accent"
        >
          Skip to main content
        </a>
        <Navbar activeRoute={page.name} />
        {/* min-h keeps the footer below the fold while content loads (no layout shift). */}
        <main id="main" tabIndex={-1} className="flex min-h-dvh flex-1 flex-col outline-none">
          <ErrorBoundary key={pageKey} fallback={({ reset }) => <PageError onRetry={reset} />}>
            <Suspense fallback={<PageLoading />}>
              {renderPage(page, pageLocation, modalOpen)}
              <PageFocus />
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
        <MobileTabBar activeRoute={page.name} />
      </div>

      <AnimatePresence>
        {nebula && (
          <ErrorBoundary
            key="nebula-dialog"
            fallback={({ reset }) => <DialogError onClose={closeModal} onRetry={reset} />}
          >
            <Suspense fallback={null}>
              <NebulaModal
                nebula={nebula}
                sequence={sequence}
                navState={location.state}
                onClose={closeModal}
                onNavigate={goToNebula}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </PageLocationContext.Provider>
  );
}

function PageError({ onRetry }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <ErrorState
        headingLevel={1}
        title="This page ran into a problem"
        message="Something unexpected went wrong while showing this page. Trying again usually fixes it."
        onRetry={onRetry}
        extraActions={
          <Link to="/" className={buttonClass.secondary}>
            Go to the home page
          </Link>
        }
      />
    </div>
  );
}

function DialogError({ onClose, onRetry }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Error"
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4"
    >
      <ErrorState
        title="This nebula couldn’t be shown"
        message="Something went wrong while opening it."
        onRetry={onRetry}
        extraActions={
          <button type="button" className={buttonClass.secondary} onClick={onClose}>
            Close
          </button>
        }
      />
    </div>
  );
}

/** Last-resort screen if the app shell itself fails. */
function RootError() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Sky />
      <ErrorState
        headingLevel={1}
        title="Nebula Atlas hit a snag"
        message="An unexpected error stopped the site from loading. Reloading the page usually fixes it."
        extraActions={
          <button type="button" className={buttonClass.primary} onClick={() => window.location.reload()}>
            Reload the page
          </button>
        }
      />
    </div>
  );
}
