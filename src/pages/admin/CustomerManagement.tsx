import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { getCustomer, getCustomers } from '../../api/admin';
import { queryKeys } from '../../api/queryKeys';
import { formatPrice } from '../../lib/money';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import type { BadgeVariant } from '../../components/ui/Badge';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const initials = (name: string) =>
  name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------
export const CustomerManagementPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const q = useDebouncedValue(searchInput.trim(), 300);
  const [page, setPage] = useState(1);

  // A new query resets to the first page.
  useEffect(() => setPage(1), [q]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.adminCustomers(page, q),
    queryFn: () => getCustomers(page, q),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 8;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Customers</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Everyone who has created an account.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-sm items-center bg-surface-container-lowest/60 p-md rounded-xl border border-outline-variant/20 mb-lg">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[200px] bg-surface-container-lowest border border-outline-variant rounded-full px-md py-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow border border-outline-variant/20">
        {isError ? (
          <EmptyState
            icon="error"
            title="Couldn't load customers"
            description="Something went wrong fetching the customer list. Try again."
          />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={q ? 'search_off' : 'group'}
            title={q ? 'No customers found' : 'No customers yet'}
            description={
              q ? `Nothing matches "${q}".` : 'Customers will appear here once shoppers create accounts.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant/30">
                  <tr>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Customer</th>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Joined</th>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Orders</th>
                    <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md">
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors"
                    >
                      <td className="py-md">
                        <Link to={`/admin/customers/${c.id}`} className="flex items-center gap-sm group">
                          <div className="w-8 h-8 rounded-full bg-secondary-fixed-dim flex items-center justify-center text-[10px] font-bold">
                            {initials(c.name)}
                          </div>
                          <div>
                            <p className="font-medium text-on-surface group-hover:text-primary transition-colors">
                              {c.name}
                            </p>
                            <p className="text-sm text-on-surface-variant">{c.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-md text-on-surface-variant">{formatDate(c.createdAt)}</td>
                      <td className="py-md text-right">{c.orderCount}</td>
                      <td className="py-md text-right font-medium">{formatPrice(c.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-lg flex justify-between items-center">
              <p className="text-xs text-on-surface-variant">
                Showing {items.length} of {total} customers
              </p>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------
export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.adminCustomer(id ?? ''),
    queryFn: () => getCustomer(id as string),
    enabled: !!id,
  });

  return (
    <AdminLayout>
      <Link
        to="/admin/customers"
        className="inline-flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors mb-lg"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        All customers
      </Link>

      {isError ? (
        <EmptyState icon="person_off" title="Customer not found" description="This customer doesn't exist." />
      ) : isLoading || !data ? (
        <div className="space-y-lg">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow border border-outline-variant/20 mb-lg">
            <div className="flex items-center gap-md mb-lg">
              <div className="w-14 h-14 rounded-full bg-secondary-fixed-dim flex items-center justify-center text-sm font-bold">
                {initials(data.name)}
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{data.name}</h2>
                <p className="text-body-md text-on-surface-variant">{data.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <div>
                <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-1">Joined</p>
                <p className="text-on-surface">{formatDate(data.createdAt)}</p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-1">Orders</p>
                <p className="text-on-surface">{data.orderCount}</p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-1">Total Spent</p>
                <p className="text-on-surface font-medium">{formatPrice(data.totalSpent)}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow border border-outline-variant/20">
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">Orders</h3>
              {data.orders.length > 0 && (
                <Link
                  to={`/admin/orders?customerId=${data.id}&name=${encodeURIComponent(data.name)}`}
                  className="text-label-sm font-label-sm text-primary hover:opacity-80 transition-opacity"
                >
                  View in Order Management →
                </Link>
              )}
            </div>
            {data.orders.length === 0 ? (
              <EmptyState icon="shopping_cart" title="No orders yet" description="This customer hasn't placed an order." />
            ) : (
              <div className="space-y-2">
                {data.orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/admin/orders?q=${encodeURIComponent(order.id)}`}
                    className="flex items-center justify-between p-md rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                  >
                    <div>
                      <p className="font-medium text-primary">#{order.id}</p>
                      <p className="text-sm text-on-surface-variant">{formatDate(order.date)}</p>
                    </div>
                    <div className="flex items-center gap-md">
                      <Badge variant={order.status as BadgeVariant}>{order.status}</Badge>
                      <span className="font-medium">{formatPrice(order.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
};
