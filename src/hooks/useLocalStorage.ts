import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Keep a stable copy of initialValue (functions should be called lazily)
  const initialRef = useRef(initialValue);

  const getInitial = (): T => {
    try {
      const raw = window?.localStorage?.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}":`, error as unknown as Error);
    }
    const iv = initialRef.current;
    return typeof iv === 'function' ? (iv as () => T)() : (iv as T);
  };

  const getDefault = (): T => {
    const iv = initialRef.current;
    return typeof iv === 'function' ? (iv as () => T)() : (iv as T);
  };

  const [storedValue, setStoredValue] = useState<T>(getInitial);

  // Listen for changes to this key in other tabs and global clear events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === key) {
          setStoredValue(e.newValue != null ? JSON.parse(e.newValue) : getInitial());
          return;
        }
        // Handle storage clear (e.key === null)
        if (e.key === null) {
          // Treat global clear as reset to default for this key, regardless of current storage contents
          setStoredValue(getDefault());
        }
      } catch (error) {
        logger.error(`Error parsing localStorage key "${key}" on change:`, error as unknown as Error);
        setStoredValue(getInitial());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  // Persist to localStorage and broadcast to same-tab listeners
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Avoid unnecessary updates
      if (Object.is(valueToStore, storedValue)) return;

      setStoredValue(valueToStore);
      window?.localStorage?.setItem(key, JSON.stringify(valueToStore));

      // Manually dispatch a storage event for same-tab synchronization
      try {
        const evt = new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(valueToStore),
          storageArea: window?.localStorage ?? null,
        });
        window.dispatchEvent(evt);
      } catch {
        // ignore if StorageEvent cannot be constructed in this environment
      }
    } catch (error) {
      logger.error(`Error setting localStorage key "${key}":`, error as unknown as Error);
    }
  };

  const removeValue = () => {
    try {
      const next = getDefault();
      setStoredValue(next);
      window?.localStorage?.removeItem(key);
      // Broadcast clear for this key to same-tab listeners
      try {
        const evt = new StorageEvent('storage', {
          key,
          newValue: null,
          storageArea: window?.localStorage ?? null,
        });
        window.dispatchEvent(evt);
      } catch {
        // ignore
      }
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}":`, error as unknown as Error);
    }
  };

  return [storedValue, setValue, removeValue];
}