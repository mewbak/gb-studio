import { useCallback, useEffect, useState } from "react";

export function useLocalStorageState<T>(
  defaultValue: T,
  key: string,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {}
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  const set: typeof setValue = useCallback((update) => {
    setValue((prev) =>
      typeof update === "function" ? (update as (prev: T) => T)(prev) : update,
    );
  }, []);

  return [value, set];
}
