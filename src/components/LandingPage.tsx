import React, { useState, useEffect } from 'react';
import { Database, Zap, ArrowRight, Bot, Sparkles, Settings, MessageSquare, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DBCoachMode } from '../context/GenerationContext';
import AuthButton from './auth/AuthButton';
import { useAuth } from '../contexts/AuthContext';
import useGeneration from '../hooks/useGeneration';
import { BoltNewBadge } from './ui/BoltNewBadge';
import { VideoIntroModal } from './VideoIntroModal';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isGenerating } = useGeneration();
  const [prompt, setPrompt] = useState('');
  const [dbType, setDbType] = useState('SQL');
  const [mode, setMode] = useState<DBCoachMode>('dbcoach');
  const [isHovered, setIsHovered] = useState(false);
  const [isBrandHovered, setIsBrandHovered] = useState(false);
  const [showInitialGlow, setShowInitialGlow] = useState(true);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    // Hide the initial glow after animation completes
    const timer = setTimeout(() => {
      setShowInitialGlow(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && user) {
      // Navigate to streaming page with parameters for AI agent generation
      const params = new URLSearchParams({
        prompt: prompt.trim(),
        dbType,
        mode
      });
      navigate(`/streaming?${params.toString()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col p-4 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-30">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div className="w-2 h-2 bg-purple-400 rounded-full opacity-20"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient mesh overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10"></div>

      {/* Header with brand, navigation and auth */}
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onMouseEnter={() => setIsBrandHovered(true)}
          onMouseLeave={() => setIsBrandHovered(false)}
        >
          <div className={`transition-transform duration-300 ease-out ${
            isBrandHovered ? 'rotate-12 scale-110' : ''
          }`}>
            <Database className="w-8 h-8 text-purple-400" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors duration-300">
            DB.Coach
          </span>
        </div>
        
        {/* Navigation Menu */}
        <div className="flex items-center space-x-6">
          {/* Watch Intro Button - NEW */}
          <button 
            onClick={() => setShowVideoModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 hover:text-blue-200 rounded-lg transition-colors backdrop-blur-sm border border-blue-500/30"
          >
            <Play className="w-4 h-4" />
            <span>Watch Intro</span>
          </button>
          
          {/* Demo Button - Always visible */}
          <Link 
            to="/demo" 
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 text-purple-300 hover:text-purple-200 rounded-lg transition-colors backdrop-blur-sm border border-purple-500/30"
          >
            <Sparkles className="w-4 h-4" />
            <span>Live Demo</span>
          </Link>
          
          {user && (
            <>
              <Link 
                to="/conversations" 
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 text-green-300 hover:text-green-200 rounded-lg transition-colors backdrop-blur-sm border border-green-500/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Generations</span>
              </Link>
              <Link 
                to="/settings" 
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-colors backdrop-blur-sm border border-slate-700/50"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </>
          )}
          
          {/* Auth Button */}
          <AuthButton />
        </div>
      </div>

      {/* Main content - centered and filling remaining space */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* Main heading */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight leading-none">
              {user ? 'Generate Your Next Database' : 'What data do you want to store?'}
            </h1>
            <p className="text-lg md:text-xl text-slate-300 font-light opacity-90 max-w-2xl mx-auto">
              {user ? 'Create intelligent database designs with AI assistance' : 'Design Databases at the Speed of Thought'}
            </p>
          </div>

          {/* Input form */}
          <div className="max-w-3xl mx-auto">
            <div className="backdrop-blur-xl bg-slate-800/40 border border-purple-500/20 rounded-2xl p-6 shadow-2xl shadow-purple-500/5">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Main textarea with initial glow animation */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-300">
                      Describe Your Database
                    </label>
                    {/* Elegant Database Type Selector */}
                    <div className="flex items-center space-x-1 bg-slate-700/30 rounded-lg p-1 border border-slate-600/50">
                      {['SQL', 'NoSQL', 'VectorDB'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setDbType(type)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                            dbType === type
                              ? 'bg-purple-500/30 text-purple-300 shadow-sm border border-purple-400/30'
                              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-600/30'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="relative">
                    {/* Flowing light animation wrapper */}
                    <div className={`absolute inset-0 rounded-xl transition-opacity duration-500 ${
                      showInitialGlow ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 via-blue-500 via-green-500 via-yellow-500 via-red-500 to-white-500 animate-flowing-border p-0.5">
                        <div className="w-full h-full bg-slate-700/100 rounded-xl"></div>
                      </div>
                    </div>
                    
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe your database needs... (e.g., 'A blog platform with users, posts, and comments')"
                      className="relative w-full h-32 p-4 bg-slate-700/30 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 resize-none leading-relaxed z-10"
                      required
                    />
                  </div>
                </div>

                {/* DBCoach Mode Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3 text-left">
                    Generation Mode
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setMode('dbcoach')}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        mode === 'dbcoach'
                          ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:bg-slate-700/50 hover:border-slate-500/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Bot className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">DBCoach Pro</div>
                          <div className="text-xs opacity-75">Multi-agent analysis</div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('standard')}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        mode === 'standard'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:bg-slate-700/50 hover:border-slate-500/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Sparkles className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">Standard</div>
                          <div className="text-xs opacity-75">Quick generation</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Generate button */}
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating || !user}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className={`w-full p-4 bg-gradient-to-r ${
                    mode === 'dbcoach' 
                      ? 'from-purple-600 via-blue-600 to-purple-700 hover:from-purple-500 hover:via-blue-500 hover:to-purple-600' 
                      : 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600'
                  } disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 ${
                    isHovered && prompt.trim() && user && !isGenerating ? 'shadow-lg shadow-purple-500/25 transform scale-[1.02]' : ''
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      {mode === 'dbcoach' ? <Bot className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                      <span>{!user ? 'Sign in to Generate' : mode === 'dbcoach' ? 'Generate with DBCoach Pro' : 'Generate Database Design'}</span>
                      {user && <ArrowRight className="w-5 h-5" />}
                    </>
                  )}
                </button>

              </form>

              {/* Help text */}
              <div className="mt-6 p-4 bg-slate-700/20 rounded-xl border border-slate-600/30">
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-purple-500/20 rounded-lg">
                    {mode === 'dbcoach' ? <Bot className="w-4 h-4 text-purple-400" /> : <Zap className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed">
                    {mode === 'dbcoach' ? (
                      <>
                        <p className="font-medium mb-1">🤖 DBCoach Pro Features:</p>
                        <p>Multi-agent analysis • Enterprise validation • Performance optimization • Security audit • Production-ready implementation packages</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium mb-1">💡 Standard Features:</p>
                        <p>Be specific about your use case. Mention entities, relationships, and any special requirements for the best results.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Demo CTA - Only show when not signed in */}
              {!user && (
                <div className="mt-6 p-6 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 rounded-xl border border-purple-500/30">
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm font-medium mb-4">
                      <Sparkles className="w-4 h-4" />
                      <span>Try Before You Sign Up</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Experience the Vibe DB Revolution</h3>
                    <p className="text-slate-300 mb-4">
                      Watch AI agents collaborate in real-time • Chat with intelligent assistants • No signup required
                    </p>
                    <Link
                      to="/demo"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Launch Interactive Demo</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-12"></div>

      {/* Bolt.new Badge */}
      <BoltNewBadge />

      {/* Video Introduction Modal */}
      <VideoIntroModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
      />

      {/* Custom CSS for flowing border animation */}
      <style jsx>{`
        @keyframes flowing-border {
          0% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
          100% {
            background-position: 0% 0%;
          }
        }
        
        .animate-flowing-border {
          background-size: 400% 400%;
          animation: flowing-border 3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;