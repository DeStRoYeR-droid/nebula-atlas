import { Icon } from '../Icon.jsx';

/** Shared layout for empty, error and "not found" messages. */
export function StatusMessage({ icon, title, children, actions, headingLevel = 2, headingId, tone = 'neutral', role }) {
  const Heading = `h${headingLevel}`;
  return (
    <div
      role={role}
      className="glass mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center sm:px-10"
    >
      {icon && (
        <span
          className={`flex size-14 items-center justify-center rounded-full ${tone === 'error' ? 'bg-red-500/15 text-red-600 dark:text-red-300' : 'bg-accent/15 text-accent'}`}
        >
          <Icon name={icon} className="size-6" />
        </span>
      )}
      <Heading id={headingId} tabIndex={headingId ? -1 : undefined} className="text-xl font-bold tracking-wide text-fg">
        {title}
      </Heading>
      {children && <div className="max-w-prose text-sm leading-relaxed text-muted sm:text-base">{children}</div>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

export const buttonClass = {
  primary:
    'inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong',
  secondary:
    'glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-fg/10',
};

export function ErrorState({ title = 'Something went wrong', message, onRetry, extraActions, headingLevel }) {
  return (
    <StatusMessage
      icon="warning"
      tone="error"
      role="alert"
      title={title}
      headingLevel={headingLevel}
      actions={
        <>
          {onRetry && (
            <button type="button" className={buttonClass.primary} onClick={onRetry}>
              <Icon name="retry" /> Try again
            </button>
          )}
          {extraActions}
        </>
      }
    >
      <p>{message ?? 'An unexpected error stopped this part of the atlas from loading.'}</p>
    </StatusMessage>
  );
}
