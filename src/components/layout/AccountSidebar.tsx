import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Overview', href: '/account', icon: 'dashboard' },
  { label: 'Orders', href: '/account/orders', icon: 'package_2' },
  { label: 'Wishlist', href: '/account/wishlist', icon: 'favorite' },
  { label: 'Profile', href: '/account/profile', icon: 'person' },
];

export const AccountSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col py-lg px-md h-[calc(100vh-80px)] w-64 sticky top-20 shrink-0 bg-surface-container-low/50 border-r border-outline-variant/30">
      <div className="mb-xl px-md">
        <h2 className="font-display text-headline-md text-primary">Account</h2>
        <p className="font-body-md text-sm text-on-surface-variant">Manage your profile</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-md rounded-lg p-md font-body-md text-sm transition-all duration-200 ${
                active
                  ? 'bg-secondary-container text-primary font-medium'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
