import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
  { label: 'Products', href: '/admin/products', icon: 'inventory_2' },
  { label: 'Orders', href: '/admin/orders', icon: 'shopping_cart' },
  { label: 'Home Content', href: '/admin/home', icon: 'home' },
  { label: 'Customers', href: '/admin/customers', icon: 'group' },
  { label: 'Analytics', href: '/admin/analytics', icon: 'monitoring' },
];

export const AdminSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low shadow-sm flex flex-col py-md px-sm z-50">
      <div className="mb-lg px-xs">
        <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
          Siddhatva
        </h1>
        <p className="font-label-sm text-label-sm text-outline tracking-widest uppercase mt-xs">
          Premium Admin
        </p>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-3 px-sm py-xs transition-colors duration-200 ${
                active
                  ? 'text-primary font-bold border-r-2 border-primary'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body-md text-body-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-xl px-xs">
        <button className="w-full bg-primary text-on-primary py-sm rounded-lg font-label-sm text-label-sm uppercase tracking-widest hover:bg-primary-container transition-colors bronze-shadow active:scale-95">
          New Collection
        </button>
      </div>
      <div className="mt-auto space-y-1 border-t border-outline-variant pt-md">
        <button className="w-full flex items-center gap-3 px-sm py-xs text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200 text-left">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-body-md text-body-md">Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-sm py-xs text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200 text-left">
          <span className="material-symbols-outlined">help_outline</span>
          <span className="font-body-md text-body-md">Support</span>
        </button>
      </div>
    </aside>
  );
};
