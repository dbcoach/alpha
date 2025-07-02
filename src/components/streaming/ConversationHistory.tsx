import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare,
  Database,
  Clock,
  Search,
  Trash2,
  MoreVertical,
  Calendar,
  Zap,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { conversationStorage, SavedConversation } from '../../services/conversationStorage';
import { useAuth } from '../../contexts/AuthContext';

interface ConversationHistoryProps {
  onSelectConversation: (sessionId: string) => void;
  selectedSessionId?: string;
}

export function ConversationHistory({ 
  onSelectConversation, 
  selectedSessionId 
}: ConversationHistoryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Auto-refresh conversations every 30 seconds to pick up new sessions
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      console.log('Auto-refreshing conversations...');
      loadConversations();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      // Temporarily load all conversations (no user filtering) for debugging
      const sessions = await conversationStorage.loadConversations();
      console.log('Loaded conversations:', sessions.length, sessions);
      setConversations(sessions);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (sessionId: string) => {
    try {
      await conversationStorage.deleteConversation(sessionId);
      setShowDeleteModal(null);
      // Refresh list after delete
      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'streaming':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const truncatePrompt = (prompt: string, maxLength: number = 60) => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + '...';
  };


  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Database Generations</h2>
          <button
            onClick={loadConversations}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh conversations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                {conversations.length === 0 ? 'No conversations yet' : 'No matches found'}
              </h3>
              <p className="text-slate-500 text-sm">
                {conversations.length === 0 
                  ? 'Start your first database generation to see it here'
                  : 'Try adjusting your search terms'
                }
              </p>
            </div>
          </div>
        ) : (
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
                      {getStatusIcon(conversation.status)}
                    </div>
                    
                    {/* Prompt Preview */}
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                      {truncatePrompt(conversation.prompt)}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(conversation.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        <span>{conversation.dbType}</span>
                      </div>
                      {conversation.status === 'completed' && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>Generated</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(conversation.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Conversation</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-300 mb-2">
                Are you sure you want to delete this database generation?
              </p>
              <p className="text-sm text-slate-400">
                All streaming data, canvas content, and generation history will be permanently removed.
              </p>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConversation(showDeleteModal)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}