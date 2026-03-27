import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Safety timeout — never stay stuck loading
    const timeout = setTimeout(() => {
      setIsLoadingAuth(false);
    }, 6000);

    base44.auth.me()
      .then((currentUser) => {
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
      })
      .catch((error) => {
        setIsAuthenticated(false);
        const status = error?.status || error?.response?.status;
        if (status === 401 || status === 403) {
          setAuthError({ type: 'auth_required' });
        } else if (error?.message?.includes('not_registered') || error?.code === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered' });
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setIsLoadingAuth(false);
      });

    return () => clearTimeout(timeout);
  }, []);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout();
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};