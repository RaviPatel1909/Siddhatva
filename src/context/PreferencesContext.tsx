import React, { createContext, useContext, useEffect, useState } from 'react';

// Client-only user preferences — persisted to localStorage, no backend. Today
// this holds a single accessibility preference (reduce motion) that layers an
// in-app override on top of the OS `prefers-reduced-motion` media query already
// honored in src/index.css. New client-side preferences belong here.

const STORAGE_KEY = 'siddhatva:reduce-motion';

interface PreferencesValue {
  /** Force reduced motion regardless of the OS setting. */
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesValue | undefined>(undefined);

const readInitial = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false; // storage blocked (private mode / SSR-less guard)
  }
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reduceMotion, setReduceMotion] = useState<boolean>(readInitial);

  // Reflect the preference onto <html> so the CSS override (index.css) can act,
  // and persist it. Runs on mount too, restoring a saved preference before paint.
  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) root.setAttribute('data-reduce-motion', 'true');
    else root.removeAttribute('data-reduce-motion');
    try {
      localStorage.setItem(STORAGE_KEY, String(reduceMotion));
    } catch {
      /* storage unavailable — preference stays session-only */
    }
  }, [reduceMotion]);

  return (
    <PreferencesContext.Provider value={{ reduceMotion, setReduceMotion }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesValue => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
};
