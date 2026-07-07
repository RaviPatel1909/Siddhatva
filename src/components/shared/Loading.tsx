import React from 'react';

// Design-system loading state shown by the route <Suspense> fallback while a
// lazily-loaded page chunk (or its data) resolves.
export const Loading: React.FC = () => (
  <div
    className="min-h-[60vh] flex flex-col items-center justify-center gap-md text-center"
    role="status"
    aria-live="polite"
  >
    <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
    <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Loading…</p>
  </div>
);
