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
  // Product tags keep brand tokens
  new: 'bg-surface text-primary shadow-sm',
  limited: 'bg-tertiary text-on-tertiary',
  'sold-out': 'bg-surface-container-highest text-on-surface-variant',
  // Order/product statuses use semantic tokens as /10 tint + solid text
  processing: 'bg-warning/10 text-warning',
  shipped: 'bg-info/10 text-info',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  active: 'bg-success/10 text-success',
  draft: 'bg-surface-container-highest text-on-surface-variant',
  'out-of-stock': 'bg-danger/10 text-danger',
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
