import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Explore', href: '/shop', icon: 'explore' },
  { label: 'Orders', href: '/account/orders', icon: 'package_2' },
  { label: 'Profile', href: '/account', icon: 'person' },
];

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 chrome-surface border-t border-border flex items-center justify-around z-40">
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`flex flex-col items-center gap-1 text-[10px] uppercase tracking-widest ${
              active ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
