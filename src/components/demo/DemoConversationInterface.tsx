import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  Plus,
  MessageSquare,
  Database,
  ArrowLeft,
  Play
} from 'lucide-react';
import { ConversationHistory } from '../streaming/ConversationHistory';
import { EnhancedStreamingInterface } from '../streaming/EnhancedStreamingInterface';
import { StreamingErrorBoundary } from '../streaming/StreamingErrorBoundary';
import { useDemo } from '../../contexts/DemoContext';
import { SavedConversation } from '../../services/conversationStorage';
import { BoltNewBadge } from '../ui/BoltNewBadge';

export function DemoConversationInterface() {
  const navigate = useNavigate();
  const { isDemoMode, demoConversations, demoUser } = useDemo();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<SavedConversation | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-select first conversation on load
  useEffect(() => {
    if (demoConversations.length > 0 && !selectedSessionId) {
      const firstConversation = demoConversations[0];
      setSelectedSessionId(firstConversation.id);
      setSelectedConversation(firstConversation);
    }
  }, [demoConversations, selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId) {
      loadConversationData(selectedSessionId);
    } else {
      setSelectedConversation(null);
    }
  }, [selectedSessionId]);

  const loadConversationData = async (sessionId: string) => {
    try {
      setLoading(true);
      const conversation = demoConversations.find(conv => conv.id === sessionId);
      setSelectedConversation(conversation || null);
    } catch (error) {
      console.error('❌ Error loading demo conversation:', error);
      setSelectedConversation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  if (!isDemoMode) {
    navigate('/demo');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
      
      <div className="relative z-10 h-screen flex flex-col">
        {/* Navigation Header */}
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
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium">Conversation History Demo</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30">
                🎯 Demo Mode
              </div>
              
              <button
                onClick={() => navigate('/demo/live-generation')}
                className="flex items-center space-x-1 px-3 py-1 text-slate-400 hover:text-white transition-colors"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm">Try Live Demo</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Demo Banner */}
        <div className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">📚 Conversation History Demo</h2>
              <p className="text-purple-200 text-sm">Browse saved database generations with full context and search</p>
            </div>
            <div className="text-right">
              <p className="text-purple-200 text-sm">Demo User: {demoUser.name}</p>
              <p className="text-purple-300 text-xs">{demoConversations.length} saved conversations</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation History Sidebar */}
          <div className="w-80 border-r border-slate-700/50 bg-slate-800/20 flex flex-col">
            <DemoConversationHistory 
              conversations={demoConversations}
              onSelectConversation={handleSelectConversation}
              selectedSessionId={selectedSessionId}
            />
          </div>

          {/* Streaming Interface Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <div className="h-full flex flex-col">
                {/* Conversation Header */}
                <div className="px-6 py-3 border-b border-slate-700/50 bg-slate-800/20">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-1 truncate">
                      {selectedConversation.prompt}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span className="px-2 py-1 bg-slate-700/50 rounded text-xs">{selectedConversation.dbType}</span>
                      <span>{new Date(selectedConversation.createdAt).toLocaleDateString()}</span>
                      <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded text-xs">✓ Demo Data</span>
                    </div>
                  </div>
                </div>
                
                {/* Streaming Interface */}
                <div className="flex-1 overflow-hidden">
                  <StreamingErrorBoundary>
                    <div className="h-full">
                      <EnhancedStreamingInterface
                        prompt={selectedConversation.prompt}
                        dbType={selectedConversation.dbType}
                        onComplete={() => {}}
                        onError={(error) => {
                          console.error('❌ Demo EnhancedStreamingInterface error:', error);
                        }}
                        className="h-full"
                        isViewingMode={true}
                        existingConversation={selectedConversation}
                      />
                    </div>
                  </StreamingErrorBoundary>
                </div>
              </div>
            ) : loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading demo conversation...</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <MessageSquare className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">
                    Demo Conversation History
                  </h3>
                  <p className="text-slate-500 mb-6">
                    Select a conversation from the sidebar to view its streaming interface and results, or explore the live generation demo.
                  </p>
                  <button
                    onClick={() => navigate('/demo/live-generation')}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors mx-auto"
                  >
                    <Play className="w-4 h-4" />
                    Try Live Generation Demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bolt.new Badge */}
      <BoltNewBadge />
    </div>
  );
}

// Demo-specific conversation history component
function DemoConversationHistory({ 
  conversations, 
  onSelectConversation, 
  selectedSessionId 
}: {
  conversations: SavedConversation[];
  onSelectConversation: (sessionId: string) => void;
  selectedSessionId?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.dbType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Demo Database Generations</h2>
          <div className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">
            {conversations.length} saved
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search demo conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`group p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedSessionId === conversation.id
                  ? 'bg-purple-600/20 border border-purple-500/50'
                  : 'bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Title and Status */}
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <h3 className="font-medium text-white text-sm truncate">
                      {conversation.title}
                    </h3>
                    <div className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">Demo</div>
                  </div>
                  
                  {/* Prompt Preview */}
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                    {conversation.prompt.length > 60 ? conversation.prompt.substring(0, 60) + '...' : conversation.prompt}
                  </p>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <span>{formatDate(conversation.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      <span>{conversation.dbType}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{conversation.tasks.length} tasks</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Selection Indicator */}
              {selectedSessionId === conversation.id && (
                <div className="mt-3 pt-3 border-t border-purple-500/30">
                  <div className="flex items-center gap-2 text-xs text-purple-300">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                    <span>Currently viewing</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}