import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountLayout } from '../../components/layout/AccountLayout';
import { formatPrice } from '../../lib/money';
import { Badge } from '../../components/ui/Badge';
import { useOrders } from '../../context/OrdersContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';

export const AccountOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders } = useOrders();
  const { items: wishlist } = useWishlist();
  const recentOrder = orders[0]; // most recent order for this user
  const wishlistPreview = wishlist.slice(0, 4);
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const QUICK_LINKS = [
    { label: 'Profile', description: 'Manage personal info', icon: 'person', href: '/account/profile' },
    { label: 'Wishlist', description: `${wishlist.length} saved favorites`, icon: 'favorite', href: '/account/wishlist' },
  ];

  return (
    <AccountLayout>
      <div className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-primary">
            Welcome back, <span className="text-on-secondary-container">{firstName}</span>
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>
        <button
          onClick={() => navigate('/shop')}
          className="bg-primary text-on-primary px-lg py-sm rounded-lg font-body-md text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          Shop New Arrivals
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Recent Order */}
        <div className="lg:col-span-8 bg-surface-container-low rounded-xl p-xl shadow-sm border border-outline-variant/20">
          <div className="flex justify-between items-center mb-lg">
            <h3 className="text-xl font-semibold text-primary">Recent Order</h3>
            <button
              onClick={() => navigate('/account/orders')}
              className="text-on-surface-variant hover:text-primary font-body-md text-sm flex items-center gap-xs"
            >
              View All Orders <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
          {recentOrder ? (
            <div className="flex flex-col md:flex-row gap-lg items-start bg-surface p-lg rounded-lg border border-outline-variant/20">
              <div className="w-24 h-24 bg-surface-container-high rounded-lg overflow-hidden shrink-0">
                <img src={recentOrder.items[0].image} alt={recentOrder.items[0].name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex justify-between items-start gap-md">
                  <div>
                    <Badge variant={recentOrder.status}>{recentOrder.status}</Badge>
                    <h4 className="text-lg font-medium text-primary mt-xs">{recentOrder.items[0].name}</h4>
                    <p className="text-sm text-on-surface-variant">
                      Order #{recentOrder.id} · {new Date(recentOrder.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-primary shrink-0">{formatPrice(recentOrder.total)}</p>
                </div>
                <div className="flex gap-sm mt-lg">
                  <button
                    onClick={() => navigate('/account/orders')}
                    className="flex-1 md:flex-none border border-primary text-primary px-lg py-sm rounded-lg font-body-md text-sm hover:bg-primary hover:text-on-primary transition-all"
                  >
                    Track
                  </button>
                  <button
                    onClick={() => navigate('/account/orders')}
                    className="flex-1 md:flex-none bg-secondary-container text-on-secondary-container px-lg py-sm rounded-lg font-body-md text-sm hover:bg-surface transition-colors border border-secondary-container"
                  >
                    Invoice
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface p-xl rounded-lg border border-outline-variant/20 text-center">
              <p className="text-on-surface-variant mb-md">You haven&apos;t placed any orders yet.</p>
              <button
                onClick={() => navigate('/shop')}
                className="bg-primary text-on-primary px-lg py-sm rounded-lg font-body-md text-sm hover:opacity-90 transition-opacity"
              >
                Start shopping
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="lg:col-span-4 flex flex-col gap-lg">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.href)}
              className="bg-surface-container-low rounded-xl p-lg flex items-center justify-between shadow-sm group hover:bg-surface-container transition-all border border-outline-variant/20 text-left"
            >
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">{link.icon}</span>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-primary">{link.label}</h4>
                  <p className="text-[13px] text-on-surface-variant">{link.description}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </button>
          ))}
        </div>

        {/* Wishlist Preview */}
        <div className="lg:col-span-12 bg-surface-container-low rounded-xl p-xl shadow-sm border border-outline-variant/20">
          <div className="flex justify-between items-center mb-xl">
            <h3 className="text-xl font-semibold text-primary">Wishlist Preview</h3>
            <button
              onClick={() => navigate('/account/wishlist')}
              className="text-on-surface-variant hover:text-primary font-body-md text-sm flex items-center gap-xs"
            >
              View Full Wishlist <span className="material-symbols-outlined text-[18px]">favorite</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
            {wishlistPreview.map((product) => (
              <button
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="group text-left"
              >
                <div className="aspect-[3/4] bg-surface-container-high rounded-lg overflow-hidden mb-md">
                  <img
                    src={product.images[0].src}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h4 className="text-[15px] text-primary">{product.name}</h4>
                <p className="text-base font-semibold text-secondary mt-xs">{formatPrice(product.price)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};
