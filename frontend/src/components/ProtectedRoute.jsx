import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingState from './LoadingState';

/**
 * ARCHITECTURAL NOTICE:
 * Client-side route protection (like this component) improves user experience by
 * redirecting unauthenticated users to the login screen.
 * 
 * IMPORTANT: Frontend route guards are NEVER a substitute for backend authorization.
 * All sensitive medical data, patient records, and OTP validations MUST be strictly
 * authenticated and authorized on the server (Node.js & MongoDB Atlas) using JWT
 * credentials and verified session tokens.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Verifying doctor session credentials..." />;
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated doctor to login, preserving intended path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
