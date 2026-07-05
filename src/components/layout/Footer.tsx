// ============================================================================
// 12. FOOTER
// ============================================================================
import React, { useState } from 'react';
 
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
        </div>
 
        {/* Shop Links */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
            Shop
          </h4>
          <ul className="flex flex-col gap-base">
            {['Men', 'Women', 'Kids', 'Collections'].map((link) => (
              <li key={link}>
                <a
                  href="#"
                  className="font-body-md text-body-md text-on-background/70
                           hover:text-primary transition-colors"
                >
                  {link}
                </a>
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
            {['Shipping', 'Returns', 'Contact', 'About Us'].map((link) => (
              <li key={link}>
                <a
                  href="#"
                  className="font-body-md text-body-md text-on-background/70
                           hover:text-primary transition-colors"
                >
                  {link}
                </a>
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
          <a
            href="#"
            className="font-body-md text-on-background/60
                      hover:text-primary text-sm transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="font-body-md text-on-background/60
                      hover:text-primary text-sm transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
};