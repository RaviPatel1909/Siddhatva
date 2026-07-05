import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-background text-on-background overflow-x-hidden">
    <AdminSidebar />
    <AdminTopbar />
    <main className="ml-64 pt-16">
      <div className="p-lg">{children}</div>
    </main>
  </div>
);
