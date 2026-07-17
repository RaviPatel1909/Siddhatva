import React from 'react';
import { Skeleton } from '../../ui/Skeleton';
import { ErrorState } from '../../ui/ErrorState';
import { EmptyState } from '../../ui/EmptyState';

interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Optional control rendered on the right of the header (e.g. a granularity select). */
  headerRight?: React.ReactNode;
  /** Per-widget state — each section recovers independently of the others. */
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingHeight?: string;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  children?: React.ReactNode;
}

// Shared section shell for the analytics widgets. Uses the same card chrome as the
// rest of the admin (surface-container-lowest + bronze-shadow + outline border) and
// owns the loading / error / empty / success branching so no widget leaves blank
// whitespace and one failed widget never blanks the page.
export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  icon,
  headerRight,
  isLoading = false,
  isError = false,
  isEmpty = false,
  onRetry,
  loadingHeight = 'h-48',
  emptyIcon = 'bar_chart',
  emptyTitle = 'Nothing to show yet',
  emptyDescription = 'Data will appear here once there is activity in this period.',
  className = '',
  children,
}) => (
  <section
    className={`bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow border border-outline-variant/20 ${className}`}
  >
    <div className="flex justify-between items-start gap-md mb-md">
      <div className="min-w-0">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
          {icon && <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>}
          {title}
        </h3>
        {subtitle && <p className="font-body-md text-body-md text-on-surface-variant mt-1">{subtitle}</p>}
      </div>
      {headerRight && <div className="shrink-0">{headerRight}</div>}
    </div>

    {isError ? (
      <ErrorState
        title="Couldn't load this section"
        message="This widget failed to load. The rest of the dashboard is unaffected."
        onRetry={onRetry}
      />
    ) : isLoading ? (
      <Skeleton className={`w-full ${loadingHeight} rounded-lg`} />
    ) : isEmpty ? (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
    ) : (
      children
    )}
  </section>
);
