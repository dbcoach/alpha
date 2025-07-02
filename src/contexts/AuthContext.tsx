import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Define auth state interface
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

// Define auth actions interface
interface AuthActions {
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  clearError: () => void;
}

// Combine state and actions
interface AuthContextType extends AuthState, AuthActions {}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rate limiting state
  const [authAttempts, setAuthAttempts] = useState<{ [key: string]: number }>({});
  const MAX_ATTEMPTS = 5;
  const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          
          // Handle specific auth errors - be more comprehensive
          if (error.message?.includes('refresh_token_not_found') || 
              error.message?.includes('Invalid Refresh Token') ||
              error.message?.includes('refresh_token_expired') ||
              error.message?.includes('JWT expired') ||
              error.status === 400) {
            console.log('Auth token invalid, clearing session and storage');
            
            try {
              // Clear any stale tokens and force sign out
              await supabase.auth.signOut();
              
              // Clear all auth-related storage
              const authKeys = ['supabase.auth.token', 'rememberMe', 'lastAuthError'];
              authKeys.forEach(key => localStorage.removeItem(key));
              
              // Clear any Supabase-related localStorage items
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('supabase.')) {
                  localStorage.removeItem(key);
                }
              });
              
              setSession(null);
              setUser(null);
              setError(null); // Don't show error to user for expired tokens
              
              console.log('Session cleared successfully');
            } catch (clearError) {
              console.error('Error clearing session:', clearError);
              // Force reload as fallback
              window.location.reload();
            }
          } else {
            setError(error.message);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Unexpected error getting session:', err);
        
        // If there's a network or parsing error, try to clear session
        if (err instanceof Error && 
            (err.message.includes('refresh_token') || 
             err.message.includes('Invalid') ||
             err.message.includes('JWT') ||
             err.message.includes('Authentication'))) {
          console.log('Clearing invalid session due to error:', err.message);
          
          try {
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            setSession(null);
            setUser(null);
            setError(null);
          } catch (clearError) {
            console.error('Error during cleanup:', clearError);
            // Force reload as last resort
            window.location.reload();
          }
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Clear errors on successful auth state change
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setError(null);
        }

        // Handle specific auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in:', session?.user?.email);
            break;
          case 'SIGNED_OUT':
            console.log('User signed out');
            // Clear any cached data and local storage
            setAuthAttempts({});
            localStorage.removeItem('rememberMe');
            // Clear any potential stale tokens
            localStorage.removeItem('supabase.auth.token');
            // Clear any Supabase-related localStorage items
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('supabase.')) {
                localStorage.removeItem(key);
              }
            });
            break;
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed successfully');
            break;
          case 'PASSWORD_RECOVERY':
            console.log('Password recovery initiated');
            break;
          case 'USER_UPDATED':
            console.log('User updated');
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Rate limiting helper
  const checkRateLimit = (email: string): boolean => {
    const now = Date.now();
    const attempts = authAttempts[email] || 0;
    
    // Clean up old attempts
    const cleanedAttempts = { ...authAttempts };
    Object.keys(cleanedAttempts).forEach(key => {
      if (now - cleanedAttempts[key] > RATE_LIMIT_WINDOW) {
        delete cleanedAttempts[key];
      }
    });
    setAuthAttempts(cleanedAttempts);

    return attempts < MAX_ATTEMPTS;
  };

  const recordAttempt = (email: string) => {
    setAuthAttempts(prev => ({
      ...prev,
      [email]: (prev[email] || 0) + 1
    }));
  };

  // Password strength validation
  const validatePasswordStrength = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    return null;
  };

  // Sign up function
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Validate password strength
      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        setError(passwordError);
        return { error: { message: passwordError } as AuthError };
      }

      // Check rate limiting
      if (!checkRateLimit(email)) {
        const errorMsg = 'Too many attempts. Please try again in 15 minutes.';
        setError(errorMsg);
        return { error: { message: errorMsg } as AuthError };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        recordAttempt(email);
        setError(error.message);
        return { error };
      }

      // Success - user will need to verify email
      return { error: null };
    } catch (err) {
      const errorMsg = 'An unexpected error occurred during sign up';
      setError(errorMsg);
      return { error: { message: errorMsg } as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      // Check rate limiting
      if (!checkRateLimit(email)) {
        const errorMsg = 'Too many attempts. Please try again in 15 minutes.';
        setError(errorMsg);
        return { error: { message: errorMsg } as AuthError };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        recordAttempt(email);
        setError(error.message);
        return { error };
      }

      // Handle "remember me" functionality
      if (rememberMe && data.session) {
        // Extend session duration by updating the refresh token expiry
        // This is handled automatically by Supabase, but we can set a flag
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      return { error: null };
    } catch (err) {
      const errorMsg = 'An unexpected error occurred during sign in';
      setError(errorMsg);
      return { error: { message: errorMsg } as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setError(error.message);
        return { error };
      }

      // Clear local storage
      localStorage.removeItem('rememberMe');
      setAuthAttempts({});
      
      return { error: null };
    } catch (err) {
      const errorMsg = 'An unexpected error occurred during sign out';
      setError(errorMsg);
      return { error: { message: errorMsg } as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
        return { error };
      }

      return { error: null };
    } catch (err) {
      const errorMsg = 'An unexpected error occurred during password reset';
      setError(errorMsg);
      return { error: { message: errorMsg } as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}