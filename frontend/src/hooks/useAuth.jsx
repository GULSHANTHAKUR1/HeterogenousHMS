import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify server session on application mount
  const checkSession = useCallback(async () => {
    try {
      const response = await api.get('/v1/auth/me');
      if (response?.data?.doctor) {
        setDoctor(response.data.doctor);
      } else {
        setDoctor(null);
      }
    } catch (err) {
      // 401 or network disconnect: doctor is unauthenticated
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Real doctor login against backend API with HttpOnly session cookies & Bearer fallback
   */
  const login = async (emailOrId, password) => {
    const response = await api.post('/v1/auth/login', {
      emailOrId: emailOrId.trim(),
      password,
    });

    const authenticatedDoctor = response?.data?.doctor;
    setDoctor(authenticatedDoctor);
    if (response?.data?.accessToken) {
      localStorage.setItem('hms_doctor_token', response.data.accessToken);
    }
    return authenticatedDoctor;
  };

  /**
   * Terminate session on backend, clearing secure HttpOnly cookies & client tokens
   */
  const logout = async () => {
    try {
      await api.post('/v1/auth/logout');
    } catch (err) {
      console.warn('[useAuth] Logout error:', err.message);
    } finally {
      localStorage.removeItem('hms_doctor_token');
      sessionStorage.clear();
      setDoctor(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
        isAuthenticated: !!doctor,
        loading,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
