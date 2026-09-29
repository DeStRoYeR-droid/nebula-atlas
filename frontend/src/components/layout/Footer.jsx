import { Link } from '../../router/Link.jsx';
import { NAV_ITEMS } from './Navbar.jsx';

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-subtle sm:px-6 lg:flex-row lg:items-center lg:justify-between xl:max-w-[88rem]">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="rounded hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p>
          © {new Date().getFullYear()} Nebula Atlas · Images: NASA, ESA, CSA, ESO, NOIRLab{' '}
          <Link to="/contact" className="underline decoration-line underline-offset-4 hover:text-fg">
            and partners
          </Link>
        </p>
      </div>
    </footer>
  );
}
