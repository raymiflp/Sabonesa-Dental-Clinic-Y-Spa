import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

const ThemeContext = createContext(undefined);

const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (e.g., SSR or privacy mode)
  }
  return 'system';
};

const resolveTheme = (theme) => {
  if (typeof window === 'undefined') return 'light';
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeClass = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolveTheme(theme));
};

export function ThemeProvider({ children, defaultTheme = 'system' }) {
  const [theme, setThemeState] = useState(() => {
    const initial = getInitialTheme();
    return initial || defaultTheme;
  });
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(theme));

  useEffect(() => {
    applyThemeClass(theme);
    setResolvedTheme(resolveTheme(theme));

    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyThemeClass('system');
        setResolvedTheme(resolveTheme('system'));
      }
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    setThemeState(next);
  };

  const value = { theme, setTheme, resolvedTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}

export default ThemeContext;