import React, {createContext, useContext, useEffect, useState, useMemo, useCallback} from 'react';
import {useColorScheme} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import {lightTheme, darkTheme, Theme, ThemeMode} from '../theme';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
  toggle: () => Promise<void>;
}

const STORAGE_KEY = 'theme_preference';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await EncryptedStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch {
        // ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const mode: ThemeMode = useMemo(() => {
    if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return preference;
  }, [preference, systemScheme]);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      await EncryptedStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(async () => {
    const next: ThemePreference = mode === 'dark' ? 'light' : 'dark';
    await setPreference(next);
  }, [mode, setPreference]);

  const value = useMemo(
    () => ({theme, mode, preference, setPreference, toggle}),
    [theme, mode, preference, setPreference, toggle],
  );

  if (!hydrated) {
    // Render with default light theme until preference is loaded — avoids flicker
    return (
      <ThemeContext.Provider value={value}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback: outside provider, return default light theme
    return lightTheme;
  }
  return ctx.theme;
};

export const useThemeContext = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return ctx;
};
