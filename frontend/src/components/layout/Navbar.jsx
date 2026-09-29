import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, navigate } from '../../router/Link.jsx';
import { Icon } from '../Icon.jsx';
import { Logo } from './Logo.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/gallery', label: 'Gallery', icon: 'gallery' },
  { to: '/discover', label: 'Discover', icon: 'compass' },
  { to: '/contact', label: 'Contact', icon: 'email' },
];

export function openSearch() {
  navigate('/gallery', { state: { focusSearch: true } });
}

const linkClass =
  'relative rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg aria-[current=page]:text-fg ' +
  'after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform aria-[current=page]:after:scale-x-100';

export function Navbar({ activeRoute }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef(null);

  // Close the mobile menu whenever the page changes.
  useEffect(() => setMenuOpen(false), [activeRoute]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="relative z-30 border-b border-line bg-bg/60 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 sm:px-6 xl:max-w-[88rem]"
      >
        <Link to="/" className="mr-auto flex items-center rounded-md py-1" aria-label="Nebula Atlas, home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} activeRoute={activeRoute} className={linkClass}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={openSearch}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-fg/10 hover:text-fg"
          aria-label="Search nebulae"
          aria-keyshortcuts="/"
        >
          <Icon name="search" className="size-[1.05rem]" />
        </button>
        <span className="hidden sm:contents">
          <ThemeToggle />
        </span>
        <button
          ref={menuButton}
          type="button"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-fg/10 hover:text-fg sm:hidden"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} className="size-5" />
        </button>
      </nav>

      {/* Solid rather than glass: a backdrop blur doesn't work inside the (already blurred) header. */}
      <div
        id={menuId}
        hidden={!menuOpen}
        className="absolute inset-x-3 top-full mt-2 rounded-2xl border border-line bg-elev p-2 shadow-2xl sm:hidden"
      >
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                activeRoute={activeRoute}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-base text-muted hover:bg-fg/5 hover:text-fg aria-[current=page]:bg-fg/10 aria-[current=page]:text-fg"
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} className="size-4 text-accent" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-line pt-1">
          <ThemeToggle withLabel className="w-full px-3 py-3 text-base" />
        </div>
      </div>
    </header>
  );
}
