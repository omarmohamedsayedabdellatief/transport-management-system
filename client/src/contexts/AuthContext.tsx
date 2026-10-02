import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import api from '../services/api';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperationsManager: boolean;
  isViewer: boolean;
  canManage: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('tms_access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data);
        localStorage.setItem('tms_user', JSON.stringify(res.data.data));
      } catch {
        localStorage.removeItem('tms_access_token');
        localStorage.removeItem('tms_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: userData } = res.data.data;
    await queryClient.cancelQueries();
    queryClient.clear();
    localStorage.setItem('tms_access_token', accessToken);
    localStorage.setItem('tms_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      await queryClient.cancelQueries();
      queryClient.clear();
      localStorage.removeItem('tms_access_token');
      localStorage.removeItem('tms_user');
      setUser(null);
    }
  };

  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const isOperationsManager = role === 'OPERATIONS_MANAGER';
  const isViewer = role === 'VIEWER';
  const canManage = isAdmin || isOperationsManager;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin,
        isOperationsManager,
        isViewer,
        canManage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};