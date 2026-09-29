import { Icon } from '../Icon.jsx';
import { setTheme, useTheme } from '../../lib/theme.js';

export function ThemeToggle({ className = '', withLabel = false }) {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={`inline-flex items-center gap-2 rounded-lg p-2 text-muted transition-colors hover:bg-fg/10 hover:text-fg ${className}`}
      aria-label={withLabel ? undefined : `Switch to ${next} theme`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="size-[1.05rem]" />
      {withLabel && <span>Switch to {next} theme</span>}
    </button>
  );
}
