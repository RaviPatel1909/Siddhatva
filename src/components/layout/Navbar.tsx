import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

// ============================================================================
// 2. NAVIGATION BAR (Sticky, Glassmorphic)
// ============================================================================

interface NavbarProps {
  brandName?: string;
}

// Single shared nav — every customer-facing layout renders this component.
// Each link targets a distinct category URL so the active check can single
// out the current route instead of lighting up all four on /shop.
const NAV_LINKS: { label: string; href: string; category: string | null }[] = [
  { label: 'Men', href: '/shop?category=Men', category: 'Men' },
  { label: 'Women', href: '/shop?category=Women', category: 'Women' },
  { label: 'Kids', href: '/shop?category=Kids', category: 'Kids' },
  { label: 'Collections', href: '/shop', category: null },
];

export const Navbar: React.FC<NavbarProps> = ({ brandName = 'Siddhatva' }) => {
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const activeCategory = new URLSearchParams(location.search).get('category');
  const isLinkActive = (category: string | null) =>
    location.pathname === '/shop' && activeCategory === category;

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
              <Link
                key={link.label}
                to={link.href}
                aria-current={isLinkActive(link.category) ? 'page' : undefined}
                className={`font-body-md text-body-md font-medium transition-colors ${
                  isLinkActive(link.category)
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-on-surface hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
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