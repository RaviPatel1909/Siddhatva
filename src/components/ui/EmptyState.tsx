import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inventory_2',
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-24 px-md">
    <span className="material-symbols-outlined text-6xl text-outline-variant mb-md">
      {icon}
    </span>
    <h3 className="font-display text-headline-md text-on-surface mb-sm">{title}</h3>
    {description && (
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-lg">
        {description}
      </p>
    )}
    {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
  </div>
);
