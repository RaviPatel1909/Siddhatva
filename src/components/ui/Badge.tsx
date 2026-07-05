import React from 'react';

export type BadgeVariant =
  | 'new'
  | 'limited'
  | 'sold-out'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'active'
  | 'draft'
  | 'out-of-stock'
  | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  new: 'bg-surface text-primary shadow-sm',
  limited: 'bg-tertiary text-on-tertiary',
  'sold-out': 'bg-surface-container-highest text-on-surface-variant',
  processing: 'bg-surface-container-highest text-on-surface-variant',
  shipped: 'bg-tertiary text-on-tertiary',
  delivered: 'bg-secondary text-on-secondary',
  cancelled: 'bg-error-container text-on-error-container',
  active: 'bg-secondary text-on-secondary',
  draft: 'bg-surface-container-highest text-on-surface-variant',
  'out-of-stock': 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container-high text-on-surface-variant',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  icon,
  children,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1 px-sm py-1 rounded-full font-label-sm text-label-sm uppercase tracking-widest ${VARIANT_STYLES[variant]} ${className}`}
  >
    {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
    {children}
  </span>
);
