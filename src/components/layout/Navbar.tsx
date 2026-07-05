import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

// ============================================================================
// 2. NAVIGATION BAR (Sticky, Glassmorphic)
// ============================================================================

interface NavbarProps {
  brandName?: string;
}

// Single shared nav — every customer-facing layout renders this component.
// Distinct category PATHS (not query strings) so NavLink's own isActive is
// per-link accurate for both the highlight and aria-current.
const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Men', href: '/shop/Men' },
  { label: 'Women', href: '/shop/Women' },
  { label: 'Kids', href: '/shop/Kids' },
  { label: 'Collections', href: '/shop' },
];

export const Navbar: React.FC<NavbarProps> = ({ brandName = 'Siddhatva' }) => {
  const { itemCount } = useCart();
  const navigate = useNavigate();

  return (
    <nav
      className="sticky top-0 z-50 w-full h-20 chrome-surface
                 border-b border-border shadow-sm"
    >
      <div
        className="flex justify-between items-center w-full px-margin-desktop
                   max-w-7xl mx-auto h-20"
      >
        {/* Logo and Nav Links */}
        <div className="flex items-center gap-lg">
          <Link
            to="/"
            className="font-display text-headline-md text-primary tracking-tighter
                      hover:opacity-80 transition-opacity duration-300"
          >
            {brandName}
          </Link>
          <div className="hidden md:flex gap-lg">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.label}
                to={link.href}
                end
                className={({ isActive }) =>
                  `font-body-md text-body-md font-medium transition-colors ${
                    isActive
                      ? 'text-primary border-b-2 border-primary pb-1'
                      : 'text-on-surface hover:text-primary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Icon Actions */}
        <div className="flex items-center gap-md">
          <button
            className="material-symbols-outlined text-on-surface
                      hover:text-primary transition-colors"
            aria-label="Search"
          >
            search
          </button>
          <button
            onClick={() => navigate('/account/wishlist')}
            className="material-symbols-outlined text-on-surface
                      hover:text-primary transition-colors"
            aria-label="Wishlist"
          >
            favorite
          </button>
          <button
            onClick={() => navigate('/cart')}
            className="relative material-symbols-outlined text-on-surface
                      hover:text-primary transition-colors"
            aria-label="Shopping Cart"
          >
            shopping_bag
            {itemCount > 0 && (
              <span
                className="absolute -top-2 -right-2 bg-secondary text-on-secondary
                          text-xs w-5 h-5 rounded-full flex items-center
                          justify-center font-bold"
              >
                {itemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/account')}
            className="material-symbols-outlined text-on-surface
                      hover:text-primary transition-colors"
            aria-label="Account"
          >
            person
          </button>
        </div>
      </div>
    </nav>
  );
};