import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

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
  const { count: wishlistCount } = useWishlist();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const openSearch = () => {
    // Preserve the current query so re-opening on the results page shows what was searched.
    setSearchTerm(searchParams.get('q') ?? '');
    setSearchOpen(true);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    setSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const closeMenu = () => setMenuOpen(false);
  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/');
  };

  return (
    <nav
      className="sticky top-0 z-50 w-full h-20 chrome-surface border-b border-border relative"
    >
      <div
        className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop
                   max-w-7xl mx-auto h-20"
      >
        {/* Logo and Nav Links */}
        <div className="flex items-center gap-lg">
          <Link
            to="/"
            className="font-display text-headline-md uppercase tracking-widest text-primary
                      hover:opacity-80 transition-opacity duration-200"
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
                  `font-body-md text-body-md p-2 transition-colors duration-200 ${
                    isActive
                      ? 'text-primary font-semibold border-b-2 border-primary pb-1'
                      : 'text-on-background/70 hover:text-primary'
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
            onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())}
            className="material-symbols-outlined text-on-background
                      hover:text-primary transition-colors"
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            search
          </button>
          <button
            onClick={() => navigate('/account/wishlist')}
            className="relative material-symbols-outlined text-on-background
                      hover:text-primary transition-colors"
            aria-label="Wishlist"
          >
            favorite
            {wishlistCount > 0 && (
              <span
                className="absolute -top-2 -right-2 bg-secondary text-on-secondary
                          text-xs w-5 h-5 rounded-full flex items-center
                          justify-center font-bold"
              >
                {wishlistCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/cart')}
            className="relative material-symbols-outlined text-on-background
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
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="material-symbols-outlined text-primary hover:opacity-80 transition-opacity"
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                account_circle
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={closeMenu} aria-hidden="true" />
                  <div className="absolute right-0 mt-sm w-56 z-50 chrome-surface border border-border rounded-lg shadow-lg py-sm">
                    <div className="px-md py-sm border-b border-border/60">
                      <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                    </div>
                    {[
                      { label: 'Account', to: '/account' },
                      { label: 'Orders', to: '/account/orders' },
                      { label: 'Wishlist', to: '/account/wishlist' },
                      { label: 'Profile', to: '/account/profile' },
                    ].map((item) => (
                      <button
                        key={item.to}
                        onClick={() => {
                          closeMenu();
                          navigate(item.to);
                        }}
                        className="w-full text-left px-md py-sm text-sm text-on-surface hover:bg-primary/5 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          closeMenu();
                          navigate('/admin');
                        }}
                        className="w-full text-left px-md py-sm text-sm text-primary font-semibold hover:bg-primary/5 transition-colors"
                      >
                        Admin Dashboard
                      </button>
                    )}
                    <div className="border-t border-border/60 mt-sm pt-sm">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-md py-sm text-sm text-danger hover:bg-danger/5 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="material-symbols-outlined text-on-background hover:text-primary transition-colors"
              aria-label="Sign in"
            >
              person
            </button>
          )}
        </div>
      </div>

      {/* Expandable search bar — drops below the bar full-width so it fits at 375
          and 1280 alike. Submits to /search?q= (the results page does the work). */}
      {searchOpen && (
        <div className="absolute left-0 top-full w-full chrome-surface border-b border-border shadow-lg">
          <form
            role="search"
            onSubmit={submitSearch}
            className="flex items-center gap-sm w-full px-margin-mobile md:px-margin-desktop
                       max-w-7xl mx-auto py-md"
          >
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
              search
            </span>
            <input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="search"
              name="q"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              placeholder="Search the collection…"
              aria-label="Search products"
              className="flex-1 bg-transparent font-body-md text-body-md text-on-surface
                         placeholder:text-on-surface-variant focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
              aria-label="Close search"
            >
              close
            </button>
          </form>
        </div>
      )}
    </nav>
  );
};