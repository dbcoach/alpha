import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Loader } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback,
  showFallback = true 
}) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, render children
  if (user) {
    return <>{children}</>;
  }

  // If user is not authenticated and we should show fallback
  if (showFallback) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
            <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Authentication Required</h2>
            <p className="text-slate-300 mb-6">
              You need to be signed in to access this feature. Please sign in to continue.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Sign In
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-lg transition-all duration-200"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if showFallback is false
  return null;
};

export default ProtectedRoute;