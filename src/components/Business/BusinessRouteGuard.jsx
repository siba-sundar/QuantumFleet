import React from 'react';
import { Navigate } from 'react-router-dom';

const BusinessRouteGuard = ({ children }) => {
  const currentPath = window.location.pathname;
  
  // Check if we're trying to access business routes from outside business context
  if (!currentPath.startsWith('/business')) {
    return <Navigate to="/business" replace />;
  }
  
  return children;
};

export default BusinessRouteGuard;