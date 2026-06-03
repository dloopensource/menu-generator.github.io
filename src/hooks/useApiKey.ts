import { useCallback, useState } from "react";

export const API_KEY_STORAGE_KEY = "menu-generator.geminiApiKey";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const clearApiKey = useCallback(() => {
    try {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setApiKeyState(null);
  }, []);

  const setApiKey = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        clearApiKey();
        return;
      }
      try {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
      } catch {
        /* localStorage disabled — fall back to in-memory state only */
      }
      setApiKeyState(trimmed);
    },
    [clearApiKey],
  );

  return { apiKey, setApiKey, clearApiKey };
}
