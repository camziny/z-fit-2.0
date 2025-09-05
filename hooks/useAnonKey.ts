import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const ANON_KEY_STORAGE = 'z-fit-anon-key';

export function useAnonKey() {
  const [anonKey, setAnonKey] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const existing = await AsyncStorage.getItem(ANON_KEY_STORAGE);
        if (existing) {
          setAnonKey(existing);
        } else {
          const generated = `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
          await AsyncStorage.setItem(ANON_KEY_STORAGE, generated);
          setAnonKey(generated);
        }
      } catch (e) {
        // noop
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  return { anonKey, isLoaded } as const;
}


