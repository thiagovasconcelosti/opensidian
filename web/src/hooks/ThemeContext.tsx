import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { themesApi, BUILT_IN_THEMES, CustomTheme } from '../api/themes';

interface ThemeContextType {
  themeName: string;
  currentVariables: Record<string, string>;
  customThemes: CustomTheme[];
  selectTheme: (name: string) => void;
  saveCustomTheme: (theme: CustomTheme) => Promise<void>;
  deleteCustomTheme: (name: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>(null!);

const STORAGE_KEY = 'opensidian_theme';

function getStoredTheme(): string {
  return localStorage.getItem(STORAGE_KEY) || 'Claro';
}

function getAllThemes(custom: CustomTheme[]): CustomTheme[] {
  return [...BUILT_IN_THEMES, ...custom];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState(getStoredTheme);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);

  useEffect(() => {
    themesApi.list().then(res => setCustomThemes(res.themes)).catch(() => {});
  }, []);

  const currentVariables = useCallback(() => {
    const all = getAllThemes(customThemes);
    const found = all.find(t => t.name === themeName);
    return found?.variables || BUILT_IN_THEMES[0].variables;
  }, [themeName, customThemes])();

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, val] of Object.entries(currentVariables)) {
      root.style.setProperty(key, val as string);
    }
    localStorage.setItem(STORAGE_KEY, themeName);
  }, [themeName, currentVariables]);

  const selectTheme = useCallback((name: string) => {
    setThemeName(name);
  }, []);

  const saveCustomTheme = useCallback(async (theme: CustomTheme) => {
    await themesApi.save(theme);
    setCustomThemes(prev => {
      const filtered = prev.filter(t => t.name !== theme.name);
      return [...filtered, theme];
    });
    setThemeName(theme.name);
  }, []);

  const deleteCustomTheme = useCallback(async (name: string) => {
    await themesApi.delete(name);
    setCustomThemes(prev => prev.filter(t => t.name !== name));
    if (themeName === name) {
      setThemeName('Claro');
    }
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ themeName, currentVariables, customThemes, selectTheme, saveCustomTheme, deleteCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
