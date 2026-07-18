import React, { useEffect, useState } from 'react';
import { getToken, removeToken, api } from './services/api';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Loader } from 'lucide-react';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(getToken());
  const [currentPage, setCurrentPage] = useState<'login' | 'register' | 'dashboard' | 'profile'>('login');
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      await api.user.me();
      setCurrentPage('dashboard');
    } catch {
      // Token is likely invalid/expired
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserInfo();
    } else {
      setCurrentPage('login');
      setLoading(false);
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    removeToken();
    setToken(null);
    setCurrentPage('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  switch (currentPage) {
    case 'login':
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setCurrentPage('register')}
        />
      );
    case 'register':
      return <Register onNavigateToLogin={() => setCurrentPage('login')} />;
    case 'dashboard':
      return (
        <Dashboard
          onLogout={handleLogout}
          onNavigateToProfile={() => setCurrentPage('profile')}
        />
      );
    case 'profile':
      return (
        <Profile
          onBackToDashboard={() => setCurrentPage('dashboard')}
          onAccountDeleted={handleLogout}
        />
      );
    default:
      return <Login onLoginSuccess={handleLoginSuccess} onNavigateToRegister={() => setCurrentPage('register')} />;
  }
};

export default App;
