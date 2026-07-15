import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const AdminTopbar: React.FC = () => {
  const { user } = useAuth();
  const name = user?.name ?? '';

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-256px)] h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center px-lg z-40">
      <div className="relative w-96">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
          search
        </span>
        <input
          className="w-full bg-surface-container-lowest border-none rounded-full pl-10 pr-4 py-2 focus:ring-1 focus:ring-primary text-body-md placeholder:text-outline-variant transition-all"
          placeholder="Search management..."
          type="text"
        />
      </div>
      <div className="flex items-center gap-md">
        <Link to="/" className="text-primary font-bold font-label-sm text-label-sm hover:opacity-80 transition-opacity">
          View Site
        </Link>
        <div className="flex items-center gap-xs ml-sm">
          <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center overflow-hidden border border-outline-variant text-on-secondary-fixed font-bold text-sm">
            {initials(name)}
          </div>
          <div className="hidden lg:block">
            <p className="font-label-sm text-label-sm text-on-surface">{name}</p>
            <p className="text-[10px] text-outline uppercase tracking-tighter">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
