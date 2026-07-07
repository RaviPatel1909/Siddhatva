import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { getAdminOrders } from '../../api/admin';
import { formatPrice } from '../../lib/money';

const BARS = [32, 48, 56, 40, 64, 72, 80];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'];

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['admin', 'orders'], queryFn: getAdminOrders });
  const orders = data?.items ?? [];
  const recentOrders = orders.slice(0, 4);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
        <StatCard icon="payments" label="Total Revenue" value="₹1,24,500" delta={{ value: '+12.5%', direction: 'up' }} accent="primary" footnote="Vs last month: ₹1,10,660" />
        <StatCard icon="local_mall" label="Total Orders" value="842" delta={{ value: '+8.2%', direction: 'up' }} accent="secondary" footnote="Avg. 28 orders / day" />
        <StatCard icon="group_add" label="Active Customers" value="1,205" delta={{ value: '+5.4%', direction: 'up' }} accent="tertiary" footnote="Engagement rate: 82%" />
        <StatCard icon="ads_click" label="Conversion Rate" value="3.4%" delta={{ value: '-0.2%', direction: 'down' }} accent="outline" footnote="Benchmark: 3.2%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        {/* Sales Performance */}
        <div className="lg:col-span-2 bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow relative overflow-hidden h-[450px] border border-outline-variant/20">
          <div className="flex justify-between items-center mb-lg">
            <div>
              <h4 className="font-headline-md text-headline-md text-on-surface">Sales Performance</h4>
              <p className="font-body-md text-body-md text-on-surface-variant">Revenue trends across major categories.</p>
            </div>
            <div className="flex gap-xs">
              <span className="w-3 h-3 rounded-full bg-primary" />
              <span className="w-3 h-3 rounded-full bg-secondary-fixed-dim" />
            </div>
          </div>
          <div className="w-full h-64 relative mt-lg">
            <div className="absolute inset-0 flex items-end justify-between px-md pb-xs border-b border-l border-outline-variant/30">
              {BARS.map((height, i) => (
                <div
                  key={i}
                  className="w-12 rounded-t-lg bg-primary"
                  style={{ height: `${height * 4}px`, opacity: 0.3 + (i / BARS.length) * 0.7 }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between text-outline font-label-sm text-label-sm mt-md px-md">
            {MONTHS.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </div>

        {/* Quick Summary */}
        <div className="bg-surface-container-high p-lg rounded-xl border border-outline-variant/30">
          <h4 className="font-headline-md text-headline-md text-on-surface mb-md">Quick Summary</h4>
          <div className="space-y-md">
            <div className="flex justify-between items-center pb-sm border-b border-outline-variant/30">
              <span className="font-body-md text-body-md text-on-surface-variant">Active Promotions</span>
              <span className="bg-secondary-container text-on-secondary-container px-sm py-1 rounded-full text-label-sm font-label-sm">4 Active</span>
            </div>
            <div className="flex justify-between items-center pb-sm border-b border-outline-variant/30">
              <span className="font-body-md text-body-md text-on-surface-variant">Low Stock Alerts</span>
              <span className="bg-error-container text-on-error-container px-sm py-1 rounded-full text-label-sm font-label-sm">12 Items</span>
            </div>
            <div className="flex justify-between items-center pb-sm border-b border-outline-variant/30">
              <span className="font-body-md text-body-md text-on-surface-variant">Pending Reviews</span>
              <span className="bg-surface-container-highest text-on-surface-variant px-sm py-1 rounded-full text-label-sm font-label-sm">28 New</span>
            </div>
          </div>
          <div className="mt-xl">
            <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-md">System Status</p>
            <div className="bg-surface-container-lowest p-md rounded-lg border border-outline-variant/20 flex items-center gap-md">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle className="stroke-surface-container-highest" cx="24" cy="24" fill="none" r="20" strokeWidth="4" />
                  <circle className="stroke-primary" cx="24" cy="24" fill="none" r="20" strokeDasharray="125.6" strokeDashoffset="30" strokeWidth="4" />
                </svg>
                <span className="font-label-sm text-label-sm">75%</span>
              </div>
              <div>
                <p className="font-body-md text-on-surface font-medium">Server Capacity</p>
                <p className="text-[10px] text-on-surface-variant">Normal operating conditions.</p>
              </div>
            </div>
          </div>
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
          <p className="text-xs text-on-surface-variant">Showing {recentOrders.length} of {orders.length} orders</p>
        </div>
      </div>
    </AdminLayout>
  );
};
