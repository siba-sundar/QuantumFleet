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
  
  // If user is not a driver, redirect to their portal
  if (user.userType !== 'driver') {
    switch (user.userType) {
      case 'business':
        return <Navigate to="/business/track-truck" replace />;
      case 'postal':
        return <Navigate to="/postal/company-details" replace />;
      default:
        return <Navigate to="/auth/signin" replace />;
    }
  }
  
  // Check if we're trying to access driver routes from outside driver context
  if (!currentPath.startsWith('/driver')) {
    return <Navigate to="/driver/your-truck" replace />;
  }
  
  return children;
};

export default DriverRouteGuard;