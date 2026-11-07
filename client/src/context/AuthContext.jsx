import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch fresh user data
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.data);
        })
        .catch(err => {
          console.error('Failed to fetch user', err);
          // Fallback to token payload if API fails
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser(payload);
          } catch (e) {
            console.error('Invalid token');
          }
        });
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setToken(res.data.token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', userData);
      setToken(res.data.token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (googleToken) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { token: googleToken });
      setToken(res.data.token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
