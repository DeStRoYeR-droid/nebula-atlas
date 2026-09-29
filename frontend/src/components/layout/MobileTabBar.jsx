import { NavLink } from '../../router/Link.jsx';
import { Icon } from '../Icon.jsx';
import { NAV_ITEMS } from './Navbar.jsx';

/** Bottom tab bar on phones (< 640px), as in the mobile prototype. */
export function MobileTabBar({ activeRoute }) {
  return (
    <nav
      aria-label="Quick navigation"
      className="glass-strong fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {NAV_ITEMS.slice(0, 3).map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              activeRoute={activeRoute}
              className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-subtle transition-colors hover:text-fg aria-[current=page]:text-accent"
            >
              <Icon name={item.icon} className="size-[1.1rem]" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
