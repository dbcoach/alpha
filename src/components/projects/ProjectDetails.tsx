import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseProject, DatabaseSession, databaseProjectsService } from '../../services/databaseProjectsService';
import { SessionDetails } from './SessionDetails';
import { CreateSessionModal } from './CreateSessionModal';
import { StreamingResultsTab } from '../streaming/StreamingResultsTab';
import { 
  ArrowLeft,
  Plus,
  Calendar,
  Database,
  Activity,
  Trash2,
  Edit,
  Clock,
  Home,
  Settings,
  Zap
} from 'lucide-react';

interface ProjectDetailsProps {
  project: DatabaseProject;
  onBack: () => void;
  onProjectDeleted: () => void;
}

export function ProjectDetails({ project, onBack, onProjectDeleted }: ProjectDetailsProps) {
  const [sessions, setSessions] = useState<DatabaseSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<DatabaseSession | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'streaming'>('sessions');

  useEffect(() => {
    loadSessions();
    
    // Auto-select streaming tab if this project has streaming data
    if (project.metadata?.streaming_session_id) {
      setActiveTab('streaming');
    }
  }, [project.id]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await databaseProjectsService.getProjectSessions(project.id);
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionCreated = () => {
    setShowCreateModal(false);
    loadSessions();
  };

  const handleDeleteProject = async () => {
    try {
      await databaseProjectsService.deleteProject(project.id, project.user_id);
      onProjectDeleted();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDbTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'PostgreSQL': 'bg-blue-600/20 text-blue-300 border-blue-600/30',
      'MySQL': 'bg-orange-600/20 text-orange-300 border-orange-600/30',
      'MongoDB': 'bg-green-600/20 text-green-300 border-green-600/30',
      'SQLite': 'bg-gray-600/20 text-gray-300 border-gray-600/30',
      'SQL': 'bg-purple-600/20 text-purple-300 border-purple-600/30',
      'NoSQL': 'bg-red-600/20 text-red-300 border-red-600/30',
    };
    return colors[type] || 'bg-slate-600/20 text-slate-300 border-slate-600/30';
  };

  // If a session is selected, show its details
  if (selectedSession) {
    return (
      <SessionDetails 
        session={selectedSession}
        project={project}
        onBack={() => setSelectedSession(null)}
      />
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
                <span className="text-purple-300 font-medium">{project.database_name}</span>
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
                  <Database className="h-6 w-6 text-blue-400" />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDbTypeColor(project.database_type)}`}>
                    {project.database_type}
                  </span>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2">
                {project.database_name}
              </h1>
              
              {project.description && (
                <p className="text-slate-300 mb-4">
                  {project.description}
                </p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formatDate(project.created_at)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Last accessed {formatDate(project.last_accessed)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>{sessions.length} sessions</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Delete Project"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'sessions' 
                  ? 'text-purple-300 border-purple-500 bg-slate-800/50' 
                  : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <Activity className="w-4 h-4" />
              Work Sessions
            </button>
            
            {project.metadata?.streaming_session_id && (
              <button
                onClick={() => setActiveTab('streaming')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === 'streaming' 
                    ? 'text-purple-300 border-purple-500 bg-slate-800/50' 
                    : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <Zap className="w-4 h-4" />
                Streaming Results
              </button>
            )}
          </div>
          
          {/* Action Bar */}
          {activeTab === 'sessions' && (
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Work Sessions</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Session</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'streaming' ? (
          <StreamingResultsTab 
            project={project}
            onExport={(format) => console.log(`Exporting ${format}`)}
          />
        ) : (
          <div className="space-y-4">
            {loading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50">
              <Activity className="h-16 w-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No sessions yet</h3>
              <p className="text-slate-500 mb-6">
                Start your first work session to begin tracking queries and results.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Start Session</span>
              </button>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="group p-6 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl hover:bg-slate-800/40 hover:border-slate-600/50 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors mb-2">
                      {session.session_name || `Session ${formatDate(session.created_at)}`}
                    </h3>
                    
                    {session.description && (
                      <p className="text-slate-400 mb-3">
                        {session.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-6 text-sm text-slate-500">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(session.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4" />
                        <span>{session.query_count} queries</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowLeft className="h-5 w-5 text-slate-500 transform rotate-180" />
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        )}

        {/* Create Session Modal */}
        {showCreateModal && (
          <CreateSessionModal
            project={project}
            onClose={() => setShowCreateModal(false)}
            onSessionCreated={handleSessionCreated}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={() => setShowDeleteConfirm(false)} />

              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-slate-800 shadow-xl rounded-2xl border border-slate-700">
                <h3 className="text-lg font-medium text-white mb-4">Delete Project</h3>
                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete "{project.database_name}"? This will permanently remove all sessions and queries. This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}