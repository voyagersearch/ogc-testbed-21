import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const authInfo = await authService.getAuthInfo();
      setUser(authInfo);
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      // Pre-initialize session on app load to avoid 500 errors
      await authService.initializeSession();
      await refreshAuth();
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async () => {
    console.log('AuthContext login called');
    await authService.login();
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
