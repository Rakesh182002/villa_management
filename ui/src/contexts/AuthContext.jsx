import  { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import CryptoJS from 'crypto-js';

const AuthContext = createContext(null);

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'society-mgmt-secret-key-2024';

// Use sessionStorage so each browser tab has its own independent login session.
// localStorage is shared across tabs — switching users in one tab would affect all others.
const storage = window.sessionStorage;

const encryptData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

const decryptData = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Initialize auth state from this tab's sessionStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = storage.getItem('token');
        const encryptedUser = storage.getItem('user_data');

        if (storedToken && encryptedUser) {
          const userData = decryptData(encryptedUser);

          if (userData) {
            setToken(storedToken);
            setUser(userData);

            try {
              const response = await authAPI.getMe();
              setUser(response.data.data);
              socketService.connect(response.data.data.id);
            } catch (error) {
              // Token invalid — clear this tab's auth
              logout();
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { user: userData, token: authToken } = response.data.data;

      // Store in sessionStorage (tab-isolated)
      storage.setItem('token', authToken);
      storage.setItem('user_data', encryptData(userData));

      setToken(authToken);
      setUser(userData);

      socketService.connect(userData.id);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user: newUser, token: authToken } = response.data.data;

      storage.setItem('token', authToken);
      storage.setItem('user_data', encryptData(newUser));

      setToken(authToken);
      setUser(newUser);

      socketService.connect(newUser.id);

      return { success: true, user: newUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = () => {
    storage.removeItem('token');
    storage.removeItem('user_data');

    setToken(null);
    setUser(null);

    socketService.disconnect();
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    storage.setItem('user_data', encryptData(updatedUser));
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      const userData = response.data.data;
      setUser(userData);
      storage.setItem('user_data', encryptData(userData));
      return userData;
    } catch (error) {
      console.error('Refresh user error:', error);
      logout();
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;