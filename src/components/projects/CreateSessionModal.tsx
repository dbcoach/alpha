import React, { useState } from 'react';
import { DatabaseProject, databaseProjectsService, CreateSessionRequest } from '../../services/databaseProjectsService';
import { X, Activity } from 'lucide-react';

interface CreateSessionModalProps {
  project: DatabaseProject;
  onClose: () => void;
  onSessionCreated: () => void;
}

export function CreateSessionModal({ project, onClose, onSessionCreated }: CreateSessionModalProps) {
  const [formData, setFormData] = useState<Omit<CreateSessionRequest, 'project_id'>>({
    session_name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      await databaseProjectsService.createSession({
        project_id: project.id,
        session_name: formData.session_name.trim() || undefined,
        description: formData.description?.trim() || undefined
      });
      onSessionCreated();
    } catch (error) {
      console.error('Error creating session:', error);
      setError(error instanceof Error ? error.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const getDbTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'PostgreSQL': 'text-blue-300',
      'MySQL': 'text-orange-300',
      'MongoDB': 'text-green-300',
      'SQLite': 'text-gray-300',
      'SQL': 'text-purple-300',
      'NoSQL': 'text-red-300',
    };
    return colors[type] || 'text-slate-300';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-slate-800 shadow-xl rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-green-400" />
              <h3 className="text-2xl font-bold text-white">Start New Session</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Project Info */}
          <div className="mb-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-400">Project:</span>
              <span className="font-medium text-white">{project.database_name}</span>
              <span className={`text-sm ${getDbTypeColor(project.database_type)}`}>
                ({project.database_type})
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-300">
                {error}
              </div>
            )}

            {/* Session Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Session Name
              </label>
              <input
                type="text"
                value={formData.session_name}
                onChange={(e) => setFormData(prev => ({ ...prev, session_name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={`Session ${new Date().toLocaleDateString()}`}
              />
              <p className="text-xs text-slate-500 mt-1">
                Leave empty to auto-generate based on current date
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="What will you be working on in this session? (optional)"
              />
            </div>

            {/* Session Purpose Examples */}
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/30">
              <h4 className="text-sm font-medium text-blue-300 mb-2">Session Ideas:</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Initial database setup and schema design</li>
                <li>• User management and authentication queries</li>
                <li>• Performance optimization and indexing</li>
                <li>• Data migration and cleanup tasks</li>
                <li>• Feature development and testing</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Start Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}