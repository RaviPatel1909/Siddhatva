import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AccountSidebar } from './AccountSidebar';
import { MobileBottomNav } from './MobileBottomNav';

export const AccountLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-background text-on-background grain-overlay">
    <Navbar />
    <div className="flex flex-1 max-w-7xl w-full mx-auto">
      <AccountSidebar />
      <main className="flex-1 p-margin-mobile md:p-margin-desktop pb-24 md:pb-margin-desktop">
        {children}
      </main>
    </div>
    <Footer />
    <MobileBottomNav />
  </div>
);
