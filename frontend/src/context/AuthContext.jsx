import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const isTokenValid = (tokenStr) => {
  if (!tokenStr) return false;
  try {
    const payloadBase64 = tokenStr.split('.')[1];
    if (!payloadBase64) return false;
    const payloadJson = JSON.parse(atob(payloadBase64));
    if (payloadJson.exp && payloadJson.exp * 1000 < Date.now()) {
      return false; // Expired token
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('fit_arc_gym_token') || localStorage.getItem('fitclub_token');
    if (savedToken && isTokenValid(savedToken)) {
      return savedToken;
    }
    localStorage.removeItem('fit_arc_gym_token');
    localStorage.removeItem('fitclub_token');
    localStorage.removeItem('fit_arc_gym_user');
    localStorage.removeItem('fitclub_user');
    return null;
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('fit_arc_gym_user') || localStorage.getItem('fitclub_user');
    const savedToken = localStorage.getItem('fit_arc_gym_token') || localStorage.getItem('fitclub_token');
    return savedToken && isTokenValid(savedToken) && savedUser ? JSON.parse(savedUser) : null;
  });

  const [loading, setLoading] = useState(false);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fit_arc_gym_token');
    localStorage.removeItem('fit_arc_gym_user');
    localStorage.removeItem('fitclub_token');
    localStorage.removeItem('fitclub_user');
  };

  const handleSessionExpired = () => {
    logout();
    sessionStorage.setItem('fit_auth_toast', 'Your session has expired. Please log in again.');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    if (token && !isTokenValid(token)) {
      handleSessionExpired();
    }
  }, [token]);

  const saveAuthSession = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('fit_arc_gym_token', newToken);
    localStorage.setItem('fit_arc_gym_user', JSON.stringify(newUser));
  };

  const authFetch = async (endpoint, options = {}) => {
    const isPublicAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register') || endpoint.startsWith('/auth/forgot-password');

    if (token && !isTokenValid(token) && !isPublicAuthEndpoint) {
      handleSessionExpired();
      return { success: false, message: 'Your session has expired. Please log in again.' };
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    };

    const config = {
      ...options,
      headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if ((response.status === 401 || response.status === 403) && !isPublicAuthEndpoint) {
      handleSessionExpired();
    }

    const data = await response.json();

    if (data && !data.success && !isPublicAuthEndpoint && (data.message === 'Not authorized, token invalid or expired' || data.message === 'User no longer exists')) {
      handleSessionExpired();
    }

    return data;
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (data.success) {
        const { token: newToken, user: newUser } = data.data;
        saveAuthSession(newToken, newUser);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: 'Login request failed. Server connection error.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (registerData) => {
    setLoading(true);
    try {
      const data = await authFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData)
      });

      if (data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: 'Registration failed. Server connection error.' };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      return await authFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    } catch (error) {
      return { success: false, message: 'Failed to send OTP.' };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      return await authFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      });
    } catch (error) {
      return { success: false, message: 'OTP verification failed.' };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      return await authFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword })
      });
    } catch (error) {
      return { success: false, message: 'Password reset failed.' };
    }
  };

  const updateUserProfileState = (updatedUser) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('fit_arc_gym_user', JSON.stringify(merged));
      return merged;
    });
  };

  const refreshUserPlan = async () => {
    try {
      const res = await authFetch('/plan');
      if (res.success && res.data) {
        const { currentPlan, planDisplayName, planStartDate, planExpiryDate, planDuration, paymentStatus } = res.data;
        updateUserProfileState({
          currentPlan,
          plan: planDisplayName,
          planStartDate,
          planExpiryDate,
          planDuration,
          paymentStatus
        });
      }
    } catch (e) {
      console.warn('Failed to refresh user plan:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user && isTokenValid(token),
        login,
        register,
        forgotPassword,
        verifyOTP,
        resetPassword,
        logout,
        handleSessionExpired,
        updateUserProfileState,
        refreshUserPlan,
        authFetch,
        API_BASE_URL
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

