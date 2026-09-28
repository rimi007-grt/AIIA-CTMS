import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const ROLES = {
  PI: 'Principal Investigator (PI)',
  COORDINATOR: 'Study Coordinator',
  MONITOR: 'Clinical Monitor',
  ETHICS: 'Ethics Committee Member',
  PV: 'Pharmacovigilance Officer',
  ADMIN: 'Institutional Admin',
  REGULATOR: 'Regulator'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('aiia_ctms_token'));
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('aiia_theme') || 'light');

  // Load user session on mount
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('aiia_ctms_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  // Sync theme with DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aiia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aiia_theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const login = async (credentials) => {
    const res = await api.login(credentials);
    localStorage.setItem('aiia_ctms_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('aiia_ctms_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const demoLogin = async (payload) => {
    const res = await api.demoLogin(payload);
    localStorage.setItem('aiia_ctms_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('aiia_ctms_token');
    setToken(null);
    setUser(null);
  };

  // RBAC Permission Helpers
  const isPI = user?.designation === ROLES.PI;
  const isCoordinator = user?.designation === ROLES.COORDINATOR;
  const isMonitor = user?.designation === ROLES.MONITOR;
  const isEthics = user?.designation === ROLES.ETHICS;
  const isPV = user?.designation === ROLES.PV;
  const isAdmin = user?.designation === ROLES.ADMIN;
  const isRegulator = user?.designation === ROLES.REGULATOR;

  const permissions = {
    canCreateTrial: isPI || isCoordinator || isAdmin,
    canEditTrial: isPI || isCoordinator || isAdmin,
    canApproveEthics: isEthics || isAdmin,
    canFlagDeviation: isMonitor || isPI || isAdmin,
    canReportAE: isPI || isCoordinator || isPV || isAdmin,
    canViewAudit: isAdmin || isRegulator,
    canManageUsers: isAdmin,
    isReadOnly: isRegulator
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        toggleTheme,
        login,
        register,
        demoLogin,
        logout,
        ROLES,
        isPI,
        isCoordinator,
        isMonitor,
        isEthics,
        isPV,
        isAdmin,
        isRegulator,
        permissions
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
