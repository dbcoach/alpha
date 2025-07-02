import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Home, Settings, ArrowLeft, Zap } from 'lucide-react';
import { EnhancedStreamingInterface } from './EnhancedStreamingInterface';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../auth/ProtectedRoute';
import { databaseProjectsService } from '../../services/databaseProjectsService';

export function StreamingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get parameters from URL
  const prompt = searchParams.get('prompt') || '';
  const dbType = searchParams.get('dbType') || 'PostgreSQL';
  const mode = searchParams.get('mode') || 'dbcoach';

  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no prompt provided
  useEffect(() => {
    if (!prompt) {
      navigate('/', { replace: true });
    }
  }, [prompt, navigate]);

  // Handle generation completion - now handles conversation ID from enhanced interface
  const handleStreamingComplete = async (conversationId: string) => {
    try {
      setIsCompleted(true);
      
      // Redirect to conversations after short delay to show the saved conversation
      setTimeout(() => {
        navigate('/conversations', { replace: true });
      }, 3000);
      
    } catch (error) {
      console.error('Failed to handle completion:', error);
      setError('Failed to complete generation process.');
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleBackToLanding = () => {
    navigate('/', { replace: true });
  };

  // Generate intelligent project title
  function generateProjectTitle(prompt: string, dbType: string): string {
    const promptLower = prompt.toLowerCase();
    
    const domainPatterns = {
      'E-Commerce Platform': ['shop', 'store', 'product', 'cart', 'order', 'payment', 'inventory'],
      'Blog Management System': ['blog', 'post', 'article', 'author', 'comment', 'category'],
      'Social Network Platform': ['social', 'user', 'post', 'comment', 'like', 'follow', 'feed'],
      'Customer Management System': ['customer', 'lead', 'contact', 'sales', 'deal', 'client'],
      'Education Platform': ['student', 'course', 'lesson', 'grade', 'assignment', 'teacher'],
      'Healthcare System': ['patient', 'doctor', 'appointment', 'medical', 'health', 'treatment'],
      'Financial System': ['transaction', 'account', 'balance', 'payment', 'bank', 'finance']
    };
    
    for (const [title, keywords] of Object.entries(domainPatterns)) {
      if (keywords.some(keyword => promptLower.includes(keyword))) {
        return `${title} (${dbType})`;
      }
    }
    
    const firstWords = prompt.split(' ').slice(0, 3).join(' ');
    return `${firstWords} Database (${dbType})`;
  }

  if (!prompt) {
    return null; // Will redirect via useEffect
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
        
        <div className="relative z-10 h-screen flex flex-col">
          {/* Navigation Header */}
          <nav className="p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl" aria-label="Main navigation">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              {/* Left side - Navigation */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToLanding}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50"
                  aria-label="Go back to home page"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-medium">Back</span>
                </button>
                
                <Link 
                  to="/" 
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50"
                  aria-label="Go to home page"
                >
                  <Home className="w-4 h-4" />
                  <span className="font-medium">Home</span>
                </Link>
                
                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-slate-400">
                  <span>/</span>
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 font-medium">Live Generation</span>
                </div>
              </div>
              
              {/* Right side - Settings and project links */}
              <div className="flex items-center space-x-3">
                <Link 
                  to="/projects" 
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50"
                  aria-label="Go to projects page"
                >
                  <span className="font-medium">Projects</span>
                </Link>
                
                <Link 
                  to="/settings" 
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50"
                  aria-label="Go to settings page"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-medium hidden sm:inline">Settings</span>
                </Link>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-hidden">
            {error && (
              <div className="mb-4 p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-red-200 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Error:</span>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            {isCompleted && (
              <div className="mb-4 p-4 bg-green-900/50 border border-green-700/50 rounded-lg text-green-200 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <span className="font-semibold">Generation Complete!</span>
                  <span>Your database conversation has been saved. Redirecting to conversations...</span>
                </div>
              </div>
            )}

            <div className="max-w-7xl mx-auto h-full">
              <EnhancedStreamingInterface
                prompt={prompt}
                dbType={dbType}
                mode={mode}
                onComplete={handleStreamingComplete}
                onError={handleError}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default StreamingPage;