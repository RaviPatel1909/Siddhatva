import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccountLayout } from '../../components/layout/AccountLayout';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { TrackingTimeline } from '../../components/order/TrackingTimeline';
import { formatPrice } from '../../lib/money';
import { getOrders } from '../../api/orders';
import { queryKeys } from '../../api/queryKeys';
import { OrderStatus } from '../../types/order';

const STATUS_ICON: Record<OrderStatus, string> = {
  delivered: 'check_circle',
  shipped: 'local_shipping',
  processing: 'pending',
  cancelled: 'cancel',
};

const STATUS_ACTIONS: Record<OrderStatus, string[]> = {
  delivered: ['Track Order', 'View Details', 'Buy Again'],
  shipped: ['Track Order', 'View Details'],
  processing: ['Modify Order', 'Cancel Order'],
  cancelled: ['View Details'],
};

const OrderSkeleton = () => (
  <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-lg space-y-md">
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-6 w-24 rounded-full" />
    </div>
    <div className="flex gap-md items-center">
      <Skeleton className="w-16 h-20 rounded-lg" />
      <div className="flex-1 space-y-sm">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  </div>
);

export const MyOrdersPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders(),
    queryFn: getOrders,
  });

  const orders = data?.items ?? [];
  const [trackingId, setTrackingId] = useState<string | null>(null);

  return (
    <AccountLayout>
      <h1 className="font-display text-3xl text-primary mb-xl">Your Orders</h1>

      {isError ? (
        <ErrorState
          title="Couldn't load your orders"
          message="We had trouble reaching your order history. Please try again."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-lg">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderSkeleton key={i} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon="package_2" title="No orders yet" description="Your order history will appear here." />
      ) : (
        <div className="space-y-lg">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-surface-container-low rounded-xl border border-outline-variant/20 overflow-hidden active:scale-[0.99] transition-transform"
            >
              <div className="flex flex-wrap items-center justify-between gap-md px-lg py-md border-b border-outline-variant/20 bg-surface-container">
                <div className="flex items-center gap-lg text-sm text-on-surface-variant">
                  <span>{new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="font-medium text-on-surface">Order #{order.id}</span>
                </div>
                <div className="flex items-center gap-md">
                  <span className="font-semibold text-primary">{formatPrice(order.total)}</span>
                  <Badge variant={order.status} icon={STATUS_ICON[order.status]}>
                    {order.status}
                  </Badge>
                </div>
              </div>
              <div className="p-lg space-y-md">
                {order.items.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-md items-start md:items-center">
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-on-surface">{item.name}</p>
                      <p className="text-sm text-on-surface-variant">{item.variant} · Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-primary">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
                <div className="flex flex-wrap gap-sm pt-sm">
                  {STATUS_ACTIONS[order.status].map((action) =>
                    action === 'Track Order' ? (
                      <button
                        key={action}
                        onClick={() => setTrackingId((id) => (id === order.id ? null : order.id))}
                        aria-expanded={trackingId === order.id}
                        className="px-md py-xs rounded-lg border border-primary text-sm text-primary font-medium hover:bg-primary/5 transition-colors inline-flex items-center gap-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                        {trackingId === order.id ? 'Hide Tracking' : 'Track Order'}
                      </button>
                    ) : (
                      <button
                        key={action}
                        className="px-md py-xs rounded-lg border border-outline-variant text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                      >
                        {action}
                      </button>
                    )
                  )}
                </div>

                {trackingId === order.id && (
                  <div className="mt-sm rounded-lg border border-outline-variant/30 bg-surface-container-low p-lg">
                    <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-md">
                      Tracking
                    </h4>
                    <TrackingTimeline
                      shippingStatus={order.shippingStatus}
                      courier={order.courier}
                      awb={order.awb}
                      trackingUrl={order.trackingUrl}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  );
};
