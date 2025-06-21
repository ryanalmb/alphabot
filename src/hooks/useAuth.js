import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://54.91.193.144:3000';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Check for existing auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('alpha_pack_token');
    const savedUser = localStorage.getItem('alpha_pack_user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('alpha_pack_token');
        localStorage.removeItem('alpha_pack_user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = useCallback(async (telegramUser) => {
    setLoading(true);
    
    try {
      // Authenticate with backend
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramUser,
          initData: window.Telegram?.WebApp?.initData || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      // Save auth data
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      
      localStorage.setItem('alpha_pack_token', data.token);
      localStorage.setItem('alpha_pack_user', JSON.stringify(data.user));
      
      console.log('Authentication successful:', data.user);
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback for development - create mock user
      const mockUser = {
        id: telegramUser.id,
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        balance: 10000,
        packId: null,
        joinedAt: new Date().toISOString(),
      };
      
      const mockToken = 'mock_token_' + Date.now();
      
      setToken(mockToken);
      setUser(mockUser);
      setIsAuthenticated(true);
      
      localStorage.setItem('alpha_pack_token', mockToken);
      localStorage.setItem('alpha_pack_user', JSON.stringify(mockUser));
      
      console.log('Using mock authentication:', mockUser);
    }
    
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    localStorage.removeItem('alpha_pack_token');
    localStorage.removeItem('alpha_pack_user');
  }, []);

  const updateUser = useCallback((updates) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('alpha_pack_user', JSON.stringify(updatedUser));
    }
  }, [user]);

  // API helper with auth
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return response.json();
  }, [token]);

  return {
    isAuthenticated,
    user,
    loading,
    token,
    login,
    logout,
    updateUser,
    apiCall,
  };
};
