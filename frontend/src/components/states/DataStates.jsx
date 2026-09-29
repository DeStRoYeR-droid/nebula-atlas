import { DataError } from '../../lib/nebulae.js';
import { Link } from '../../router/Link.jsx';
import { Icon } from '../Icon.jsx';
import { ErrorState, StatusMessage, buttonClass } from './StatusMessage.jsx';

/** Shown when nebulae.json loads but contains no nebulae. */
export function EmptyAtlas() {
  return (
    <StatusMessage icon="astronaut" title="The atlas is empty">
      <p>No nebulae have been added yet. Check back soon.</p>
    </StatusMessage>
  );
}

/** Shown when nebulae.json can't be fetched or parsed. */
export function DataErrorState({ error, onRetry }) {
  const message =
    error instanceof DataError
      ? error.message
      : 'We couldn’t reach the nebula data. Check your connection and try again.';
  return (
    <ErrorState
      title="The atlas couldn’t load"
      message={message}
      onRetry={onRetry}
      extraActions={
        <Link to="/contact" className={buttonClass.secondary}>
          <Icon name="email" /> Report a problem
        </Link>
      }
    />
  );
}
