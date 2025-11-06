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

  // Initialize from sessionStorage and try to validate token via /auth/me
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = sessionStorage.getItem(TOKEN_USER_KEY);
        const savedToken = sessionStorage.getItem('olive-mill-token');
        
        if (savedUser && savedToken) {
          const parsedUser = JSON.parse(savedUser);
          api.setToken(savedToken);
          setUser(parsedUser);
          
          // Validate token with backend
          try {
            const me = await api.get<User>('/auth/me');
            setUser(me);
            sessionStorage.setItem(TOKEN_USER_KEY, JSON.stringify(me));
          } catch (error) {
            // Token invalid, logout
            sessionStorage.removeItem(TOKEN_USER_KEY);
            sessionStorage.removeItem('olive-mill-token');
            api.setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        sessionStorage.removeItem(TOKEN_USER_KEY);
        sessionStorage.removeItem('olive-mill-token');
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
      const resp = await api.post<{ token: string; user: User }>('auth/login', { email, password }, {
        headers: {
          'X-Skip-Credentials': 'true' // Prevent browser credential prompt
        }
      });
      console.log('Login response:', resp);
      api.setToken(resp.token);
      
      // Use sessionStorage instead of localStorage for auto-logout on close
      sessionStorage.setItem(TOKEN_USER_KEY, JSON.stringify(resp.user));
      sessionStorage.setItem('olive-mill-token', resp.token);
      
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
        },
        {
          headers: {
            'X-Skip-Credentials': 'true' // Prevent browser credential prompt
          }
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
      sessionStorage.setItem(TOKEN_USER_KEY, JSON.stringify(loginResp.user));
      sessionStorage.setItem('olive-mill-token', loginResp.token);
      setUser(loginResp.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'auth.signupFailed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_USER_KEY);
    sessionStorage.removeItem('olive-mill-token');
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

