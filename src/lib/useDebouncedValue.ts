import { useEffect, useState } from 'react';

// Debounce a rapidly-changing value (e.g. a search input) so downstream effects
// or queries fire only once it settles, not on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
