import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2,
  Calendar,
  Shield,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Globe,
  Lock,
  Loader,
  Save
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiKeyService, ApiKey, CreateApiKeyRequest, ApiKeyUsageStats } from '../../services/apiKeyService';

interface CreateKeyForm {
  name: string;
  permissions: string[];
  ip_whitelist: string[];
  expires_in_days?: number;
}

export function ApiKeysSettings() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [rotatingKey, setRotatingKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<Map<string, ApiKeyUsageStats>>(new Map());

  const [createForm, setCreateForm] = useState<CreateKeyForm>({
    name: '',
    permissions: ['read', 'write'],
    ip_whitelist: [],
    expires_in_days: undefined
  });

  useEffect(() => {
    if (user?.id) {
      fetchApiKeys();
    }
  }, [user?.id]);

  const fetchApiKeys = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const keys = await apiKeyService.getUserApiKeys(user.id);
      setApiKeys(keys);
      
      // Fetch usage stats for each key
      const statsMap = new Map<string, ApiKeyUsageStats>();
      await Promise.all(
        keys.map(async (key) => {
          try {
            const stats = await apiKeyService.getApiKeyUsageStats(key.id);
            statsMap.set(key.id, stats);
          } catch (error) {
            console.error(`Failed to fetch stats for key ${key.id}:`, error);
          }
        })
      );
      setUsageStats(statsMap);
    } catch (error) {
      setErrorMessage('Failed to fetch API keys');
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!user?.id || !createForm.name.trim()) return;
    
    try {
      setCreating(true);
      
      const request: CreateApiKeyRequest = {
        name: createForm.name.trim(),
        permissions: createForm.permissions,
        ip_whitelist: createForm.ip_whitelist.filter(ip => ip.trim()),
        expires_in_days: createForm.expires_in_days
      };

      const { apiKey, keyData } = await apiKeyService.createApiKey(user.id, request);
      
      setNewApiKey(apiKey);
      setApiKeys(prev => [keyData, ...prev]);
      setShowCreateDialog(false);
      setCreateForm({
        name: '',
        permissions: ['read', 'write'],
        ip_whitelist: [],
        expires_in_days: undefined
      });
      setSuccessMessage('API key created successfully! Make sure to copy it now - you won\'t be able to see it again.');
      
      setTimeout(() => {
        setSuccessMessage('');
        setNewApiKey(null);
      }, 30000);
    } catch (error) {
      setErrorMessage('Failed to create API key');
      console.error('Error creating API key:', error);
    } finally {
      setCreating(false);
    }
  };
  
  const handleDeleteKey = async (id: string) => {
    if (!user?.id) return;
    
    try {
      await apiKeyService.revokeApiKey(user.id, id);
      setApiKeys(prev => prev.filter(key => key.id !== id));
      setDeleteKey(null);
      setSuccessMessage('API key deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to delete API key');
      console.error('Error deleting API key:', error);
    }
  };

  const handleRotateKey = async (id: string) => {
    if (!user?.id) return;
    
    try {
      setRotatingKey(id);
      const newKey = await apiKeyService.rotateApiKey(user.id, id);
      setNewApiKey(newKey);
      await fetchApiKeys(); // Refresh to get updated data
      setSuccessMessage('API key rotated successfully! Make sure to copy the new key.');
      setTimeout(() => {
        setSuccessMessage('');
        setNewApiKey(null);
      }, 30000);
    } catch (error) {
      setErrorMessage('Failed to rotate API key');
      console.error('Error rotating API key:', error);
    } finally {
      setRotatingKey(null);
    }
  };

  const handleUpdateKey = async (id: string, updates: Partial<ApiKey>) => {
    if (!user?.id) return;
    
    try {
      await apiKeyService.updateApiKey(user.id, id, updates);
      setApiKeys(prev => prev.map(key => 
        key.id === id ? { ...key, ...updates } : key
      ));
      setEditingKey(null);
      setSuccessMessage('API key updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to update API key');
      console.error('Error updating API key:', error);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage('Copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpired = (expiresAt?: string) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  const addIpToWhitelist = (keyId: string, ip: string) => {
    const key = apiKeys.find(k => k.id === keyId);
    if (!key) return;
    
    const newWhitelist = [...(key.ip_whitelist || []), ip];
    handleUpdateKey(keyId, { ip_whitelist: newWhitelist });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-purple-400" />
        <span className="ml-2 text-slate-300">Loading API keys...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">API Keys</h2>
          <p className="text-slate-300">
            Manage your API keys for external integrations
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          Create New Key
        </button>
      </div>
      
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      {/* New API Key Display */}
      {newApiKey && (
        <div className="p-6 rounded-xl bg-green-900/20 border border-green-500/30 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-green-300">Your New API Key</h3>
          </div>
          <p className="text-green-200 text-sm mb-4">
            Make sure to copy your API key now. You won't be able to see it again!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 font-mono text-sm text-green-300 border border-green-500/30">
              {newApiKey}
            </code>
            <button
              onClick={() => copyToClipboard(newApiKey)}
              className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-lg transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Create Key Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Create API Key</h3>
            
            <div className="space-y-4">
              {/* Key Name */}
              <div>
                <label htmlFor="key-name" className="block text-sm font-medium text-slate-300 mb-2">
                  Key Name *
                </label>
                <input
                  id="key-name"
                  type="text"
                  placeholder="e.g., Production API, Development Key"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {['read', 'write', 'delete', 'admin'].map((permission) => (
                    <label key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={createForm.permissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateForm(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission]
                            }));
                          } else {
                            setCreateForm(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission)
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500/50 focus:ring-2"
                      />
                      <span className="text-slate-300 text-sm capitalize">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* IP Whitelist */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  IP Whitelist (Optional)
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Restrict access to specific IP addresses. Leave empty for no restrictions.
                </p>
                <textarea
                  placeholder="192.168.1.1&#10;10.0.0.0/8&#10;203.0.113.0"
                  value={createForm.ip_whitelist.join('\n')}
                  onChange={(e) => setCreateForm(prev => ({
                    ...prev,
                    ip_whitelist: e.target.value.split('\n').filter(ip => ip.trim())
                  }))}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Expiration (Optional)
                </label>
                <select
                  value={createForm.expires_in_days || ''}
                  onChange={(e) => setCreateForm(prev => ({
                    ...prev,
                    expires_in_days: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Never expires</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!createForm.name.trim() || creating}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {deleteKey && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Delete API Key</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this API key? This action cannot be undone and will immediately revoke access for any applications using this key.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteKey(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteKey(deleteKey)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No API Keys</h3>
            <p className="text-slate-400 mb-6">
              Create your first API key to start integrating with the DBCoach API
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200"
            >
              Create API Key
            </button>
          </div>
        ) : (
          apiKeys.map((apiKey) => {
            const stats = usageStats.get(apiKey.id);
            const expired = isExpired(apiKey.expires_at);
            
            return (
              <div 
                key={apiKey.id}
                className={`p-6 rounded-xl border backdrop-blur hover:shadow-lg transition-all duration-200 ${
                  expired 
                    ? 'bg-red-900/20 border-red-500/30' 
                    : apiKey.is_active 
                    ? 'bg-slate-800/50 border-slate-700/50' 
                    : 'bg-slate-800/30 border-slate-700/30 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    {/* Key Name and Status */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20">
                        <Key className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{apiKey.name}</h3>
                          {expired && (
                            <span className="px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded">
                              Expired
                            </span>
                          )}
                          {!apiKey.is_active && (
                            <span className="px-2 py-1 text-xs bg-slate-500/20 text-slate-400 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created {formatDate(apiKey.created_at)}
                          </span>
                          {apiKey.last_used && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Last used {formatDate(apiKey.last_used)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* API Key Display */}
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 font-mono text-sm text-slate-300">
                        {showKey === apiKey.id ? 'Key is hidden for security' : apiKey.key_preview}
                      </code>
                      <button
                        onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                        className="p-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title={showKey === apiKey.id ? 'Hide key' : 'Show key preview'}
                      >
                        {showKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(apiKey.key_preview)}
                        className="p-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Copy key preview"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Permissions and Settings */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-400">Permissions:</span>
                        <div className="flex gap-1">
                          {apiKey.permissions.map((permission) => (
                            <span key={permission} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {apiKey.ip_whitelist && apiKey.ip_whitelist.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-400">IP Restricted:</span>
                          <span className="text-slate-300 text-xs">
                            {apiKey.ip_whitelist.length} IP{apiKey.ip_whitelist.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      
                      {apiKey.expires_at && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-400">Expires:</span>
                          <span className={`text-xs ${expired ? 'text-red-300' : 'text-slate-300'}`}>
                            {formatDate(apiKey.expires_at)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Usage Stats */}
                    {stats && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-green-400" />
                          <span className="text-slate-400">Usage:</span>
                          <span className="text-green-300">{stats.total_requests} total</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-blue-300">{stats.requests_today} today</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleRotateKey(apiKey.id)}
                      disabled={rotatingKey === apiKey.id}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Rotate API key"
                    >
                      {rotatingKey === apiKey.id ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingKey(apiKey.id)}
                      className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-colors"
                      title="Edit API key"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteKey(apiKey.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete API key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Security Best Practices */}
      <div className="p-6 rounded-xl bg-blue-900/20 border border-blue-500/30 backdrop-blur">
        <h3 className="text-lg font-semibold text-blue-300 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Best Practices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-200 mb-2">Key Management</h4>
            <ul className="space-y-1 text-blue-100">
              <li>• Store keys securely in environment variables</li>
              <li>• Never commit keys to version control</li>
              <li>• Rotate keys regularly</li>
              <li>• Use least privilege permissions</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-200 mb-2">Access Control</h4>
            <ul className="space-y-1 text-blue-100">
              <li>• Enable IP whitelisting when possible</li>
              <li>• Set appropriate expiration dates</li>
              <li>• Monitor usage regularly</li>
              <li>• Revoke unused keys immediately</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}