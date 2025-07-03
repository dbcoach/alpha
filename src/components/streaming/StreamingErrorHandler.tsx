// Comprehensive Streaming Error Handler and Recovery System
import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Settings, CheckCircle, XCircle } from 'lucide-react';

interface StreamingError {
  type: 'api_key' | 'network' | 'timeout' | 'rate_limit' | 'service' | 'unknown';
  message: string;
  details?: string;
  recoverable: boolean;
  timestamp: Date;
}

interface StreamingErrorHandlerProps {
  error?: Error;
  onRetry: () => void;
  onFallbackMode: () => void;
  className?: string;
}

export const StreamingErrorHandler: React.FC<StreamingErrorHandlerProps> = ({
  error,
  onRetry,
  onFallbackMode,
  className = ''
}) => {
  const [diagnostics, setDiagnostics] = useState<{
    apiKey: boolean;
    network: boolean;
    service: boolean;
  }>({
    apiKey: false,
    network: false,
    service: false
  });
  
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  const classifyError = (error?: Error): StreamingError => {
    if (!error) {
      return {
        type: 'unknown',
        message: 'Unknown streaming error occurred',
        recoverable: true,
        timestamp: new Date()
      };
    }

    const message = error.message.toLowerCase();
    
    if (message.includes('api key') || message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        type: 'api_key',
        message: 'API Key Issue',
        details: 'Invalid or missing Gemini API key. Please check your API key configuration.',
        recoverable: false,
        timestamp: new Date()
      };
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'network',
        message: 'Network Connection Error',
        details: 'Unable to connect to AI services. Please check your internet connection.',
        recoverable: true,
        timestamp: new Date()
      };
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'timeout',
        message: 'Request Timeout',
        details: 'AI generation took too long. The service might be under heavy load.',
        recoverable: true,
        timestamp: new Date()
      };
    }
    
    if (message.includes('rate limit') || message.includes('quota')) {
      return {
        type: 'rate_limit',
        message: 'Rate Limit Exceeded',
        details: 'Too many requests in a short time. Please wait a moment before trying again.',
        recoverable: true,
        timestamp: new Date()
      };
    }
    
    if (message.includes('service') || message.includes('server')) {
      return {
        type: 'service',
        message: 'Service Unavailable',
        details: 'AI service is temporarily unavailable. Please try again later.',
        recoverable: true,
        timestamp: new Date()
      };
    }

    return {
      type: 'unknown',
      message: 'Unexpected Error',
      details: error.message,
      recoverable: true,
      timestamp: new Date()
    };
  };

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    
    try {
      // Check API Key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const hasApiKey = Boolean(apiKey && apiKey.length > 0);
      
      // Check Network (simple connectivity test)
      let networkOk = false;
      try {
        const response = await fetch('https://httpbin.org/get', { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        networkOk = response.ok;
      } catch {
        networkOk = false;
      }
      
      // Check Service (basic Google AI service check)
      let serviceOk = false;
      if (hasApiKey) {
        try {
          // This is a minimal check - just verify the API key format
          serviceOk = apiKey.startsWith('AIza') && apiKey.length > 30;
        } catch {
          serviceOk = false;
        }
      }
      
      setDiagnostics({
        apiKey: hasApiKey,
        network: networkOk,
        service: serviceOk
      });
      
    } catch (diagnosticError) {
      console.error('Diagnostic check failed:', diagnosticError);
      setDiagnostics({
        apiKey: false,
        network: false,
        service: false
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  useEffect(() => {
    if (error) {
      runDiagnostics();
    }
  }, [error]);

  const streamingError = classifyError(error);
  
  const getErrorIcon = () => {
    switch (streamingError.type) {
      case 'api_key':
        return <Settings className="w-8 h-8 text-yellow-400" />;
      case 'network':
        return <RefreshCw className="w-8 h-8 text-blue-400" />;
      case 'timeout':
      case 'rate_limit':
        return <AlertTriangle className="w-8 h-8 text-orange-400" />;
      case 'service':
        return <XCircle className="w-8 h-8 text-red-400" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-400" />;
    }
  };

  const getRecoveryActions = () => {
    const actions = [];
    
    if (streamingError.recoverable) {
      actions.push(
        <button
          key="retry"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      );
    }
    
    actions.push(
      <button
        key="fallback"
        onClick={onFallbackMode}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
      >
        <CheckCircle className="w-4 h-4" />
        Use Fallback Mode
      </button>
    );
    
    return actions;
  };

  if (!error) return null;

  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 ${className}`}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          {getErrorIcon()}
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">
          {streamingError.message}
        </h3>
        
        {streamingError.details && (
          <p className="text-slate-400 text-sm mb-4">
            {streamingError.details}
          </p>
        )}

        {/* Diagnostics Section */}
        <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">System Diagnostics</span>
            {isRunningDiagnostics && (
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              {diagnostics.apiKey ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className="text-slate-400">API Key</span>
            </div>
            
            <div className="flex items-center gap-2">
              {diagnostics.network ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className="text-slate-400">Network</span>
            </div>
            
            <div className="flex items-center gap-2">
              {diagnostics.service ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className="text-slate-400">Service</span>
            </div>
          </div>
        </div>

        {/* Recovery Actions */}
        <div className="flex flex-col gap-3">
          {getRecoveryActions()}
        </div>

        {/* Error-Specific Help */}
        {streamingError.type === 'api_key' && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-left">
            <h4 className="text-yellow-300 font-medium text-sm mb-2">API Key Setup Help</h4>
            <div className="text-yellow-200 text-xs space-y-1">
              <p>1. Get your API key from Google AI Studio</p>
              <p>2. Add it to your .env file as VITE_GEMINI_API_KEY</p>
              <p>3. Restart the development server</p>
            </div>
          </div>
        )}

        {streamingError.type === 'rate_limit' && (
          <div className="mt-4 p-3 bg-orange-900/20 border border-orange-700/30 rounded-lg text-left">
            <h4 className="text-orange-300 font-medium text-sm mb-2">Rate Limit Info</h4>
            <p className="text-orange-200 text-xs">
              Please wait 60 seconds before trying again. Consider upgrading your API plan for higher limits.
            </p>
          </div>
        )}

        <div className="text-xs text-slate-500 mt-4">
          Error occurred at {streamingError.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default StreamingErrorHandler;