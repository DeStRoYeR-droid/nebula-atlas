import { memo } from 'react';

/** Fixed star-field background with a handful of CSS-only shooting stars. */
export const Sky = memo(function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className="shooting-star" />
      ))}
    </div>
  );
});
