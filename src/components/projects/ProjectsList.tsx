import React, { useState } from 'react';
import { DatabaseProject, databaseProjectsService } from '../../services/databaseProjectsService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Database,
  Calendar,
  Clock,
  FolderOpen,
  MousePointer,
  Trash2,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface ProjectsListProps {
  projects: DatabaseProject[];
  loading: boolean;
  onProjectSelect: (project: DatabaseProject) => void;
  onProjectDelete?: () => void;
  searchTerm: string;
}

export function ProjectsList({ projects, loading, onProjectSelect, onProjectDelete, searchTerm }: ProjectsListProps) {
  const { user } = useAuth();
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<DatabaseProject | null>(null);
  const getDbTypeIcon = (type: string) => {
    return <Database className="h-5 w-5 text-blue-400" />;
  };

  const getDbTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'PostgreSQL': 'bg-blue-600/20 text-blue-300',
      'MySQL': 'bg-orange-600/20 text-orange-300',
      'MongoDB': 'bg-green-600/20 text-green-300',
      'SQLite': 'bg-gray-600/20 text-gray-300',
      'SQL': 'bg-purple-600/20 text-purple-300',
      'NoSQL': 'bg-red-600/20 text-red-300',
    };
    return colors[type] || 'bg-slate-600/20 text-slate-300';
  };

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

  const handleDeleteClick = (e: React.MouseEvent, project: DatabaseProject) => {
    e.stopPropagation(); // Prevent project selection
    setShowDeleteModal(project);
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteModal || !user) return;

    try {
      setDeletingProject(showDeleteModal.id);
      await databaseProjectsService.deleteProject(showDeleteModal.id, user.id);
      setShowDeleteModal(null);
      onProjectDelete?.();
    } catch (error) {
      console.error('Error deleting project:', error);
      // Could add toast notification here
    } finally {
      setDeletingProject(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(null);
  };

  const hasStreamingResults = (project: DatabaseProject) => {
    return project.metadata && 
           project.metadata.generation_mode && 
           project.metadata.streaming_results;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 animate-pulse"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-5 bg-slate-700 rounded"></div>
                <div className="h-4 w-16 bg-slate-700 rounded-full"></div>
              </div>
              <div className="h-6 bg-slate-700 rounded w-2/3"></div>
              <div className="h-4 bg-slate-700 rounded w-full"></div>
              <div className="h-4 bg-slate-700 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50">
        {searchTerm ? (
          <>
            <FolderOpen className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No projects found</h3>
            <p className="text-slate-500">
              Try adjusting your search terms or create a new project.
            </p>
          </>
        ) : (
          <>
            <Database className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No projects yet</h3>
            <p className="text-slate-500 mb-6">
              Create your first database project to get started with organizing your work.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
              <MousePointer className="h-4 w-4" />
              <span>Click "New Project" to begin</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onProjectSelect(project)}
          className="group p-6 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl hover:bg-slate-800/40 hover:border-slate-600/50 transition-all cursor-pointer hover:scale-[1.02] hover:shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getDbTypeIcon(project.database_type)}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDbTypeColor(project.database_type)}`}>
                {project.database_type}
              </span>
              {hasStreamingResults(project) && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-full">
                  <Zap className="w-3 h-3 text-purple-300" />
                  <span className="text-xs font-medium text-purple-300">Streaming</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleDeleteClick(e, project)}
                disabled={deletingProject === project.id}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                aria-label={`Delete ${project.database_name} project`}
              >
                {deletingProject === project.id ? (
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
              <MousePointer className="h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Project Name */}
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors line-clamp-1">
            {project.database_name}
          </h3>

          {/* Description */}
          {project.description && (
            <p className="text-slate-400 text-sm mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3" />
              <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>{formatDate(project.last_accessed)}</span>
            </div>
          </div>

          {/* Hover indicator */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-2 text-xs text-purple-400">
              <span>
                {hasStreamingResults(project) 
                  ? 'Click to view streaming results and chat history'
                  : 'Click to view sessions and history'
                }
              </span>
              <MousePointer className="h-3 w-3" />
            </div>
          </div>
        </div>
      ))}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Project</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-300 mb-2">
                Are you sure you want to delete <strong className="text-white">{showDeleteModal.database_name}</strong>?
              </p>
              <p className="text-sm text-slate-400">
                This will permanently delete the project and all its sessions, queries, and associated data.
              </p>
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deletingProject === showDeleteModal.id}
                className="px-4 py-2 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingProject === showDeleteModal.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {deletingProject === showDeleteModal.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}