// ============================================================================
// 12. FOOTER
// ============================================================================
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  brandName?: string;
  brandDescription?: string;
  onNewsletterSubmit?: (email: string) => void;
}
 
export const Footer: React.FC<FooterProps> = ({
  brandName = 'Siddhatva',
  brandDescription = 'Crafting a new paradigm of luxury through structural integrity and minimalist intention.',
  onNewsletterSubmit,
}) => {
  const [email, setEmail] = useState('');
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;
    onNewsletterSubmit?.(email);
    setEmail('');
  };
 
  return (
    <footer className="w-full chrome-surface-grounded py-xl mt-xl border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md w-full px-margin-desktop py-xl max-w-7xl mx-auto">
        {/* Brand Column */}
        <div className="flex flex-col gap-sm">
          <span className="font-display text-headline-lg text-primary">
            {brandName}
          </span>
          <p className="text-on-surface-variant font-body-md text-body-md mt-sm">
            {brandDescription}
          </p>
          {/* Follow Us */}
          <div className="mt-sm">
            <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold mb-xs">
              Follow Us
            </h4>
            <a
              href="https://www.instagram.com/_siddhatva_31"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Siddhatva on Instagram"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border
                        text-on-background/70 hover:text-primary hover:border-primary transition-colors
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {/* Monochrome Instagram mark (Simple Icons path), inherits currentColor —
                  Material Symbols has no brand glyph, and no icon dependency is added. */}
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>
 
        {/* Shop Links */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
            Shop
          </h4>
          <ul className="flex flex-col gap-base">
            {[
              { label: 'Men', to: '/shop/Men' },
              { label: 'Women', to: '/shop/Women' },
              { label: 'Kids', to: '/shop/Kids' },
              { label: 'Collections', to: '/shop' },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="font-body-md text-body-md text-on-background/70
                           hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
 
        {/* Support Links */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
            Support
          </h4>
          <ul className="flex flex-col gap-base">
            {[
              { label: 'Shipping Policy', to: '/shipping-policy' },
              { label: 'Cancellation & Refund', to: '/refund-policy' },
              { label: 'Pricing Policy', to: '/pricing-policy' },
              { label: 'Contact Us', to: '/contact' },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="font-body-md text-body-md text-on-background/70
                           hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
 
        {/* Newsletter */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
            Newsletter
          </h4>
          <p className="text-on-surface-variant text-body-md mb-base">
            Subscribe to receive atelier updates and early access.
          </p>
          <form
            onSubmit={handleNewsletterSubmit}
            className="flex items-center gap-xs"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full h-12 bg-transparent border border-border rounded-lg px-4
                        text-on-surface font-body-md text-sm
                        placeholder:text-on-surface-variant
                        focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30
                        transition-all"
              required
            />
            <button
              type="submit"
              disabled={!isEmailValid}
              aria-label="Subscribe"
              className="h-12 w-12 shrink-0 flex items-center justify-center rounded-lg
                        bg-secondary text-on-secondary shadow-sm hover:brightness-105 active:scale-95 transition-all
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        </div>
      </div>
 
      {/* Bottom Bar */}
      <div
        className="max-w-7xl mx-auto px-margin-desktop py-md border-t 
                  border-outline-variant/10 flex flex-col md:flex-row 
                  justify-between items-center gap-sm"
      >
        <p className="font-body-md text-body-md text-on-background/60 text-sm">
          © 2024 {brandName}. All rights reserved.
        </p>
        <div className="flex gap-md">
          <Link
            to="/privacy"
            className="font-body-md text-on-background/60
                      hover:text-primary text-sm transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="font-body-md text-on-background/60
                      hover:text-primary text-sm transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};