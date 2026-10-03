import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'stack-and-story-theme';
const ThemeContext = createContext(null);
const validChoice = (value) => value === 'light' || value === 'dark' ? value : null;

function savedChoice() {
  try {
    return validChoice(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(savedChoice);
  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const theme = choice ?? systemTheme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) setChoice(validChoice(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useLayoutEffect(() => {
    // Change the palette together, without briefly fading readable text into the opposite surface.
    const root = document.documentElement;
    root.classList.add('theme-changing');
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17131f' : '#f8f6fc');
    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => root.classList.remove('theme-changing'));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      root.classList.remove('theme-changing');
    };
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggleTheme() {
      const next = theme === 'dark' ? 'light' : 'dark';
      setChoice(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Keep the choice for this visit even if it cannot be saved.
      }
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
