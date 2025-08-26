import { useState, useEffect, useContext, createContext } from "react";
import { AuthService } from "../services/AuthService.js";

// Create Auth Context
const AuthContext = createContext();

/**
 * AuthProvider component that wraps the app and provides authentication state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = AuthService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    error,
    setError,
    
    // Authentication methods
    signInWithEmail: async (email, password) => {
      setLoading(true);
      setError(null);
      try {
        const result = await AuthService.signInWithEmail(email, password);
        if (!result.success) {
          setError(result.message);
        }
        return result;
      } catch (error) {
        setError(error.message);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },

    registerWithEmail: async (email, password, userType, profileData) => {
      setLoading(true);
      setError(null);
      try {
        const result = await AuthService.registerWithEmail(email, password, userType, profileData);
        if (!result.success) {
          setError(result.message);
        }
        return result;
      } catch (error) {
        setError(error.message);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },

    sendOTP: async (phoneNumber) => {
      setLoading(true);
      setError(null);
      try {
        const result = await AuthService.sendOTPToDriver(phoneNumber);
        if (!result.success) {
          setError(result.message);
        }
        return result;
      } catch (error) {
        setError(error.message);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },

    verifyOTP: async (confirmationResult, otpCode, profileData) => {
      setLoading(true);
      setError(null);
      try {
        const result = await AuthService.verifyOTPAndSignIn(confirmationResult, otpCode, profileData);
        if (!result.success) {
          setError(result.message);
        }
        return result;
      } catch (error) {
        setError(error.message);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },

    signOut: async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await AuthService.signOutUser();
        if (result.success) {
          setUser(null);
        } else {
          setError(result.message);
        }
        return result;
      } catch (error) {
        setError(error.message);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },

    sendPasswordReset: async (email) => {
      setError(null);
      try {
        const result = await AuthService.sendPasswordReset(email);
        if (!result.success) {
          setError(result.message);
        }
        return result;
      } catch (error) {
        setError(error.message);
        return { success: false, message: error.message };
      }
    },

    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use authentication context
 * @returns {Object} Authentication context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Custom hook for authentication state only (without methods)
 * @returns {Object} User state and loading status
 */
export function useAuthState() {
  const { user, loading, error } = useAuth();
  return { user, loading, error };
}

/**
 * Custom hook to check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  return !loading && !!user;
}

/**
 * Custom hook to check user type
 * @returns {string|null} User type or null
 */
export function useUserType() {
  const { user, loading } = useAuth();
  return !loading && user ? user.userType : null;
}

/**
 * Custom hook for role-based access control
 * @param {string|Array} allowedRoles - Single role or array of allowed roles
 * @returns {boolean} True if user has access
 */
export function useHasRole(allowedRoles) {
  const userType = useUserType();
  
  if (!userType) return false;
  
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(userType);
  }
  
  return userType === allowedRoles;
}

/**
 * Custom hook for protected routes
 * @param {string|Array} allowedRoles - Roles allowed to access the route
 * @returns {Object} Access information
 */
export function useProtectedRoute(allowedRoles = null) {
  const { user, loading } = useAuth();
  const hasRole = useHasRole(allowedRoles);
  
  return {
    isAuthenticated: !!user,
    hasAccess: allowedRoles ? hasRole : !!user,
    loading,
    user,
    userType: user?.userType || null
  };
}