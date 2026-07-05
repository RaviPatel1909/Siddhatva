import React from 'react';
import { AccountLayout } from '../../components/layout/AccountLayout';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { orders } from '../../data/orders';
import { OrderStatus } from '../../types/order';

const STATUS_ICON: Record<OrderStatus, string> = {
  delivered: 'check_circle',
  shipped: 'local_shipping',
  processing: 'pending',
  cancelled: 'cancel',
};

const STATUS_ACTIONS: Record<OrderStatus, string[]> = {
  delivered: ['View Details', 'Buy Again'],
  shipped: ['Track Order', 'View Details'],
  processing: ['Modify Order', 'Cancel Order'],
  cancelled: ['View Details'],
};

export const MyOrdersPage: React.FC = () => {
  if (orders.length === 0) {
    return (
      <AccountLayout>
        <EmptyState icon="package_2" title="No orders yet" description="Your order history will appear here." />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <h1 className="font-display text-3xl text-primary mb-xl">Your Orders</h1>
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
                <span className="font-semibold text-primary">${order.total.toFixed(2)}</span>
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
                  <p className="text-sm font-medium text-primary">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              <div className="flex gap-sm pt-sm">
                {STATUS_ACTIONS[order.status].map((action) => (
                  <button
                    key={action}
                    className="px-md py-xs rounded-lg border border-outline-variant text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AccountLayout>
  );
};
