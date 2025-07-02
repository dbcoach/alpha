import React, { useState } from 'react';
import { clearAuthSession } from '../../utils/authUtils';
import { useAuth } from '../../contexts/AuthContext';
import { RefreshCw, Trash2, Info, AlertTriangle } from 'lucide-react';

export function AuthDebugPanel() {
  const { user, session, error } = useAuth();
  const [isClearing, setIsClearing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // Only show in development or if there's an auth error
  if (!import.meta.env.DEV && !error) {
    return null;
  }

  const handleClearSession = async () => {
    setIsClearing(true);
    try {
      await clearAuthSession();
    } catch (err) {
      console.error('Error clearing session:', err);
    } finally {
      setIsClearing(false);
    }
  };

  if (!showPanel) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowPanel(true)}
          className="flex items-center space-x-2 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg shadow-lg backdrop-blur-sm border border-red-500/50 transition-all duration-200"
          title="Show auth debug panel"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Auth Issues?</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="p-4 rounded-2xl bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Info className="w-4 h-4" />
            <span>Auth Debug Panel</span>
          </h3>
          <button
            onClick={() => setShowPanel(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-slate-700/50 rounded">
              <div className="text-slate-400">User</div>
              <div className="text-white font-mono">
                {user ? user.email : 'None'}
              </div>
            </div>
            <div className="p-2 bg-slate-700/50 rounded">
              <div className="text-slate-400">Session</div>
              <div className="text-white font-mono">
                {session ? 'Active' : 'None'}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-900/30 border border-red-600/30 rounded">
              <div className="text-red-400 font-medium mb-1">Error:</div>
              <div className="text-red-300 font-mono text-xs break-words">
                {error}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleClearSession}
              disabled={isClearing}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {isClearing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{isClearing ? 'Clearing...' : 'Clear Session'}</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>
          </div>

          <div className="text-slate-500 text-xs">
            <p>If you're seeing auth errors, try clearing your session first.</p>
          </div>
        </div>
      </div>
    </div>
  );
}