import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="flex flex-col min-h-screen bg-background text-on-background grain-overlay">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);