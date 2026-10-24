import React, { createContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Sync state if session expires elsewhere
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  // Verify token validity
  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setToken(tokenToVerify);
        } else {
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        }
      } else {
        // Token is invalid/expired - clear stale storage
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Signup failed');
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
    } catch (error) {
      throw error;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
  }, []);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
