import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const PostalRouteGuard = ({ children }) => {
  const { user, loading } = useAuth();
  
  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If user is not authenticated, redirect to sign in
  if (!user) {
    return <Navigate to="/auth/postal/signin" replace />;
  }
  
  // If user is not a postal user, redirect to their portal
  if (user.userType !== 'postal') {
    switch (user.userType) {
      case 'driver':
        return <Navigate to="/driver/your-truck" replace />;
      case 'business':
        return <Navigate to="/business/track-truck" replace />;
      default:
        return <Navigate to="/auth/signin" replace />;
    }
  }
  
  return children;
};

export default PostalRouteGuard;