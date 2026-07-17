import React from 'react';
import { AnalyticsCard } from './AnalyticsCard';
import { Badge, type BadgeVariant } from '../../ui/Badge';
import { formatPrice } from '../../../lib/money';
import type { AnalyticsCustomers, AnalyticsOrders, TopProduct } from '../../../api/admin';

interface WidgetState {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Orders overview — three INDEPENDENT status axes, shown side by side and never
// flattened. An order holds one state on each axis at once.
// ---------------------------------------------------------------------------
const FULFILLMENT: { key: keyof AnalyticsOrders['fulfillment']; label: string; variant: BadgeVariant }[] = [
  { key: 'processing', label: 'Processing', variant: 'processing' },
  { key: 'shipped', label: 'Shipped', variant: 'shipped' },
  { key: 'delivered', label: 'Delivered', variant: 'delivered' },
  { key: 'cancelled', label: 'Cancelled', variant: 'cancelled' },
];
const PAYMENT: { key: keyof AnalyticsOrders['payment']; label: string }[] = [
  { key: 'paid', label: 'Paid' },
  { key: 'pendingPayment', label: 'Pending' },
  { key: 'failedPayment', label: 'Failed' },
];
const SHIPPING: { key: keyof AnalyticsOrders['shipping']; label: string }[] = [
  { key: 'notShipped', label: 'Not Shipped' },
  { key: 'shipmentCreated', label: 'Shipment Created' },
  { key: 'inTransit', label: 'In Transit' },
  { key: 'outForDelivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const AxisColumn: React.FC<{ heading: string; children: React.ReactNode }> = ({ heading, children }) => (
  <div>
    <h4 className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-sm">{heading}</h4>
    <div className="space-y-xs">{children}</div>
  </div>
);

const CountRow: React.FC<{ label: React.ReactNode; count: number }> = ({ label, count }) => (
  <div className="flex items-center justify-between gap-sm py-1">
    <span className="min-w-0">{label}</span>
    <span className="font-medium text-on-surface tabular-nums">{count}</span>
  </div>
);

export const OrdersBreakdown: React.FC<{ data?: AnalyticsOrders } & WidgetState> = ({
  data,
  isLoading,
  isError,
  onRetry,
}) => {
  const total = data
    ? Object.values(data.fulfillment).reduce((a, b) => a + b, 0)
    : 0;
  return (
    <AnalyticsCard
      title="Orders Overview"
      subtitle="Three independent lifecycle axes — an order has one state on each."
      icon="receipt_long"
      isLoading={isLoading}
      isError={isError}
      isEmpty={!!data && total === 0}
      onRetry={onRetry}
      emptyIcon="receipt_long"
      emptyTitle="No orders in this period"
      emptyDescription="Order counts will appear here once orders are placed in this range."
    >
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg font-body-md text-body-md text-on-surface-variant">
          <AxisColumn heading="Fulfillment">
            {FULFILLMENT.map((f) => (
              <CountRow key={f.key} label={<Badge variant={f.variant}>{f.label}</Badge>} count={data.fulfillment[f.key]} />
            ))}
          </AxisColumn>
          <AxisColumn heading="Payment">
            {PAYMENT.map((p) => (
              <CountRow key={p.key} label={p.label} count={data.payment[p.key]} />
            ))}
          </AxisColumn>
          <AxisColumn heading="Shipping">
            {SHIPPING.map((s) => (
              <CountRow key={s.key} label={s.label} count={data.shipping[s.key]} />
            ))}
          </AxisColumn>
        </div>
      )}
    </AnalyticsCard>
  );
};

// ---------------------------------------------------------------------------
// Customer insights — new vs returning buyers + a registrations bar series.
// Definitions are surfaced in a subtle help tooltip, not redefined here.
// ---------------------------------------------------------------------------
const DEFINITIONS =
  'New = customer whose first-ever order falls in this period. Returning = ordered in this period and had an order before it. Registrations counts new account sign-ups.';

