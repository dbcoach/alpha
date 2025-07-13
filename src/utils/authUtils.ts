import { supabase } from '../lib/supabase';

/**
 * Clear all authentication data and force a clean session
 * Useful when users encounter refresh token errors
 */
export const clearAuthSession = async (): Promise<void> => {
  try {
    console.log('Clearing authentication session...');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all auth-related localStorage items
    const authKeys = [
      'supabase.auth.token',
      'rememberMe',
      'lastAuthError'
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear any Supabase-related localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage as well
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('supabase.')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('Authentication session cleared successfully');
    
    // Force reload to ensure clean state
    window.location.href = '/';
    
  } catch (error) {
    console.error('Error clearing auth session:', error);
    
    // Even if there's an error, try to clear localStorage and reload
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
};

/**
 * Check if the current error is an auth token error
 */
export const isAuthTokenError = (error: unknown): boolean => {
  if (!error) return false;

  const errorMessage =
    (typeof error === 'object' && 'message' in error && typeof (error as { message?: string }).message === 'string')
      ? (error as { message?: string }).message
      : error.toString();
  
  return errorMessage.includes('refresh_token_not_found') ||
         errorMessage.includes('Invalid Refresh Token') ||
         errorMessage.includes('refresh_token_expired') ||
         errorMessage.includes('JWT expired') ||
         errorMessage.includes('Authentication required');
};

/**
 * Handle auth errors gracefully
 */
export const handleAuthError = async (error: unknown): Promise<boolean> => {
  if (isAuthTokenError(error)) {
    console.log('Detected auth token error, clearing session...');
    await clearAuthSession();
    return true;
  }
  return false;
};

/**
 * Add to window for debugging purposes
 */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as Window & typeof globalThis & {
    clearAuthSession: typeof clearAuthSession;
    isAuthTokenError: typeof isAuthTokenError;
  }).clearAuthSession = clearAuthSession;

  (window as Window & typeof globalThis & {
    clearAuthSession: typeof clearAuthSession;
    isAuthTokenError: typeof isAuthTokenError;
  }).isAuthTokenError = isAuthTokenError;

  console.log(
    'Auth utilities available on window: clearAuthSession(), isAuthTokenError()'
  );
}

declare global {
  interface Window {
    clearAuthSession: typeof clearAuthSession;
    isAuthTokenError: typeof isAuthTokenError;
  }
}