import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  MessageSquare, 
  Database,
  Zap,
  Sparkles,
  History
} from 'lucide-react';
import { EnhancedStreamingInterface } from '../streaming/EnhancedStreamingInterface';
import { StreamingErrorBoundary } from '../streaming/StreamingErrorBoundary';
import { useDemo } from '../../contexts/DemoContext';
import { BoltNewBadge } from '../ui/BoltNewBadge';

const SAMPLE_PROMPTS = {
  'E-commerce Platform': 'E-commerce platform with products, orders, customers, inventory management, shopping cart, and payment processing',
  'Social Media App': 'Social media platform with users, posts, comments, likes, followers, notifications, and real-time messaging',
  'Healthcare System': 'Healthcare management system with patients, doctors, appointments, medical records, prescriptions, and HIPAA compliance'
};

export function DemoLiveGeneration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDemoMode, addDemoConversation, demoUser } = useDemo();
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedDbType, setSelectedDbType] = useState('PostgreSQL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInterface, setShowInterface] = useState(false);

  // Check if a project was pre-selected from URL
  useEffect(() => {
    const project = searchParams.get('project');
    if (project && SAMPLE_PROMPTS[project as keyof typeof SAMPLE_PROMPTS]) {
      setSelectedPrompt(SAMPLE_PROMPTS[project as keyof typeof SAMPLE_PROMPTS]);
    }
  }, [searchParams]);

  if (!isDemoMode) {
    navigate('/demo');
    return null;
  }

  const handleStartGeneration = () => {
    if (!selectedPrompt.trim()) return;
    
    setIsGenerating(true);
    setShowInterface(true);
  };

  const handleComplete = (conversationId: string) => {
    // In demo mode, we could add the conversation to demo storage
    console.log('Demo generation completed:', conversationId);
  };

  if (showInterface) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
        
        <div className="relative z-10 h-screen flex flex-col">
          {/* Header */}
          <nav className="px-6 py-3 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowInterface(false)}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-medium">Back to Setup</span>
                </button>
                <span className="text-slate-600">/</span>
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-medium">Live Generation Demo</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30">
                  🎯 Demo Mode
                </div>
                
                <button
                  onClick={() => navigate('/demo/conversations')}
                  className="flex items-center space-x-1 px-3 py-1 text-slate-400 hover:text-white transition-colors"
                >
                  <History className="w-4 h-4" />
                  <span className="text-sm">View History</span>
                </button>
              </div>
            </div>
          </nav>

          {/* Demo Banner */}
          <div className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">🎬 Live Generation Demo</h2>
                <p className="text-purple-200 text-sm">Watch AI agents collaborate in real-time to design your database</p>
              </div>
              <div className="text-right">
                <p className="text-purple-200 text-sm">Database: {selectedDbType}</p>
                <p className="text-purple-300 text-xs">Interactive experience</p>
              </div>
            </div>
          </div>

          {/* Streaming Interface */}
          <div className="flex-1 overflow-hidden">
            <StreamingErrorBoundary>
              <EnhancedStreamingInterface
                prompt={selectedPrompt}
                dbType={selectedDbType}
                onComplete={handleComplete}
                onError={(error) => {
                  console.error('❌ Demo streaming error:', error);
                }}
                className="h-full"
                mode="dbcoach"
                isViewingMode={false}
              />
            </StreamingErrorBoundary>
          </div>
        </div>
        
        {/* Bolt.new Badge */}
        <BoltNewBadge />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <nav className="px-6 py-3 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/demo')}
                className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Back to Demo</span>
              </button>
              <span className="text-slate-600">/</span>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium">Live Generation Demo</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30">
                🎯 Demo Mode
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600/20 text-purple-300 rounded-full border border-purple-500/30 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Interactive Live Generation Demo</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Watch AI Agents
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"> Collaborate </span>
              in Real-Time
            </h1>
            
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Experience the future of database design. See AI agents think, collaborate, and build enterprise-grade schemas while you watch and interact.
            </p>
          </div>

          {/* Database Type Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Choose Database Type
            </label>
            <div className="grid grid-cols-3 gap-4">
              {['PostgreSQL', 'MySQL', 'MongoDB'].map((dbType) => (
                <button
                  key={dbType}
                  onClick={() => setSelectedDbType(dbType)}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    selectedDbType === dbType
                      ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                      : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600/50 hover:text-slate-300'
                  }`}
                >
                  <Database className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-medium">{dbType}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Choose Your Database Project
            </label>
            <div className="space-y-3">
              {Object.entries(SAMPLE_PROMPTS).map(([title, prompt]) => (
                <button
                  key={title}
                  onClick={() => setSelectedPrompt(prompt)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedPrompt === prompt
                      ? 'bg-purple-600/20 border-purple-500/50'
                      : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  <h3 className="font-semibold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm">{prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Or Describe Your Own Database
            </label>
            <textarea
              value={selectedPrompt}
              onChange={(e) => setSelectedPrompt(e.target.value)}
              placeholder="Describe your database needs in natural language..."
              className="w-full h-32 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
            />
          </div>

          {/* Start Generation Button */}
          <div className="text-center">
            <button
              onClick={handleStartGeneration}
              disabled={!selectedPrompt.trim()}
              className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mx-auto"
            >
              <Play className="w-5 h-5" />
              <span>Start Live Generation Demo</span>
              <Sparkles className="w-5 h-5" />
            </button>
            
            <p className="text-slate-500 text-sm mt-4">
              Watch AI agents collaborate in real-time • Chat with intelligent assistants • No signup required
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Watch AI Think</h3>
              <p className="text-slate-400 text-sm">See the reasoning behind every design decision in real-time</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Live Schema Generation</h3>
              <p className="text-slate-400 text-sm">Watch your database schema being built character by character</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Interactive Chat</h3>
              <p className="text-slate-400 text-sm">Ask questions about your database while it's being created</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bolt.new Badge */}
      <BoltNewBadge />
    </div>
  );
}