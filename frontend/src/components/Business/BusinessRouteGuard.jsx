import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const BusinessRouteGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const currentPath = window.location.pathname;
  
  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If user is not authenticated, redirect to sign in
  if (!user) {
    return <Navigate to="/auth/business/signin" replace />;
  }
  
  // If user is not a business user, redirect to their portal
  if (user.userType !== 'business') {
    switch (user.userType) {
      case 'driver':
        return <Navigate to="/driver/your-truck" replace />;
      case 'postal':
        return <Navigate to="/postal/company-details" replace />;
      default:
        return <Navigate to="/auth/signin" replace />;
    }
  }
  
  // Check if we're trying to access business routes from outside business context
  if (!currentPath.startsWith('/business')) {
    return <Navigate to="/business" replace />;
  }
  
  return children;
};

export default BusinessRouteGuard;