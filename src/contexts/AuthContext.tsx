import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import { authApi, getToken, setToken, clearToken } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'privadas_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = getToken();
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        setAuthState({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        clearToken();
        localStorage.removeItem(AUTH_USER_KEY);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { access_token, user } = await authApi.login(email, password);
      setToken(access_token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      setAuthState({ user, token: access_token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Credenciales incorrectas' };
    }
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(AUTH_USER_KEY);
    setAuthState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  };

  const updateUser = (user: User) => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    setAuthState(prev => ({ ...prev, user }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
