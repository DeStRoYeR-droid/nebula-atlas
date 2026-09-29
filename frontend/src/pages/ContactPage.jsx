import { CONTACT_EMAIL, REPO_URL } from '../config.js';
import { Icon } from '../components/Icon.jsx';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.jsx';
import { useNebulae } from '../data/DataProvider.jsx';
import { pageMeta } from '../seo/meta.js';
import { useDocumentHead } from '../seo/useDocumentHead.js';

function ExternalLink({ href, children, className = '' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline ${className}`}
    >
      {children}
      <Icon name="external" className="size-3" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

const sectionClass = 'glass rounded-2xl p-5 sm:p-7';

export default function ContactPage() {
  const { status, nebulae } = useNebulae();
  useDocumentHead(pageMeta.contact());

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <header className="mb-8 mt-4">
        <h1
          id="page-title"
          tabIndex={-1}
          className="text-2xl font-extrabold uppercase tracking-[0.05em] text-fg sm:text-4xl"
        >
          Contact &amp; credits
        </h1>
      </header>

      <div className="flex flex-col gap-6">
        <section aria-labelledby="about-heading" className={sectionClass}>
          <h2 id="about-heading" className="mb-3 text-lg font-bold text-fg">
            About the atlas
          </h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Nebula Atlas is a small, open project that collects some of the most beautiful nebulae ever photographed,
            with a short description and key facts for each. Distances are approximate: astronomers refine them as
            measurements improve.
          </p>
        </section>

        <section aria-labelledby="contact-heading" className={sectionClass}>
          <h2 id="contact-heading" className="mb-3 text-lg font-bold text-fg">
            Get in touch
          </h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Spotted a mistake, or want to suggest a nebula? We’d love to hear from you.
          </p>
          {(REPO_URL || CONTACT_EMAIL) && (
            <ul className="mt-4 flex flex-wrap gap-3">
              {REPO_URL && (
                <li>
                  <ExternalLink
                    href={REPO_URL}
                    className="glass rounded-xl px-4 py-2.5 text-sm font-semibold no-underline"
                  >
                    <Icon name="github" /> Open an issue on GitHub
                  </ExternalLink>
                </li>
              )}
              {CONTACT_EMAIL && (
                <li>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-accent"
                  >
                    <Icon name="email" /> {CONTACT_EMAIL}
                  </a>
                </li>
              )}
            </ul>
          )}
        </section>

        <section aria-labelledby="credits-heading" className={sectionClass}>
          <h2 id="credits-heading" className="mb-3 text-lg font-bold text-fg">
            Image credits
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-muted sm:text-base">
            Images come from NASA, ESA/Hubble, ESA/Webb, ESO and NSF NOIRLab, used under their public image policies
            (NASA imagery is public domain; ESA, ESO and NOIRLab images are licensed CC BY 4.0).
          </p>
          {status === 'ready' && nebulae.length > 0 && (
            <ul className="divide-y divide-[var(--line)] text-sm">
              {nebulae.map((nebula) => (
                <li key={nebula.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
                  <span className="font-medium text-fg sm:w-48 sm:shrink-0">{nebula.name}</span>
                  <span className="text-muted">
                    {nebula.credits ?? 'Credit unavailable'}
                    {nebula.sourcePage && (
                      <>
                        {' · '}
                        <ExternalLink href={nebula.sourcePage}>Source</ExternalLink>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="built-heading" className={sectionClass}>
          <h2 id="built-heading" className="mb-3 text-lg font-bold text-fg">
            Built with
          </h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            React, Tailwind CSS, Motion and FastAPI. Icons by{' '}
            <ExternalLink href="https://fontawesome.com/">Font Awesome</ExternalLink> (CC BY 4.0).
          </p>
        </section>
      </div>
    </div>
  );
}
