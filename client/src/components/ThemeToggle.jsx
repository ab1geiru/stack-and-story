import { useTheme } from '../lib/theme.jsx';
import { SunIcon, MoonIcon } from './Icons.jsx';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label="Dark mode"
      aria-pressed={dark}
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
    >
      {dark ? <MoonIcon /> : <SunIcon />}
      <span className={styles.label}>{dark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
