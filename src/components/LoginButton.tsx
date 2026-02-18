import React, { useState } from 'react';
import { LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginButton: React.FC = () => {
  const { login, refreshAuth } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuth();
      console.log('Auth status refreshed');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="flex items-center gap-2 px-4 py-2 bg-[#8B9B8D] hover:bg-[#7A8A7D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogIn className="w-4 h-4" />
        {isLoggingIn ? 'Opening...' : 'Sign In'}
      </button>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 px-3 py-2 bg-[#A39A91] hover:bg-[#8A7F75] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Check login status"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};
