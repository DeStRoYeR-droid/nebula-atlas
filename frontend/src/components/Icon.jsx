// Font Awesome icons rendered as inline SVG straight from the icon definitions.
// This avoids the Font Awesome runtime/CSS: only the icons imported here ship.
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faBars,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCompass,
  faEnvelope,
  faHouse,
  faImage,
  faImages,
  faMagnifyingGlass,
  faMoon,
  faPause,
  faPlay,
  faRotateRight,
  faSun,
  faTriangleExclamation,
  faUserAstronaut,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

export const icons = {
  back: faArrowLeft,
  external: faArrowUpRightFromSquare,
  menu: faBars,
  chevronDown: faChevronDown,
  chevronLeft: faChevronLeft,
  chevronRight: faChevronRight,
  chevronUp: faChevronUp,
  compass: faCompass,
  email: faEnvelope,
  home: faHouse,
  image: faImage,
  gallery: faImages,
  search: faMagnifyingGlass,
  moon: faMoon,
  pause: faPause,
  play: faPlay,
  retry: faRotateRight,
  sun: faSun,
  warning: faTriangleExclamation,
  astronaut: faUserAstronaut,
  close: faXmark,
  github: faGithub,
};

/**
 * <Icon name="search" /> - decorative by default (hidden from screen readers).
 * Pass `label` when the icon is the only content that conveys meaning.
 */
export function Icon({ name, className = 'size-4', label }) {
  const definition = icons[name];
  if (!definition) return null;
  const [width, height, , , path] = definition.icon;
  const paths = Array.isArray(path) ? path : [path];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`inline-block shrink-0 ${className}`}
      fill="currentColor"
      focusable="false"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}
