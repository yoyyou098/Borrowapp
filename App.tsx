
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Settings, ToastData } from './types';
import * as api from './services/localApi';
import Auth from './components/Auth';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import Toast from './components/Toast';

export const AppContext = React.createContext<{
  currentUser: User | null;
  settings: Settings;
  login: (user: User) => void;
  logout: () => void;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'error', undoCallback?: () => void) => void;
  refreshData: () => void;
  updateSettings: (newSettings: Settings) => void;
}>({
  currentUser: null,
  settings: api.getSettings(),
  login: () => {},
  logout: () => {},
  showToast: () => {},
  refreshData: () => {},
  updateSettings: () => {},
});

const adjustBrightness = (hex: string, percent: number) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'auth' | 'student' | 'admin'>('auth');
  const [settings, setSettings] = useState<Settings>(api.getSettings());
  const [toast, setToast] = useState<ToastData | null>(null);
  const [appKey, setAppKey] = useState(0); // Used to force refresh data across components

  useEffect(() => {
    api.ensureInit();
    setSettings(api.getSettings());
  }, []);

  useEffect(() => {
    const { bgColor, textColor } = settings;
    const bgColorDark = adjustBrightness(bgColor, -20);
    document.documentElement.style.setProperty('--bg-primary', bgColor);
    document.documentElement.style.setProperty('--bg-primary-dark', bgColorDark);
    document.documentElement.style.setProperty('--text-primary', textColor);
  }, [settings]);

  const login = useCallback((user: User) => {
    setCurrentUser(user);
    setView('student');
    showToast('Login Successful', `Welcome ${user.role === 'admin' ? 'Admin' : 'Student'}`, 'success');
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setView('auth');
    showToast('Logged Out', 'You have been successfully logged out.', 'info');
  }, []);

  const showToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'error' = 'info', undoCallback?: () => void) => {
    setToast({ id: Date.now(), title, message, type, undoCallback });
  }, []);

  const refreshData = useCallback(() => {
    setAppKey(prev => prev + 1);
  }, []);
  
  const updateSettings = useCallback((newSettings: Settings) => {
    api.saveSettings(newSettings);
    setSettings(newSettings);
    refreshData();
  }, [refreshData]);

  const switchToAdmin = () => {
    if (currentUser?.role === 'admin') {
      setView('admin');
    } else {
      showToast('Permission Denied', 'Only admins can access this page.', 'error');
    }
  };

  const switchToStudent = () => setView('student');

  const contextValue = useMemo(() => ({
    currentUser,
    settings,
    login,
    logout,
    showToast,
    refreshData,
    updateSettings,
  }), [currentUser, settings, login, logout, showToast, refreshData, updateSettings]);

  const renderView = () => {
    switch (view) {
      case 'student':
        return <StudentDashboard key={`student-${appKey}`} onSwitchToAdmin={switchToAdmin} />;
      case 'admin':
        return <AdminDashboard key={`admin-${appKey}`} onSwitchToStudent={switchToStudent} />;
      case 'auth':
      default:
        return <Auth key="auth" />;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br-app from-primary to-primary-dark">
        {renderView()}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </AppContext.Provider>
  );
};

export default App;
