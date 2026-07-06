import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AuthLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <span className="inline-block animate-spin material-symbols-outlined text-primary text-4xl">
      progress_activity
    </span>
  </div>
);

// Gates /account/*. Unauthenticated users go to /login, remembering where they
// were so login can send them back.
export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
};

// Gates /admin/*. Requires the ADMIN role; customers are sent home.
export const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
};
