import React from 'react';
import { Link } from 'react-router-dom';
import { Footer } from './Footer';
import { Seo } from '../seo/Seo';

export const CheckoutLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-background text-on-background grain-overlay">
    {/* Checkout is transactional — default to noindex (pages may override title). */}
    <Seo title="Checkout" noindex />
    <header className="sticky top-0 z-50 w-full h-20 chrome-surface border-b border-border">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto h-20">
        <Link
          to="/"
          className="font-display text-headline-md text-primary tracking-tighter hover:opacity-80 transition-opacity duration-300"
        >
          Siddhatva
        </Link>
        <div className="flex items-center gap-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          <span className="font-label-sm text-label-sm uppercase tracking-widest">Secure Checkout</span>
        </div>
      </div>
    </header>
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);
