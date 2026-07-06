import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { useQuery } from '@tanstack/react-query';
import { getAdminOrders } from '../../api/admin';

const PAGE_SIZE = 6;

const initials = (name: string) =>
  name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export const OrderManagementPage: React.FC = () => {
  const { data } = useQuery({ queryKey: ['admin', 'orders'], queryFn: getAdminOrders });
  const orders = data?.items ?? [];
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !search ||
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customerName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'all' || order.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const drawerRef = useRef<HTMLDivElement>(null);

  // Drawer a11y: Escape closes, Tab is trapped within the panel, focus moves
  // in on open and returns to the trigger on close.
  useEffect(() => {
    if (!selectedOrderId) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setSelectedOrderId(null);
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [selectedOrderId]);

  const revenueToday = orders.reduce((sum, order) => sum + order.total, 0);
  const avgValue = orders.length ? revenueToday / orders.length : 0;
  const pendingFulfillment = orders.filter((order) => order.status === 'processing').length;

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Orders</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Track and fulfill customer orders.</p>
        </div>
        <button className="px-md py-sm bg-surface-container-high border border-outline-variant rounded-full text-on-surface font-label-sm text-label-sm flex items-center gap-xs hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
        <StatCard icon="add_shopping_cart" label="New Orders" value={String(orders.length)} accent="primary" />
        <StatCard icon="payments" label="Revenue Today" value={`$${revenueToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent="secondary" />
        <StatCard icon="trending_up" label="Avg. Value" value={`$${avgValue.toFixed(0)}`} accent="tertiary" />
        <StatCard icon="local_shipping" label="Pending Fulfillment" value={String(pendingFulfillment)} accent="outline" />
      </div>

      <div className="flex flex-wrap gap-sm items-center bg-surface-container-lowest/60 p-md rounded-xl border border-outline-variant/20 mb-lg">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search order ID or customer..."
          className="flex-1 min-w-[200px] bg-surface-container-lowest border border-outline-variant rounded-full px-md py-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="bg-surface-container-lowest border border-outline-variant rounded-full px-md py-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          onClick={() => {
            setSearch('');
            setStatus('all');
          }}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Reset filters"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow border border-outline-variant/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant/30">
              <tr>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Order ID</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Customer</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Date</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Items</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Status</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Total</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md">
              {pageItems.map((order) => (
                <tr key={order.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
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
                  <td className="py-md text-on-surface-variant">{order.items.length}</td>
                  <td className="py-md"><Badge variant={order.status}>{order.status}</Badge></td>
                  <td className="py-md text-right font-medium">${order.total.toFixed(2)}</td>
                  <td className="py-md">
                    <div className="flex justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="p-1 text-on-surface-variant hover:text-primary hover:scale-110 transition-all"
                        aria-label="View details"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button className="p-1 text-on-surface-variant hover:text-primary hover:scale-110 transition-all" aria-label="Print">
                        <span className="material-symbols-outlined text-[18px]">print</span>
                      </button>
                      <button className="p-1 text-on-surface-variant hover:text-primary hover:scale-110 transition-all" aria-label="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-lg flex justify-between items-center">
          <p className="text-xs text-on-surface-variant">Showing {pageItems.length} of {filtered.length} orders</p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Slide-in Detail Drawer */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-on-background/40 z-50"
          onClick={() => setSelectedOrderId(null)}
        />
      )}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={selectedOrder ? `Order ${selectedOrder.id} details` : undefined}
        aria-hidden={selectedOrder ? undefined : true}
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-surface shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto ${
          selectedOrder ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedOrder && (
          <div className="p-lg">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="font-display text-headline-md text-primary">Order #{selectedOrder.id}</h3>
              <button
                onClick={() => setSelectedOrderId(null)}
                aria-label="Close order details"
                className="p-1 text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mb-lg">
              <Badge variant={selectedOrder.status}>{selectedOrder.status}</Badge>
              <p className="text-sm text-on-surface-variant mt-sm">
                {new Date(selectedOrder.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="mb-lg">
              <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-outline mb-sm">
                Shipping Address
              </h4>
              <p className="text-sm text-on-surface">{selectedOrder.shippingAddress.name}</p>
              <p className="text-sm text-on-surface-variant">{selectedOrder.shippingAddress.line1}</p>
              <p className="text-sm text-on-surface-variant">
                {selectedOrder.shippingAddress.city}
                {selectedOrder.shippingAddress.state && `, ${selectedOrder.shippingAddress.state}`} {selectedOrder.shippingAddress.zip}
              </p>
              <p className="text-sm text-on-surface-variant">{selectedOrder.shippingAddress.country}</p>
            </div>

            <div className="mb-lg">
              <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-outline mb-sm">
                Items
              </h4>
              <div className="space-y-sm">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex gap-sm items-center">
                    <div className="w-12 h-14 rounded-md overflow-hidden bg-surface-container-high shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-on-surface">{item.name}</p>
                      <p className="text-xs text-on-surface-variant">{item.variant} · Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-primary">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-lg space-y-xs text-sm border-t border-outline-variant/20 pt-md">
              <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span>${selectedOrder.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Shipping</span><span>{selectedOrder.shipping === 0 ? 'Complimentary' : `$${selectedOrder.shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Tax</span><span>${selectedOrder.tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold pt-xs border-t border-outline-variant/20"><span>Total</span><span className="text-primary">${selectedOrder.total.toFixed(2)}</span></div>
            </div>

            <button className="w-full bg-primary text-on-primary py-sm rounded-lg font-label-sm text-sm uppercase tracking-widest hover:opacity-90 transition-opacity active:scale-95">
              Confirm Shipment
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
