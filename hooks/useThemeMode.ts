import { useColorScheme as useSystemColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'z-fit-theme-mode';

export function useThemeMode() {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          setThemeModeState(stored as ThemeMode);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Force re-render when theme mode changes
  useEffect(() => {
    if (isLoaded) {
      // Trigger a small delay to ensure theme propagates
      const timer = setTimeout(() => {}, 0);
      return () => clearTimeout(timer);
    }
  }, [themeMode, isLoaded]);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const effectiveColorScheme = themeMode === 'system' ? systemColorScheme : themeMode;

  return {
    themeMode,
    setThemeMode,
    effectiveColorScheme,
    isLoaded,
  };
}
