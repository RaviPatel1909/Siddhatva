import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Seo } from '../../components/seo/Seo';
import { StatCard } from '../../components/shared/StatCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { AnalyticsCard } from '../../components/admin/analytics/AnalyticsCard';
import { getAnalyticsOverview, type AnalyticsOverview } from '../../api/admin';
import { queryKeys } from '../../api/queryKeys';
import { formatPrice } from '../../lib/money';
import { DEFAULT_PRESET, resolveRange } from '../../lib/analyticsFilters';

// KPI tile definitions — value pulled from the overview DTO, money via formatPrice.
const KPI_TILES: {
  key: keyof AnalyticsOverview;
  label: string;
  icon: string;
  accent: 'primary' | 'secondary' | 'tertiary' | 'outline';
  money?: boolean;
  footnote?: string;
}[] = [
  { key: 'revenue', label: 'Revenue', icon: 'payments', accent: 'primary', money: true, footnote: 'Paid orders only' },
  { key: 'orders', label: 'Orders', icon: 'local_mall', accent: 'secondary', footnote: 'All statuses' },
  { key: 'paidOrders', label: 'Paid Orders', icon: 'task_alt', accent: 'tertiary', footnote: 'Payment captured' },
  { key: 'averageOrderValue', label: 'Avg Order Value', icon: 'receipt_long', accent: 'outline', money: true, footnote: 'Per paid order' },
  { key: 'customers', label: 'Customers', icon: 'group', accent: 'primary', footnote: 'Registered in range' },
  { key: 'lowStock', label: 'Low Stock', icon: 'warning', accent: 'secondary', footnote: 'Current stock ≤ 5' },
  { key: 'outOfStock', label: 'Out of Stock', icon: 'production_quantity_limits', accent: 'tertiary', footnote: 'Current, all-time' },
  { key: 'reviews', label: 'Reviews', icon: 'reviews', accent: 'outline', footnote: 'In range' },
];

export const AnalyticsPage: React.FC = () => {
  // Fixed default range for now; the filter bar wires this to the URL next.
  const { from, to } = resolveRange(DEFAULT_PRESET);

  const overview = useQuery({
    queryKey: queryKeys.adminAnalyticsOverview(from, to),
    queryFn: () => getAnalyticsOverview({ from, to }),
  });

  const o = overview.data;

  return (
    <AdminLayout>
      <Seo title="Analytics" noindex />

      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Analytics</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Revenue, orders, customers and inventory at a glance.
          </p>
        </div>
      </div>

      {/* KPI cards — all eight from GET /admin/analytics/overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
        {overview.isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : overview.isError || !o ? (
          <div className="col-span-2 lg:col-span-4 bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg text-center" role="alert">
            <span className="material-symbols-outlined text-4xl text-error/80">error</span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-sm mb-md">
              Couldn't load the headline metrics.
            </p>
            <Button variant="secondary" size="sm" onClick={() => overview.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          KPI_TILES.map((tile) => (
            <StatCard
              key={tile.key}
              icon={tile.icon}
              label={tile.label}
              value={tile.money ? formatPrice(o[tile.key]) : String(o[tile.key])}
              accent={tile.accent}
              footnote={tile.footnote}
            />
          ))
        )}
      </div>

      {/* Inventory summary — actionable callout, sourced from the same overview query */}
      <AnalyticsCard
        title="Inventory Summary"
        subtitle="Current stock health (not affected by the date range)."
        icon="inventory_2"
        isLoading={overview.isLoading}
        isError={overview.isError}
        onRetry={() => overview.refetch()}
        loadingHeight="h-24"
      >
        {o && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div className="flex items-center justify-between p-md rounded-lg border border-outline-variant/30 bg-surface-container-low">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-warning">warning</span>
                <span className="font-body-md text-body-md text-on-surface">Low stock variants</span>
              </div>
              <span className="font-display text-headline-md text-on-surface">{o.lowStock}</span>
            </div>
            <div className="flex items-center justify-between p-md rounded-lg border border-outline-variant/30 bg-surface-container-low">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-danger">production_quantity_limits</span>
                <span className="font-body-md text-body-md text-on-surface">Out of stock variants</span>
              </div>
              <span className="font-display text-headline-md text-on-surface">{o.outOfStock}</span>
            </div>
            <div className="sm:col-span-2">
              {o.lowStock + o.outOfStock > 0 ? (
                <Link
                  to="/admin/products"
                  className="inline-flex items-center gap-1 text-label-sm font-label-sm text-primary hover:opacity-80 transition-opacity"
                >
                  Review inventory in Products
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  All variants are comfortably stocked.
                </p>
              )}
            </div>
          </div>
        )}
      </AnalyticsCard>
    </AdminLayout>
  );
};
