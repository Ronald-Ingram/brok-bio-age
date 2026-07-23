"use client";

import {
  readHideIdsPreference,
  writeHideIdsPreference,
} from "@/lib/hideIds";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface HideIdsContextValue {
  hideIds: boolean;
  setHideIds: (on: boolean) => void;
  toggleHideIds: () => void;
  ready: boolean;
}

const HideIdsContext = createContext<HideIdsContextValue | null>(null);

export function HideIdsProvider({ children }: { children: ReactNode }) {
  const [hideIds, setHideIdsState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHideIdsState(readHideIdsPreference());
    setReady(true);
  }, []);

  const setHideIds = useCallback((on: boolean) => {
    setHideIdsState(on);
    writeHideIdsPreference(on);
  }, []);

  const toggleHideIds = useCallback(() => {
    setHideIdsState((prev) => {
      const next = !prev;
      writeHideIdsPreference(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ hideIds, setHideIds, toggleHideIds, ready }),
    [hideIds, setHideIds, toggleHideIds, ready]
  );

  return (
    <HideIdsContext.Provider value={value}>{children}</HideIdsContext.Provider>
  );
}

export function useHideIds(): HideIdsContextValue {
  const ctx = useContext(HideIdsContext);
  if (!ctx) {
    // Safe default if a tree forgets the provider (SSR / tests)
    return {
      hideIds: false,
      setHideIds: () => {},
      toggleHideIds: () => {},
      ready: false,
    };
  }
  return ctx;
}
