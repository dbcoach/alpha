import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Create Supabase client with enhanced security configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable session persistence in localStorage
    persistSession: true,
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Detect session in URL (for email confirmations, password resets)
    detectSessionInUrl: true,
    // Set custom storage for better security
    storage: window.localStorage,
  },
  // Global headers for API requests
  global: {
    headers: {
      'x-application-name': 'db-coach',
    },
  },
});

// Enhanced auth error handling utility
export const handleAuthError = async (error: any): Promise<boolean> => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  const errorStatus = error.status || error.code;
  
  // Handle refresh token errors - be more comprehensive
  if (errorMessage.includes('refresh_token_not_found') ||
      errorMessage.includes('Invalid Refresh Token') ||
      errorMessage.includes('refresh_token_expired') ||
      errorMessage.includes('JWT expired') ||
      errorMessage.includes('Authentication required') ||
      errorStatus === 400) {
    
    console.log('Handling auth error:', errorMessage, 'Status:', errorStatus);
    
    try {
      // Clear session immediately
      await supabase.auth.signOut();
      
      // Clear all auth-related storage
      const authKeys = ['supabase.auth.token', 'rememberMe', 'lastAuthError'];
      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Could not remove localStorage key:', key);
        }
      });
      
      // Clear any Supabase-related localStorage items
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Could not clear supabase localStorage items');
      }
      
      // Clear sessionStorage as well
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('supabase.')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Could not clear supabase sessionStorage items');
      }
      
      console.log('Auth session cleared successfully');
      
      // Don't redirect immediately - let the auth context handle it
      return true; // Handled
      
    } catch (clearError) {
      console.error('Error during session clearing:', clearError);
      
      // Fallback: manual cleanup
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Force reload only as last resort
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (fallbackError) {
        console.error('Fallback cleanup failed:', fallbackError);
      }
    }
  }
  
  return false; // Not handled
};

// Auth event listener for debugging and error handling
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, session?.user?.email);
  });
}

// Global error handler for unhandled auth errors
window.addEventListener('unhandledrejection', async (event) => {
  const error = event.reason;
  if (error && typeof error === 'object') {
    const isAuthError = error.message?.includes('refresh_token') ||
                       error.message?.includes('Invalid Refresh Token') ||
                       error.message?.includes('JWT expired') ||
                       error.status === 400;
    
    if (isAuthError) {
      console.log('Caught unhandled auth error:', error);
      const handled = await handleAuthError(error);
      if (handled) {
        event.preventDefault(); // Prevent the error from being logged to console
      }
    }
  }
});

// Global error handler for Supabase requests
const originalRequest = supabase.auth.getUser;
supabase.auth.getUser = async function(...args) {
  try {
    return await originalRequest.apply(this, args);
  } catch (error) {
    const handled = await handleAuthError(error);
    if (!handled) {
      throw error;
    }
    // Return null user if error was handled
    return { data: { user: null }, error: null };
  }
};