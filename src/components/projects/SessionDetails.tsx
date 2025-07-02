import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseProject, DatabaseSession, DatabaseQuery, databaseProjectsService } from '../../services/databaseProjectsService';
import { AddQueryModal } from './AddQueryModal';
import { StreamingResultsViewer } from '../streaming/StreamingResultsViewer';
import { 
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Code,
  BarChart3,
  Database,
  Activity,
  Copy,
  Eye,
  Download,
  Home,
  Settings,
  Zap,
  MessageSquare
} from 'lucide-react';

interface SessionDetailsProps {
  session: DatabaseSession;
  project: DatabaseProject;
  onBack: () => void;
}

export function SessionDetails({ session, project, onBack }: SessionDetailsProps) {
  const [queries, setQueries] = useState<DatabaseQuery[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<DatabaseQuery | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'standard' | 'streaming'>('standard');

  useEffect(() => {
    loadQueries();
  }, [session.id]);

  useEffect(() => {
    // Auto-detect if this is a streaming session
    const hasStreamingResults = queries.some(query => 
      query.results_data && 
      typeof query.results_data === 'object' && 
      (query.results_data.taskId || query.results_data.content)
    );
    
    if (hasStreamingResults && viewMode === 'standard') {
      setViewMode('streaming');
    }
  }, [queries]);

  const loadQueries = async () => {
    try {
      setLoading(true);
      const data = await databaseProjectsService.getSessionQueries(session.id);
      setQueries(data);
    } catch (error) {
      console.error('Error loading queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryAdded = () => {
    setShowAddModal(false);
    loadQueries();
  };

  const handleCopyQuery = async (queryText: string) => {
    try {
      await navigator.clipboard.writeText(queryText);
    } catch (error) {
      console.error('Error copying query:', error);
    }
  };

  const handleCopyResults = async (query: DatabaseQuery) => {
    try {
      const text = query.results_format === 'json' 
        ? JSON.stringify(query.results_data, null, 2)
        : JSON.stringify(query.results_data);
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Error copying results:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getQueryTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'SELECT': 'bg-blue-600/20 text-blue-300 border-blue-600/30',
      'INSERT': 'bg-green-600/20 text-green-300 border-green-600/30',
      'UPDATE': 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
      'DELETE': 'bg-red-600/20 text-red-300 border-red-600/30',
      'CREATE': 'bg-purple-600/20 text-purple-300 border-purple-600/30',
      'ALTER': 'bg-orange-600/20 text-orange-300 border-orange-600/30',
      'OTHER': 'bg-slate-600/20 text-slate-300 border-slate-600/30',
    };
    return colors[type] || 'bg-slate-600/20 text-slate-300 border-slate-600/30';
  };

  const renderResults = (query: DatabaseQuery) => {
    if (!query.results_data) {
      return <div className="text-slate-500 italic">No results data</div>;
    }

    if (query.results_format === 'json') {
      // Try to render as table if it's an array of objects
      if (Array.isArray(query.results_data) && query.results_data.length > 0 && typeof query.results_data[0] === 'object') {
        const keys = Object.keys(query.results_data[0]);
        return (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {keys.map(key => (
                    <th key={key} className="text-left py-2 px-3 text-slate-300 font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.results_data.slice(0, 10).map((row: any, index: number) => (
                  <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/30">
                    {keys.map(key => (
                      <td key={key} className="py-2 px-3 text-slate-400">
                        {typeof row[key] === 'object' 
                          ? JSON.stringify(row[key]) 
                          : String(row[key] || '')
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {query.results_data.length > 10 && (
              <p className="text-slate-500 text-center py-3 text-sm">
                Showing first 10 of {query.results_data.length} rows
              </p>
            )}
          </div>
        );
      }
    }

    // Fallback to JSON view
    return (
      <pre className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-lg overflow-auto max-h-64 font-mono">
        {typeof query.results_data === 'string' 
          ? query.results_data 
          : JSON.stringify(query.results_data, null, 2)
        }
      </pre>
    );
  };

  const isStreamingSession = queries.some(query => 
    query.results_data && 
    typeof query.results_data === 'object' && 
    (query.results_data.taskId || query.results_data.content)
  );

  const handleStartNewChat = () => {
    // Navigate to streaming interface with context
    const searchParams = new URLSearchParams({
      prompt: project.description || '',
      dbType: project.database_type,
      mode: 'continue',
      projectId: project.id,
      sessionId: session.id
    });
    window.location.href = `/streaming?${searchParams.toString()}`;
  };

  const handleExport = (format: 'json' | 'csv' | 'pdf') => {
    const data = {
      project: project.database_name,
      session: session.session_name,
      timestamp: session.created_at,
      queries: queries.map(q => ({
        id: q.id,
        query_text: q.query_text,
        query_type: q.query_type,
        results_data: q.results_data,
        created_at: q.created_at,
        success: q.success
      }))
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.database_name}-${session.session_name || 'session'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // If this is a streaming session and we're in streaming view mode, show StreamingResultsViewer
  if (isStreamingSession && viewMode === 'streaming') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
        
        <div className="relative z-10 container max-w-7xl mx-auto py-10 px-4 md:px-8">
          {/* Navigation Header */}
          <nav className="mb-6 p-4 rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl">
            <div className="flex items-center justify-between">
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
                  <Link to="/projects" className="text-slate-400 hover:text-purple-300 transition-colors">
                    Projects
                  </Link>
                  <span>/</span>
                  <span className="text-slate-400 hover:text-purple-300 transition-colors cursor-pointer" onClick={onBack}>
                    {project.database_name}
                  </span>
                  <span>/</span>
                  <span className="text-purple-300 font-medium">{session.session_name || 'Session'}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('standard')}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200"
                >
                  <Code className="w-4 h-4" />
                  <span className="font-medium">Standard View</span>
                </button>
                
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

          <StreamingResultsViewer
            project={project}
            session={session}
            queries={queries}
            onStartNewChat={handleStartNewChat}
            onExport={handleExport}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
      
      <div className="relative z-10 container max-w-7xl mx-auto py-10 px-4 md:px-8">
        {/* Navigation Header */}
        <nav className="mb-6 p-4 rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl" aria-label="Main navigation">
          <div className="flex items-center justify-between">
            {/* Left side - Navigation links and breadcrumb */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                aria-label="Go to home page"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">Home</span>
              </Link>
              
              {/* Breadcrumb */}
              <div className="flex items-center space-x-2 text-slate-400">
                <span>/</span>
                <Link 
                  to="/projects" 
                  className="text-slate-400 hover:text-purple-300 transition-colors focus:outline-none focus:text-purple-300"
                >
                  Projects
                </Link>
                <span>/</span>
                <span className="text-slate-400 hover:text-purple-300 transition-colors cursor-pointer" onClick={onBack}>
                  {project.database_name}
                </span>
                <span>/</span>
                <span className="text-purple-300 font-medium">{session.session_name || 'Session'}</span>
              </div>
            </div>
            
            {/* Right side - Settings link */}
            <Link 
              to="/settings" 
              className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              aria-label="Go to settings page"
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium hidden sm:inline">Settings</span>
            </Link>
          </div>
        </nav>

        {/* Header */}
        <div className="mb-8 p-6 rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-400 hover:text-white" />
                </button>
                <div className="flex items-center space-x-3">
                  <Activity className="h-6 w-6 text-green-400" />
                  <span className="text-sm text-slate-400">
                    {project.database_name} • {project.database_type}
                  </span>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2">
                {session.session_name || `Session ${formatDate(session.created_at)}`}
              </h1>
              
              {session.description && (
                <p className="text-slate-300 mb-4">
                  {session.description}
                </p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Started {formatDate(session.created_at)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>{queries.length} queries</span>
                </div>
                {queries.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>{queries.filter(q => q.success).length} successful</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6 p-4 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-white">Query History</h2>
              {isStreamingSession && (
                <button
                  onClick={() => setViewMode('streaming')}
                  className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 text-purple-300 border border-purple-500/30 rounded-lg transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  <span>Streaming View</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isStreamingSession && (
                <button
                  onClick={handleStartNewChat}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Continue Chat</span>
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Query</span>
              </button>
            </div>
          </div>
        </div>

        {/* Queries List */}
        <div className="space-y-6">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 animate-pulse"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-slate-700 rounded w-20"></div>
                    <div className="h-4 bg-slate-700 rounded w-32"></div>
                  </div>
                  <div className="h-20 bg-slate-700 rounded"></div>
                  <div className="h-32 bg-slate-700 rounded"></div>
                </div>
              </div>
            ))
          ) : queries.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50">
              <Code className="h-16 w-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No queries yet</h3>
              <p className="text-slate-500 mb-6">
                Add your first query to start tracking your database work.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Query</span>
              </button>
            </div>
          ) : (
            queries.map((query, index) => (
              <div
                key={query.id}
                className="p-6 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl"
              >
                {/* Query Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-slate-500">#{index + 1}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getQueryTypeColor(query.query_type)}`}>
                      {query.query_type}
                    </span>
                    {query.success ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(query.created_at)}</span>
                    </div>
                    {query.execution_time_ms && (
                      <span>{query.execution_time_ms}ms</span>
                    )}
                    {query.row_count !== undefined && (
                      <span>{query.row_count} rows</span>
                    )}
                  </div>
                </div>

                {/* Query Text */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-300">Query</h4>
                    <button
                      onClick={() => handleCopyQuery(query.query_text)}
                      className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-lg overflow-auto font-mono">
                    {query.query_text}
                  </pre>
                </div>

                {/* Error Message */}
                {!query.success && query.error_message && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-red-300 mb-2">Error</h4>
                    <div className="text-sm text-red-300 bg-red-900/20 p-4 rounded-lg border border-red-700/30">
                      {query.error_message}
                    </div>
                  </div>
                )}

                {/* Results */}
                {query.success && query.results_data && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-300">Results</h4>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCopyResults(query)}
                          className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700/50">
                      {renderResults(query)}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Query Modal */}
        {showAddModal && (
          <AddQueryModal
            session={session}
            project={project}
            onClose={() => setShowAddModal(false)}
            onQueryAdded={handleQueryAdded}
          />
        )}
      </div>
    </div>
  );
}