import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, SignupData } from '@/types/auth';
import { api } from '@/integrations/api/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const TOKEN_USER_KEY = 'olive-mill-user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage and try to validate token via /auth/me
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem(TOKEN_USER_KEY);
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          if (api.getToken()) {
            const me = await api.get<User>('/auth/me');
            setUser(me);
            localStorage.setItem(TOKEN_USER_KEY, JSON.stringify(me));
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem(TOKEN_USER_KEY);
        api.setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting login to:', (import.meta as any).env?.VITE_BASE_BACKEND_API);
      const resp = await api.post<{ token: string; user: User }>('auth/login', { email, password });
      console.log('Login response:', resp);
      api.setToken(resp.token);
      localStorage.setItem(TOKEN_USER_KEY, JSON.stringify(resp.user));
      setUser(resp.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'auth.invalidCredentials' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: SignupData) => {
    setLoading(true);
    try {
      const resp = await api.post<{ id: number; email: string; role: string; token?: string }>(
        '/auth/register',
        {
          email: userData.email,
          password: userData.password,
          role: userData.role || 'operator',
          firstname: userData.firstname,
          lastname: userData.lastname,
        }
      );
      // Some backends may return token; if so, store it.
      if (resp && (resp as any).token) {
        api.setToken((resp as any).token);
      }
      // After registration, perform login to obtain token and user
      const loginResp = await api.post<{ token: string; user: User }>('/auth/login', {
        email: userData.email,
        password: userData.password,
      });
      api.setToken(loginResp.token);
      localStorage.setItem(TOKEN_USER_KEY, JSON.stringify(loginResp.user));
      setUser(loginResp.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'auth.signupFailed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_USER_KEY);
    api.setToken(null);
    setUser(null);
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    signup
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Removed duplicate declaration of useAuth

