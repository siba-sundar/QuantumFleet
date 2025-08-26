import React from 'react';
import { Navigate } from 'react-router-dom';

const PostalRouteGuard = ({ children }) => {
  const currentPath = window.location.pathname;
  
  // Check if we're trying to access postal routes from outside postal context
  if (!currentPath.startsWith('/postal')) {
    return <Navigate to="/postal" replace />;
  }
  
  return children;
};

export default PostalRouteGuard;