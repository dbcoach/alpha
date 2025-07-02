import { useAuth } from '../../contexts/AuthContext';

// Hook to handle auth errors in components
export function useAuthErrorHandler() {
  const { signOut } = useAuth();

  const handleAuthError = (error: Error) => {
    if (error?.message?.includes('refresh_token') || 
        error?.message?.includes('Invalid Refresh Token')) {
      localStorage.setItem('lastAuthError', error.message);
      // Trigger a storage event to notify the AuthErrorHandler
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'lastAuthError',
        newValue: error.message
      }));
      signOut(); // Also sign out the user
    }
  };

  return { handleAuthError };
}
