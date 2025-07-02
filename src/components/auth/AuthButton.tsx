import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from './AuthModal';

const AuthButton: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  const handleNavigateToSettings = () => {
    navigate('/settings');
    setShowUserMenu(false);
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getAvatarUrl = () => {
    // Try to get avatar from user metadata first, then from profile
    return user?.user_metadata?.avatar_url;
  };

  if (user) {
    const avatarUrl = getAvatarUrl();

    return (
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
          aria-label="User menu"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-slate-600 group-hover:ring-purple-400 transition-colors">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile picture"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                        ${getInitials(user.email || 'U')}
                      </div>
                    `;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {getInitials(user.email || 'U')}
              </div>
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
              {user.user_metadata?.name || user.email}
            </p>
            <p className="text-xs text-slate-400">Signed in</p>
          </div>
        </button>

        {/* User dropdown menu - also use portal for proper layering */}
        {showUserMenu && createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 50000 }}
              onClick={() => setShowUserMenu(false)}
            />
            
            {/* Menu positioned at button location */}
            <div 
              className="fixed bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl w-64"
              style={{ 
                zIndex: 50001,
                top: '80px', // Approximate position - in a real app you'd calculate this
                right: '16px'
              }}
            >
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile picture"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                                ${getInitials(user.email || 'U')}
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {getInitials(user.email || 'U')}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user.user_metadata?.name || user.email}
                    </p>
                    <p className="text-xs text-slate-400">Free Plan</p>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to Pro</span>
                </button>
                
                <button 
                  onClick={handleNavigateToSettings}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Account Settings</span>
                </button>
                
                <hr className="my-2 border-slate-700/50" />
                
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loading ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAuthModal(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
      >
        <User className="w-4 h-4" />
        <span>Sign In</span>
      </button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </>
  );
};

export default AuthButton;