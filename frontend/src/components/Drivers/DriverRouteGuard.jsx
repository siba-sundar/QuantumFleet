import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const DriverRouteGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const currentPath = window.location.pathname;
  
  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If user is not authenticated, redirect to sign in
  if (!user) {
    return <Navigate to="/auth/driver/signin" replace />;
  }
  
  // If user has explicit userType and it's not driver, redirect them
  if (user.userType && user.userType !== 'driver') {
    switch (user.userType) {
      case 'business':
        return <Navigate to="/business/track-truck" replace />;
      case 'postal':
        return <Navigate to="/postal/company-details" replace />;
      default:
        return <Navigate to="/auth/signin" replace />;
    }
  }
  
  // If user is authenticated and accessing driver routes, allow access
  // This handles both confirmed drivers and newly registered accounts
  if (currentPath.startsWith('/driver')) {
    return children;
  }
  
  // Default redirect to driver dashboard
  return <Navigate to="/driver/your-truck" replace />;
};

export default DriverRouteGuard;