export const CustomerInsights: React.FC<{ data?: AnalyticsCustomers } & WidgetState> = ({
  data,
  isLoading,
  isError,
  onRetry,
}) => {
  const regs = data?.registrationsOverTime ?? [];
  const maxReg = Math.max(1, ...regs.map((r) => r.count));
  const totalReg = regs.reduce((s, r) => s + r.count, 0);
  const empty = !!data && data.newCustomers === 0 && data.returningCustomers === 0 && totalReg === 0;
  const regSummary = `${totalReg} new registration${totalReg === 1 ? '' : 's'} across the period.`;

  return (
    <AnalyticsCard
      title="Customer Insights"
      subtitle="New vs returning buyers, plus account registrations."
      icon="groups"
      isLoading={isLoading}
      isError={isError}
      isEmpty={empty}
      onRetry={onRetry}
      emptyIcon="groups"
      emptyTitle="No customer activity"
      emptyDescription="New and returning customers will appear here once there's order activity."
      headerRight={
        <span
          className="material-symbols-outlined text-on-surface-variant text-[20px] cursor-help"
          tabIndex={0}
          role="img"
          aria-label={DEFINITIONS}
          title={DEFINITIONS}
        >
          help
        </span>
      }
    >
      {data && (
        <div className="space-y-lg">
          <div className="grid grid-cols-2 gap-md">
            <div className="p-md rounded-lg border border-outline-variant/30 bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-xs">New</p>
              <p className="font-display text-headline-md text-primary">{data.newCustomers}</p>
            </div>
            <div className="p-md rounded-lg border border-outline-variant/30 bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-xs">Returning</p>
              <p className="font-display text-headline-md text-on-surface">{data.returningCustomers}</p>
            </div>
          </div>

          <div>
            <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-sm">
              Registrations over time
            </p>
            <div className="flex items-end gap-[2px] h-24" role="img" aria-label={regSummary}>
              {regs.map((r) => (
                <div
                  key={r.date}
                  className="flex-1 bg-primary/70 rounded-t"
                  style={{ height: `${(r.count / maxReg) * 100}%`, minHeight: r.count > 0 ? 4 : 1 }}
                  title={`${r.date}: ${r.count}`}
                />
              ))}
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-sm">{regSummary}</p>
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
};

// ---------------------------------------------------------------------------
// Top products — table of best sellers (PAID only, top 10 from the API).
// ---------------------------------------------------------------------------
export const TopProductsTable: React.FC<{ data?: TopProduct[] } & WidgetState> = ({
  data,
  isLoading,
  isError,
  onRetry,
}) => (
  <AnalyticsCard
    title="Top Products"
    subtitle="Best sellers by units sold (paid orders only)."
    icon="trending_up"
    isLoading={isLoading}
    isError={isError}
    isEmpty={!!data && data.length === 0}
    onRetry={onRetry}
    emptyIcon="inventory_2"
    emptyTitle="No sales yet"
    emptyDescription="Products will rank here once paid orders include them."
  >
    {data && data.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-outline-variant/30">
            <tr>
              <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Product</th>
              <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Units Sold</th>
              <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Revenue</th>
              <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Orders</th>
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md">
            {data.map((p) => (
              <tr key={p.productId} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                <td className="py-md text-on-surface font-medium">{p.productName}</td>
                <td className="py-md text-right tabular-nums">{p.unitsSold}</td>
                <td className="py-md text-right font-medium tabular-nums">{formatPrice(p.revenue)}</td>
                <td className="py-md text-right tabular-nums">{p.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </AnalyticsCard>
);

// ---------------------------------------------------------------------------
// Quick insights — lightweight takeaways derived only from data already fetched.
// ---------------------------------------------------------------------------
export interface Insight {
  icon: string;
  label: string;
  value: string;
}

export const QuickInsights: React.FC<{ insights: Insight[]; isLoading: boolean }> = ({
  insights,
  isLoading,
}) => (
  <AnalyticsCard
    title="Quick Insights"
    subtitle="Highlights derived from the metrics above."
    icon="lightbulb"
    isLoading={isLoading}
    isEmpty={!isLoading && insights.length === 0}
    emptyIcon="lightbulb"
    emptyTitle="No insights yet"
    emptyDescription="Insights appear once there's activity in the selected range."
    loadingHeight="h-24"
  >
    {insights.length > 0 && (
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-md">
        {insights.map((i) => (
          <li key={i.label} className="flex items-center gap-sm p-md rounded-lg border border-outline-variant/30 bg-surface-container-low">
            <span className="material-symbols-outlined text-primary">{i.icon}</span>
            <div className="min-w-0">
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest">{i.label}</p>
              <p className="font-body-md text-body-md text-on-surface font-medium truncate">{i.value}</p>
            </div>
          </li>
        ))}
      </ul>
    )}
  </AnalyticsCard>
);
