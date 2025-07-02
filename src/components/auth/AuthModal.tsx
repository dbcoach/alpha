import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, Eye, EyeOff, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

type AuthMode = 'signin' | 'signup' | 'reset';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { signUp, signIn, resetPassword, loading, error, clearError } = useAuth();

  // Form validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    // Basic validation
    if (!email || !isValidEmail(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (mode === 'reset') {
      const { error } = await resetPassword(email);
      if (!error) {
        setSuccessMessage('Password reset link sent to your email');
        setEmail('');
      }
      return;
    }

    if (!password) {
      setLocalError('Password is required');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }

      const { error } = await signUp(email, password);
      if (!error) {
        setSuccessMessage('Account created! Please check your email to verify your account.');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      const { error } = await signIn(email, password, rememberMe);
      if (!error) {
        onClose();
      }
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRememberMe(false);
    setLocalError(null);
    setSuccessMessage(null);
    clearError();
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const currentError = localError || error;

  // Modal JSX
  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        zIndex: 99999, // Very high z-index
        position: 'fixed' // Ensure it's positioned relative to viewport
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 1 }}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 w-full max-w-md shadow-2xl shadow-black/50"
        style={{ zIndex: 2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center space-x-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {currentError && (
            <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{currentError}</p>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field (not for reset mode) */}
          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  placeholder="Enter your password"
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator (signup only) */}
              {mode === 'signup' && password && (
                <div className="mt-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => {
                      const strength = getPasswordStrength(password);
                      return (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded ${
                            strength >= level
                              ? strength <= 2
                                ? 'bg-red-400'
                                : strength <= 3
                                ? 'bg-yellow-400'
                                : 'bg-green-400'
                              : 'bg-slate-600'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Password strength: {' '}
                    {getPasswordStrength(password) <= 2 && 'Weak'}
                    {getPasswordStrength(password) === 3 && 'Fair'}
                    {getPasswordStrength(password) === 4 && 'Good'}
                    {getPasswordStrength(password) === 5 && 'Strong'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirm Password Field (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Remember Me (signin only) */}
          {mode === 'signin' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500/50 focus:ring-2"
                />
                <span className="text-sm text-slate-300">Remember me</span>
              </label>
              
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <User className="w-4 h-4" />
                <span>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Link'}
                </span>
              </>
            )}
          </button>

          {/* Mode Switch */}
          <div className="text-center">
            {mode === 'signin' && (
              <p className="text-slate-400 text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  Sign up
                </button>
              </p>
            )}
            
            {mode === 'signup' && (
              <p className="text-slate-400 text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
            
            {mode === 'reset' && (
              <p className="text-slate-400 text-sm">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  // Don't render if not open
  if (!isOpen) return null;

  // Use portal to render modal at document root
  return createPortal(modalContent, document.body);
};

export default AuthModal;