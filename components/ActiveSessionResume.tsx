import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';

const STORAGE_KEY = 'z-fit-active-session-id';

function extractSessionIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/workout/')) {
      const parts = parsed.pathname.split('/');
      const id = parts[2];
      return id || null;
    }
    if (parsed.pathname === '/workout') {
      const id = parsed.searchParams.get('sessionId');
      return id || null;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ActiveSessionResume() {
  const currentPath = usePathname();
  const appState = useRef(AppState.currentState);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const id = extractSessionIdFromUrl(initialUrl);
        if (id) {
          if (!currentPath?.startsWith(`/workout/${id}`)) router.replace(`/workout/${id}`);
          return;
        }
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && !currentPath?.startsWith(`/workout/${stored}`)) {
        router.replace(`/workout/${stored}`);
      }
    };
    handleInitialUrl();
  }, [currentPath]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const id = extractSessionIdFromUrl(url);
      if (id && !currentPath?.startsWith(`/workout/${id}`)) {
        router.replace(`/workout/${id}`);
      }
    });
    return () => sub.remove();
  }, [currentPath]);

  useEffect(() => {
    const handleChange = async (nextState: string) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (isNavigatingRef.current) return;
        isNavigatingRef.current = true;
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored && !currentPath?.startsWith(`/workout/${stored}`)) {
            router.replace(`/workout/${stored}`);
          }
        } finally {
          isNavigatingRef.current = false;
        }
      }
      appState.current = nextState;
    };
    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [currentPath]);

  return null;
}


