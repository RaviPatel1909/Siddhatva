import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = "We couldn't load this content. Please try again.",
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-24 px-md" role="alert">
    <span className="material-symbols-outlined text-6xl text-error/80 mb-md">error</span>
    <h3 className="font-display text-headline-md text-on-surface mb-sm">{title}</h3>
    <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-lg">{message}</p>
    {onRetry && <Button onClick={onRetry}>Try Again</Button>}
  </div>
);
