import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const ls = typeof window !== 'undefined' ? window.localStorage : undefined;
      const item = ls ? ls.getItem(key) : null;
      if (item != null) {
        return JSON.parse(item);
      }
      // Support lazy init function
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    } catch (error) {
      // If error also return initialValue
      logger.error(`Error reading localStorage key "${key}": ${error instanceof Error ? error.message : String(error)}`);
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
  });

  // Listen for changes to this key in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
        } catch (error) {
          logger.error(`Error parsing localStorage key "${key}" on change: ${error instanceof Error ? error.message : String(error)}`);
          setStoredValue(initialValue);
        }
      } else if (e.key === null) {
        // localStorage.clear() was called
        setStoredValue(typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Manually dispatch a storage event so other hook instances in the same tab update
        try {
          const evt = new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(valueToStore),
            storageArea: window.localStorage,
          });
          window.dispatchEvent(evt);
        } catch {
          // no-op in environments without StorageEvent constructor
        }
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      logger.error(`Error setting localStorage key "${key}": ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        try {
          const evt = new StorageEvent('storage', {
            key,
            newValue: null,
            storageArea: window.localStorage,
          });
          window.dispatchEvent(evt);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}": ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return [storedValue, setValue, removeValue];
}