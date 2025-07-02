import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

interface AuthErrorHandlerProps {
  children: React.ReactNode;
}

export function AuthErrorHandler({ children }: AuthErrorHandlerProps) {
  const { user, loading, error } = useAuth();
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

  useEffect(() => {
    // Check for auth-related errors in console or localStorage
    const checkForAuthErrors = () => {
      const lastError = localStorage.getItem('lastAuthError');
      if (lastError && lastError.includes('refresh_token')) {
        setShowRefreshPrompt(true);
        localStorage.removeItem('lastAuthError');
      }
    };

    checkForAuthErrors();

    // Listen for storage events (in case of auth errors in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastAuthError' && e.newValue?.includes('refresh_token')) {
        setShowRefreshPrompt(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRefresh = () => {
    setShowRefreshPrompt(false);
    window.location.reload();
  };

  const handleSignIn = () => {
    setShowRefreshPrompt(false);
    window.location.href = '/';
  };

  // Show refresh prompt if there was an auth error
  if (showRefreshPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-orange-100/10 mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">
              Session Expired
            </h3>
            
            <p className="text-slate-300 mb-6">
              Your session has expired. Please refresh the page or sign in again to continue.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Page</span>
              </button>
              
              <button
                onClick={handleSignIn}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook to handle auth errors in components
export function useAuthErrorHandler() {
  const handleAuthError = (error: any) => {
    if (error?.message?.includes('refresh_token') || 
        error?.message?.includes('Invalid Refresh Token')) {
      localStorage.setItem('lastAuthError', error.message);
      // Trigger a storage event to notify the AuthErrorHandler
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'lastAuthError',
        newValue: error.message
      }));
    }
  };

  return { handleAuthError };
}