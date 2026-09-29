import { assetUrl } from '../../config.js';

/** "NEBULA ATLAS" word mark with the round nebula logo (the favicon SVG). */
export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={assetUrl('favicon.svg')} alt="" width="28" height="28" className="size-7" decoding="async" />
      <span className="text-[1.05rem] tracking-[0.08em] text-fg">
        <span className="font-extrabold">NEBULA</span> <span className="font-medium">ATLAS</span>
      </span>
    </span>
  );
}
