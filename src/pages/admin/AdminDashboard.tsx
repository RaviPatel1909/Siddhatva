import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useQuery } from '@tanstack/react-query';
import { getAdminOrders, getAdminStats } from '../../api/admin';
import { formatPrice } from '../../lib/money';

// Tallest bar's height budget (px) in the sales chart.
const CHART_MAX_PX = 220;

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const TONE_CLASSES = {
  neutral: 'bg-surface-container-highest text-on-surface-variant',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
} as const;

const SummaryRow: React.FC<{
  label: string;
  value: string;
  tone: keyof typeof TONE_CLASSES;
  loading?: boolean;
  last?: boolean;
}> = ({ label, value, tone, loading, last }) => (
  <div
    className={`flex justify-between items-center ${last ? '' : 'pb-sm border-b border-outline-variant/30'}`}
  >
    <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
    {loading ? (
      <Skeleton className="h-6 w-16 rounded-full" />
    ) : (
      <span className={`${TONE_CLASSES[tone]} px-sm py-1 rounded-full text-label-sm font-label-sm`}>
        {value}
      </span>
    )}
  </div>
);

const pluralize = (n: number, singular: string) => `${n} ${singular}${n === 1 ? '' : 's'}`;

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({ queryKey: ['admin', 'stats'], queryFn: getAdminStats });
  const { data: ordersData } = useQuery({ queryKey: ['admin', 'orders'], queryFn: getAdminOrders });
  const orders = ordersData?.items ?? [];
  const recentOrders = orders.slice(0, 4);

  const sales = stats?.salesByMonth ?? [];
  const maxRevenue = sales.reduce((max, s) => Math.max(max, s.revenue), 0);

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Dashboard Overview</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Welcome back. Here is what is happening with Siddhatva Luxury today.
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="px-md py-sm bg-surface-container-high border border-outline-variant rounded-full text-on-surface font-label-sm text-label-sm flex items-center gap-xs hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Last 30 Days
          </button>
          <button className="px-md py-sm bg-primary text-on-primary rounded-full text-label-sm font-label-sm flex items-center gap-xs bronze-shadow">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Report
          </button>
        </div>
      </div>

      {/* KPI cards — real aggregates from GET /admin/stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : statsError || !stats ? (
          <div className="md:col-span-2 lg:col-span-4 bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant">error</span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
              Couldn't load dashboard stats. Check the API and try again.
            </p>
          </div>
        ) : (
          <>
            <StatCard
              icon="payments"
              label="Total Revenue"
              value={formatPrice(stats.revenue)}
              accent="primary"
              footnote={`From ${pluralize(stats.paidOrders, 'paid order')}`}
            />
            <StatCard
              icon="local_mall"
              label="Total Orders"
              value={String(stats.orders)}
              accent="secondary"
              footnote={`${stats.paidOrders} paid`}
            />
            <StatCard
              icon="group"
              label="Customers"
              value={String(stats.customers)}
              accent="tertiary"
              footnote="Registered accounts"
            />
            <StatCard
              icon="receipt_long"
              label="Avg Order Value"
              value={formatPrice(stats.avgOrderValue)}
              accent="outline"
              footnote="Per paid order"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        {/* Sales Performance — monthly paid revenue */}
        <div className="lg:col-span-2 bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow relative overflow-hidden h-[450px] border border-outline-variant/20">
          <div className="flex justify-between items-center mb-lg">
            <div>
              <h4 className="font-headline-md text-headline-md text-on-surface">Sales Performance</h4>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Monthly revenue from paid orders (last {sales.length || 6} months).
              </p>
            </div>
            <div className="flex items-center gap-xs text-outline font-label-sm text-label-sm">
              <span className="w-3 h-3 rounded-full bg-primary" /> Revenue
            </div>
          </div>
          <div className="w-full h-64 relative mt-lg">
            {statsLoading ? (
              <Skeleton className="absolute inset-0 rounded-lg" />
            ) : statsError ? (
              <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant font-body-md">
                Couldn't load sales data.
              </div>
            ) : (
              <>
                <div className="absolute inset-0 flex items-end justify-between px-md pb-xs border-b border-l border-outline-variant/30">
                  {sales.map((point, i) => (
                    <div
                      key={point.month}
                      className="w-12 rounded-t-lg bg-primary transition-all duration-500"
                      style={{
                        height: maxRevenue > 0 ? `${(point.revenue / maxRevenue) * CHART_MAX_PX}px` : '0px',
                        opacity: 0.4 + (i / Math.max(sales.length - 1, 1)) * 0.6,
                      }}
                      title={`${point.month}: ${formatPrice(point.revenue)}`}
                    />
                  ))}
                </div>
                {maxRevenue === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-md">
                    <span className="material-symbols-outlined text-5xl text-outline-variant mb-xs">bar_chart</span>
                    <p className="font-body-md text-body-md text-on-surface-variant">No paid sales yet</p>
                    <p className="text-[11px] text-outline">
                      Monthly revenue will chart here once orders are paid.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-between text-outline font-label-sm text-label-sm mt-md px-md">
            {(statsLoading || statsError ? [] : sales).map((point) => (
              <span key={point.month}>{point.month}</span>
            ))}
          </div>
        </div>

        {/* Quick Summary — real inventory + content health */}
        <div className="bg-surface-container-high p-lg rounded-xl border border-outline-variant/30">
          <h4 className="font-headline-md text-headline-md text-on-surface mb-md">Quick Summary</h4>
          {statsError ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Couldn't load summary.</p>
          ) : (
            <div className="space-y-md">
              <SummaryRow
                label="Low Stock Alerts"
                loading={statsLoading}
                value={stats ? pluralize(stats.lowStock, 'item') : ''}
                tone={stats && stats.lowStock > 0 ? 'warning' : 'neutral'}
              />
              <SummaryRow
                label="Out of Stock"
                loading={statsLoading}
                value={stats ? pluralize(stats.outOfStock, 'item') : ''}
                tone={stats && stats.outOfStock > 0 ? 'danger' : 'neutral'}
              />
              <SummaryRow
                label="Products"
                loading={statsLoading}
                value={stats ? String(stats.products) : ''}
                tone="neutral"
              />
              <SummaryRow
                label="Customer Reviews"
                loading={statsLoading}
                value={stats ? pluralize(stats.reviews, 'review') : ''}
                tone="neutral"
                last
              />
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mt-xl bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow border border-outline-variant/20">
        <div className="flex justify-between items-center mb-lg">
          <h4 className="font-headline-md text-headline-md text-on-surface">Recent Orders</h4>
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-primary font-label-sm text-label-sm flex items-center gap-xs hover:underline decoration-primary underline-offset-4"
          >
            View All Orders <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-xl text-center">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-xs">receipt_long</span>
            <p className="font-body-md text-body-md text-on-surface-variant">No orders yet</p>
            <p className="text-[11px] text-outline">Orders placed by customers will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant/30">
                  <tr>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Order ID</th>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Customer Name</th>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Date</th>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Status</th>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                      <td className="py-md text-primary font-medium">#{order.id}</td>
                      <td className="py-md flex items-center gap-sm">
                        <div className="w-8 h-8 rounded-full bg-secondary-fixed-dim flex items-center justify-center text-[10px] font-bold">
                          {initials(order.customerName)}
                        </div>
                        <span>{order.customerName}</span>
                      </td>
                      <td className="py-md text-on-surface-variant">
                        {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-md">
                        <Badge variant={order.status}>{order.status}</Badge>
                      </td>
                      <td className="py-md text-right font-medium">{formatPrice(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-lg flex justify-between items-center">
              <p className="text-xs text-on-surface-variant">
                Showing {recentOrders.length} of {orders.length} orders
              </p>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
