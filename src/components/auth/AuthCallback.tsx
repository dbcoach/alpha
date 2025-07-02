import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // The AuthContext will automatically handle the session from the URL
        // We just need to wait for the auth state to update
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Authentication failed');
          return;
        }

        // Wait a moment for the auth state to update
        setTimeout(() => {
          if (user) {
            setStatus('success');
            setMessage('Successfully signed in! Redirecting...');
            // Redirect to the main app after a short delay
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Authentication failed. Please try again.');
          }
        }, 1000);
      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred during authentication');
      }
    };

    handleAuthCallback();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
          {status === 'loading' && (
            <>
              <Loader className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-semibold text-white mb-2">Processing Authentication</h2>
              <p className="text-slate-300">Please wait while we sign you in...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Authentication Successful</h2>
              <p className="text-slate-300">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Authentication Failed</h2>
              <p className="text-slate-300 mb-6">{message}</p>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Return to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;