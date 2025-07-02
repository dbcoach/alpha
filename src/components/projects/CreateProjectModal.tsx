import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseProjectsService, CreateProjectRequest } from '../../services/databaseProjectsService';
import { X, Database } from 'lucide-react';

interface CreateProjectModalProps {
  onClose: () => void;
  onProjectCreated: () => void;
}

export function CreateProjectModal({ onClose, onProjectCreated }: CreateProjectModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateProjectRequest>({
    database_name: '',
    database_type: 'PostgreSQL',
    description: '',
    metadata: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const databaseTypes: Array<{ value: CreateProjectRequest['database_type']; label: string; description: string }> = [
    { value: 'PostgreSQL', label: 'PostgreSQL', description: 'Advanced open-source relational database' },
    { value: 'MySQL', label: 'MySQL', description: 'Popular open-source relational database' },
    { value: 'SQLite', label: 'SQLite', description: 'Lightweight embedded SQL database' },
    { value: 'MongoDB', label: 'MongoDB', description: 'Document-oriented NoSQL database' },
    { value: 'SQL', label: 'SQL (Generic)', description: 'Generic SQL database' },
    { value: 'NoSQL', label: 'NoSQL (Generic)', description: 'Generic NoSQL database' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      await databaseProjectsService.createProject(user.id, {
        ...formData,
        database_name: formData.database_name.trim(),
        description: formData.description?.trim() || undefined
      });
      onProjectCreated();
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const getDbTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'PostgreSQL': 'border-blue-600/50 bg-blue-600/10',
      'MySQL': 'border-orange-600/50 bg-orange-600/10',
      'MongoDB': 'border-green-600/50 bg-green-600/10',
      'SQLite': 'border-gray-600/50 bg-gray-600/10',
      'SQL': 'border-purple-600/50 bg-purple-600/10',
      'NoSQL': 'border-red-600/50 bg-red-600/10',
    };
    return colors[type] || 'border-slate-600/50 bg-slate-600/10';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-slate-800 shadow-xl rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Database className="h-6 w-6 text-purple-400" />
              <h3 className="text-2xl font-bold text-white">Create New Database Project</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-300">
                {error}
              </div>
            )}

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Database Name *
              </label>
              <input
                type="text"
                required
                value={formData.database_name}
                onChange={(e) => setFormData(prev => ({ ...prev, database_name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., E-commerce Database, Analytics DB, User Management System"
              />
            </div>

            {/* Database Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Database Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {databaseTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.database_type === type.value
                        ? getDbTypeColor(type.value) + ' border-opacity-100'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="database_type"
                      value={type.value}
                      checked={formData.database_type === type.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, database_type: e.target.value as any }))}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Database className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-white">{type.label}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        {type.description}
                      </p>
                    </div>
                    {formData.database_type === type.value && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></div>
                    )}
                  </label>
                ))}
              </div>
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
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe what this database is for, its main purpose, or any important notes..."
              />
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
                disabled={loading || !formData.database_name.trim()}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}