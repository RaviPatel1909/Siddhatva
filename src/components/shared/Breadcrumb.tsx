import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <nav className="flex items-center gap-xs font-body-md text-body-md text-on-surface-variant mb-md" aria-label="Breadcrumb">
    {items.map((item, index) => (
      <Fragment key={item.label}>
        {index > 0 && <span className="material-symbols-outlined text-[16px]">chevron_right</span>}
        {item.href && index < items.length - 1 ? (
          <Link to={item.href} className="hover:text-primary transition-colors">
            {item.label}
          </Link>
        ) : (
          <span className="text-on-surface font-medium">{item.label}</span>
        )}
      </Fragment>
    ))}
  </nav>
);
