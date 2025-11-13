import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<User['role']>;
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Helper function to get redirect path based on user role
  const getRedirectPath = (userRole: string) => {
    if (userRole === 'scanner') {
      return '/scanner';
    }
    if (userRole === 'operator') {
      return '/operator-scanner';
    }
    if (userRole === 'employee') {
      return '/employee-scanner';
    }
    if (userRole === 'queuer') {
      return '/queuer-scanner';
    }
    return '/dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  return <>{children}</>;
}