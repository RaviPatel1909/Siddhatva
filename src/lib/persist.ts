// Small, safe localStorage layer. Keys are namespaced (siddhatva:*) and each
// payload is versioned, so a shape change is a version bump (old data is
// ignored, not mis-read). Every access is guarded so a corrupt value, a
// disabled/full store, or SSR (no window) can never crash the app.
const PREFIX = 'siddhatva';

export function loadPersisted<T>(key: string, version: number, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(`${PREFIX}:${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { v?: number; data?: unknown };
    if (!parsed || parsed.v !== version) return fallback;
    return parsed.data as T;
  } catch {
    return fallback;
  }
}

export function savePersisted<T>(key: string, version: number, data: T): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify({ v: version, data }));
  } catch {
    /* ignore quota / unavailable storage */
  }
}
