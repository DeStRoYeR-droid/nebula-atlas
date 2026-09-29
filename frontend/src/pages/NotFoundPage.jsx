import { useMemo } from 'react';
import { Icon } from '../components/Icon.jsx';
import { NebulaLink } from '../components/NebulaLink.jsx';
import { StatusMessage, buttonClass } from '../components/states/StatusMessage.jsx';
import { useNebulae } from '../data/DataProvider.jsx';
import { suggestNebulae } from '../lib/search.js';
import { Link, navigate } from '../router/Link.jsx';
import { pageMeta } from '../seo/meta.js';
import { useDocumentHead } from '../seo/useDocumentHead.js';

/** Custom 404. Also used for /nebula/<id> when the id doesn't exist. */
export default function NotFoundPage({ nebulaId }) {
  const { nebulae } = useNebulae();
  useDocumentHead(pageMeta.notFound());
  const suggestions = useMemo(() => (nebulaId ? suggestNebulae(nebulae, nebulaId) : []), [nebulae, nebulaId]);
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <StatusMessage
        icon="astronaut"
        headingLevel={1}
        headingId="page-title"
        title={
          <>
            <span className="block text-5xl font-extrabold tracking-tight text-accent sm:text-6xl">404</span>{' '}
            <span className="mt-2 block">{nebulaId ? 'Nebula not found' : 'Lost in space'}</span>
          </>
        }
        actions={
          <>
            {canGoBack && (
              <button type="button" className={buttonClass.secondary} onClick={() => navigate(-1)}>
                <Icon name="back" /> Go back
              </button>
            )}
            <Link to="/" className={buttonClass.primary}>
              <Icon name="home" /> Home
            </Link>
            <Link to="/gallery" className={buttonClass.secondary}>
              <Icon name="gallery" /> Browse the gallery
            </Link>
          </>
        }
      >
        {nebulaId ? (
          <p>
            There’s no nebula called “<span className="break-all font-medium text-fg">{nebulaId}</span>” in the atlas.
          </p>
        ) : (
          <p>This page drifted out of the atlas. It may have moved, or the address may be mistyped.</p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-fg">Did you mean…</h2>
            <ul className="flex flex-wrap justify-center gap-2">
              {suggestions.map((nebula) => (
                <li key={nebula.id}>
                  <NebulaLink
                    nebula={nebula}
                    className="glass inline-block rounded-full px-3.5 py-1.5 text-sm text-accent hover:underline"
                  >
                    {nebula.name}
                  </NebulaLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </StatusMessage>
    </div>
  );
}
