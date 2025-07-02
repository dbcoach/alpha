import React, { useState } from 'react';
import { DatabaseProject, DatabaseSession, databaseProjectsService, CreateQueryRequest } from '../../services/databaseProjectsService';
import { X, Code, Play, CheckCircle, XCircle } from 'lucide-react';

interface AddQueryModalProps {
  session: DatabaseSession;
  project: DatabaseProject;
  onClose: () => void;
  onQueryAdded: () => void;
}

export function AddQueryModal({ session, project, onClose, onQueryAdded }: AddQueryModalProps) {
  const [formData, setFormData] = useState<Omit<CreateQueryRequest, 'session_id' | 'project_id'>>({
    query_text: '',
    query_type: 'SELECT',
    results_data: null,
    results_format: 'json',
    execution_time_ms: undefined,
    row_count: undefined,
    success: true,
    error_message: undefined
  });
  const [resultsInput, setResultsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const queryTypes: Array<{ value: CreateQueryRequest['query_type']; label: string; color: string }> = [
    { value: 'SELECT', label: 'SELECT', color: 'bg-blue-600/20 text-blue-300' },
    { value: 'INSERT', label: 'INSERT', color: 'bg-green-600/20 text-green-300' },
    { value: 'UPDATE', label: 'UPDATE', color: 'bg-yellow-600/20 text-yellow-300' },
    { value: 'DELETE', label: 'DELETE', color: 'bg-red-600/20 text-red-300' },
    { value: 'CREATE', label: 'CREATE', color: 'bg-purple-600/20 text-purple-300' },
    { value: 'ALTER', label: 'ALTER', color: 'bg-orange-600/20 text-orange-300' },
    { value: 'OTHER', label: 'OTHER', color: 'bg-slate-600/20 text-slate-300' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      // Parse results data if provided
      let parsedResults = null;
      if (resultsInput.trim()) {
        try {
          if (formData.results_format === 'json') {
            parsedResults = JSON.parse(resultsInput);
          } else {
            parsedResults = resultsInput;
          }
        } catch {
          throw new Error('Invalid results format. Please check your JSON syntax.');
        }
      }

      await databaseProjectsService.createQuery({
        session_id: session.id,
        project_id: project.id,
        query_text: formData.query_text.trim(),
        query_type: formData.query_type,
        results_data: parsedResults,
        results_format: formData.results_format,
        execution_time_ms: formData.execution_time_ms || undefined,
        row_count: formData.row_count || undefined,
        success: formData.success,
        error_message: formData.success ? undefined : formData.error_message?.trim()
      });
      
      onQueryAdded();
    } catch (error) {
      console.error('Error adding query:', error);
      setError(error instanceof Error ? error.message : 'Failed to add query');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessToggle = (success: boolean) => {
    setFormData(prev => ({
      ...prev,
      success,
      error_message: success ? undefined : prev.error_message
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-slate-800 shadow-xl rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Code className="h-6 w-6 text-purple-400" />
              <h3 className="text-2xl font-bold text-white">Add Query to Session</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Session Info */}
          <div className="mb-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-400">Session:</span>
                <span className="font-medium text-white">
                  {session.session_name || `Session ${new Date(session.created_at).toLocaleDateString()}`}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <span>{project.database_name}</span>
                <span>•</span>
                <span>{project.database_type}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Query Type and Status */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Query Type
                    </label>
                    <select
                      value={formData.query_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, query_type: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {queryTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Status
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSuccessToggle(true)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                          formData.success 
                            ? 'bg-green-600/20 border-green-600/50 text-green-300' 
                            : 'border-slate-600 text-slate-400 hover:border-green-600/50'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Success</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSuccessToggle(false)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                          !formData.success 
                            ? 'bg-red-600/20 border-red-600/50 text-red-300' 
                            : 'border-slate-600 text-slate-400 hover:border-red-600/50'
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Error</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Execution Time (ms)
                    </label>
                    <input
                      type="number"
                      value={formData.execution_time_ms || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        execution_time_ms: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 150"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Row Count
                    </label>
                    <input
                      type="number"
                      value={formData.row_count || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        row_count: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 25"
                    />
                  </div>
                </div>

                {/* Results Format */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Results Format
                  </label>
                  <select
                    value={formData.results_format}
                    onChange={(e) => setFormData(prev => ({ ...prev, results_format: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="table">Table</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Error Message (if error) */}
                {!formData.success && (
                  <div>
                    <label className="block text-sm font-medium text-red-300 mb-2">
                      Error Message
                    </label>
                    <textarea
                      value={formData.error_message || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, error_message: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-red-900/20 border border-red-700/50 rounded-lg text-red-200 placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter the error message..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Query Text */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                SQL Query *
              </label>
              <textarea
                required
                value={formData.query_text}
                onChange={(e) => setFormData(prev => ({ ...prev, query_text: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder="SELECT * FROM users WHERE created_at > '2024-01-01';"
              />
            </div>

            {/* Results Data */}
            {formData.success && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Results Data (Optional)
                </label>
                <textarea
                  value={resultsInput}
                  onChange={(e) => setResultsInput(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  placeholder={
                    formData.results_format === 'json'
                      ? '[{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]'
                      : 'id,name\n1,John\n2,Jane'
                  }
                />
              </div>
            )}

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
                disabled={loading || !formData.query_text.trim()}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Query'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}