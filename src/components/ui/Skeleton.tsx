import React from 'react';

// Tonal shimmer block for loading states — matches the luxe surface palette,
// no spinners.
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-surface-container-high rounded ${className}`} aria-hidden="true" />
);
