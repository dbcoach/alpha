import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  Zap, 
  Play, 
  Database, 
  History,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { EnhancedStreamingInterface } from './EnhancedStreamingInterface';
import { SavedStreamingCanvas } from './SavedStreamingCanvas';
import { ChatInterface } from './ChatInterface';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseProject, DatabaseSession, databaseProjectsService } from '../../services/databaseProjectsService';
import { streamingDataCapture, StreamingData } from '../../services/streamingDataCapture';
import ProtectedRoute from '../auth/ProtectedRoute';

type ViewMode = 'new' | 'new-streaming' | 'results' | 'chat';

export function StreamingCanvasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('new');
  const [streamingSessions, setStreamingSessions] = useState<StreamingData[]>([]);
  const [selectedSession, setSelectedSession] = useState<StreamingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New streaming parameters
  const [newPrompt, setNewPrompt] = useState('');
  const [newDbType, setNewDbType] = useState('PostgreSQL');

  useEffect(() => {
    if (user) {
      loadStreamingSessions();
    }
  }, [user]);

  const loadStreamingSessions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await streamingDataCapture.initialize();
      const sessions = await streamingDataCapture.getSavedSessions(user.id);
      
      console.log('Loaded streaming sessions:', sessions);
      setStreamingSessions(sessions);
    } catch (error) {
      console.error('Error loading streaming sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSelect = (session: StreamingData) => {
    setSelectedSession(session);
  };

  const handleStartNewStreaming = () => {
    if (!newPrompt.trim()) return;
    setViewMode('new-streaming'); // Switch to streaming view
  };

  const handleStreamingComplete = (projectId: string) => {
    // Refresh sessions list to show newly created session
    loadStreamingSessions();
    setViewMode('results');
  };

  const handleNewGeneration = (prompt: string) => {
    setNewPrompt(prompt);
    setViewMode('new-streaming');
  };

  const handleExport = (format: 'json' | 'csv' | 'pdf') => {
    // Export functionality would be implemented here
    console.log(`Exporting in ${format} format`);
  };

  const filteredSessions = streamingSessions.filter(session =>
    session.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.database_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
        
        <div className="relative z-10 h-screen flex flex-col">
          {/* Navigation Header */}
          <nav className="p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center space-x-4">
                <Link
                  to="/"
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200"
                >
                  <Home className="w-4 h-4" />
                  <span className="font-medium">Home</span>
                </Link>
                
                <div className="flex items-center space-x-2 text-slate-400">
                  <span>/</span>
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300 font-medium">Streaming Canvas</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Link 
                  to="/projects" 
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200"
                >
                  <span className="font-medium">Projects</span>
                </Link>
                
                <Link 
                  to="/settings" 
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-medium hidden sm:inline">Settings</span>
                </Link>
              </div>
            </div>
          </nav>

          {/* Mode Selection Tabs */}
          <div className="border-b border-slate-700/50 bg-slate-800/20">
            <div className="max-w-7xl mx-auto">
              <div className="flex">
                {[
                  { id: 'new', label: 'New Generation', icon: Play },
                  { id: 'results', label: 'Saved Results', icon: Database },
                  { id: 'chat', label: 'Continue Chat', icon: History }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id as ViewMode)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                      viewMode === tab.id 
                        ? 'text-purple-300 border-purple-500 bg-slate-800/50' 
                        : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'new-streaming' && (
              <div className="h-full p-6">
                <EnhancedStreamingInterface
                  prompt={newPrompt}
                  dbType={newDbType}
                  onComplete={handleStreamingComplete}
                  onError={(error) => console.error('Streaming error:', error)}
                  className="h-full"
                />
              </div>
            )}

            {viewMode === 'new' && (
              <div className="h-full flex items-center justify-center p-6">
                <div className="max-w-2xl w-full">
                  <div className="text-center mb-8">
                    <Zap className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-2">Create New Database</h1>
                    <p className="text-slate-400">Start a new streaming generation session to create your database design</p>
                  </div>

                  <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Database Type
                        </label>
                        <select
                          value={newDbType}
                          onChange={(e) => setNewDbType(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                        >
                          <option value="PostgreSQL">PostgreSQL</option>
                          <option value="MySQL">MySQL</option>
                          <option value="SQLite">SQLite</option>
                          <option value="MongoDB">MongoDB</option>
                          <option value="SQL">SQL Server</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Describe Your Database Project
                        </label>
                        <textarea
                          value={newPrompt}
                          onChange={(e) => setNewPrompt(e.target.value)}
                          placeholder="E.g., Create a social media platform database with users, posts, comments, likes, and friendships..."
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                          rows={4}
                        />
                      </div>

                      <button
                        onClick={handleStartNewStreaming}
                        disabled={!newPrompt.trim()}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        <Play className="w-5 h-5" />
                        Start Live Generation
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'results' && (
              <div className="h-full flex">
                {/* Sidebar */}
                <div className="w-80 border-r border-slate-700/50 bg-slate-800/20 overflow-y-auto">
                  <div className="p-4 border-b border-slate-700/50">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search streaming sessions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {streamingSessions.length} streaming sessions
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      Streaming Sessions
                    </h3>
                    
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-800/30 animate-pulse">
                            <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : filteredSessions.length === 0 ? (
                      <div className="text-center py-8">
                        <Database className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">
                          {streamingSessions.length === 0 
                            ? "No streaming sessions found" 
                            : "No sessions match your search"
                          }
                        </p>
                        {streamingSessions.length === 0 && (
                          <>
                            <p className="text-slate-600 text-xs mt-2">
                              Create streaming sessions by using the live generation feature
                            </p>
                            <button
                              onClick={() => setViewMode('new')}
                              className="mt-2 text-purple-400 hover:text-purple-300 text-sm"
                            >
                              Create your first one
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredSessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => handleSessionSelect(session)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              selectedSession?.id === session.id
                                ? 'bg-purple-600/20 border border-purple-500/30'
                                : 'bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white text-sm truncate">
                                {session.database_type} Session
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                session.status === 'completed' ? 'bg-green-600/20 text-green-300' :
                                session.status === 'error' ? 'bg-red-600/20 text-red-300' :
                                'bg-yellow-600/20 text-yellow-300'
                              }`}>
                                {session.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                              {session.prompt}
                            </p>
                            <div className="flex items-center text-xs text-slate-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDate(session.created_at)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden">
                  {selectedSession ? (
                    <SavedStreamingCanvas
                      sessionId={selectedSession.id}
                      onStartNewChat={(prompt) => handleNewGeneration(prompt)}
                      onExport={handleExport}
                      className="h-full"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Database className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-300 mb-2">Select a Session</h3>
                        <p className="text-slate-500">Choose a streaming session from the sidebar to view its canvas</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'chat' && (
              <div className="h-full p-6">
                {selectedSession ? (
                  <div className="h-full">
                    <div className="mb-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                      <h3 className="text-lg font-semibold text-white mb-2">Continue Conversation</h3>
                      <p className="text-slate-400 text-sm">
                        Database Type: {selectedSession.database_type} | 
                        Status: <span className={`ml-1 ${
                          selectedSession.status === 'completed' ? 'text-green-300' :
                          selectedSession.status === 'error' ? 'text-red-300' :
                          'text-yellow-300'
                        }`}>{selectedSession.status}</span>
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        Original prompt: "{selectedSession.prompt}"
                      </p>
                    </div>
                    
                    <div className="h-full bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <MessageSquare className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white mb-2">Chat Interface</h3>
                          <p className="text-slate-400 mb-4">Continue working on your database design</p>
                          <button
                            onClick={() => handleNewGeneration(selectedSession.prompt)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors"
                          >
                            Start New Generation
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <History className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-300 mb-2">Select a Session</h3>
                      <p className="text-slate-500 mb-4">Choose a session from the Results tab to continue the conversation</p>
                      <button
                        onClick={() => setViewMode('results')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        View Results
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}