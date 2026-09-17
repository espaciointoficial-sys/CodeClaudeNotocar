import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemePreference } from '@shared/types';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.api.settings.get().then((settings) => {
      setThemeState(settings.theme);
      applyTheme(settings.theme);
      setLoaded(true);
    });
  }, []);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    applyTheme(next);
    void window.api.settings.update({ theme: next });
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  if (!loaded) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider.');
  return ctx;
}
