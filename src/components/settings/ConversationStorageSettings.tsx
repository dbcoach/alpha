import React, { useState } from 'react';
import { Database, HardDrive, Cloud, Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { conversationStorage, SupabaseConversations, LocalStorageConversations, ConversationMigration } from '../../services/conversationStorage';
import { supabase } from '../../lib/supabase';

export function ConversationStorageSettings() {
  const [isLocal, setIsLocal] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [migrationResults, setMigrationResults] = useState<{ migrated: number; errors: string[] } | null>(null);

  const handleMigrateToSupabase = async () => {
    try {
      setMigrationStatus('migrating');
      
      const localStorage = new LocalStorageConversations();
      const supabaseStorage = new SupabaseConversations(supabase);
      
      const results = await ConversationMigration.migrateLocalStorageToSupabase(
        supabaseStorage,
        localStorage
      );
      
      setMigrationResults(results);
      setMigrationStatus(results.errors.length === 0 ? 'success' : 'error');
      
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus('error');
      setMigrationResults({ migrated: 0, errors: [`Migration failed: ${error}`] });
    }
  };

  const handleExportLocalStorage = async () => {
    try {
      const localStorage = new LocalStorageConversations();
      const data = await localStorage.exportConversations();
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-semibold text-white">Conversation Storage</h3>
      </div>

      {/* Storage Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${isLocal ? 'bg-green-900/20 border-green-700/50' : 'bg-slate-700/30 border-slate-600/50'}`}>
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="w-5 h-5 text-green-400" />
            <span className="font-medium text-white">localStorage</span>
            {isLocal && <CheckCircle className="w-4 h-4 text-green-400" />}
          </div>
          <p className="text-sm text-slate-300">
            Browser-only storage. Data stays on this device.
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${!isLocal ? 'bg-blue-900/20 border-blue-700/50' : 'bg-slate-700/30 border-slate-600/50'}`}>
          <div className="flex items-center gap-3 mb-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-white">Supabase Database</span>
            {!isLocal && <CheckCircle className="w-4 h-4 text-blue-400" />}
          </div>
          <p className="text-sm text-slate-300">
            Cloud storage. Access from any device, real-time sync.
          </p>
        </div>
      </div>

      {/* Migration Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-white mb-1">Migration to Supabase</h4>
            <p className="text-sm text-slate-400">
              Transfer your localStorage conversations to Supabase cloud database
            </p>
          </div>
          <button
            onClick={handleMigrateToSupabase}
            disabled={migrationStatus === 'migrating'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {migrationStatus === 'migrating' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Migrate to Supabase
              </>
            )}
          </button>
        </div>

        {/* Migration Results */}
        {migrationResults && (
          <div className={`p-4 rounded-lg border ${
            migrationStatus === 'success' 
              ? 'bg-green-900/20 border-green-700/50' 
              : 'bg-red-900/20 border-red-700/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {migrationStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className="font-medium text-white">
                {migrationStatus === 'success' 
                  ? `Successfully migrated ${migrationResults.migrated} conversations`
                  : 'Migration completed with errors'
                }
              </span>
            </div>
            {migrationResults.errors.length > 0 && (
              <div className="text-sm text-red-300">
                <p className="font-medium mb-1">Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {migrationResults.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Backup Option */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div>
            <h4 className="font-medium text-white mb-1">Export Backup</h4>
            <p className="text-sm text-slate-400">
              Download your conversations as JSON backup file
            </p>
          </div>
          <button
            onClick={handleExportLocalStorage}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Backup
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-900/10 border border-blue-700/30 rounded-lg">
        <h4 className="font-medium text-blue-300 mb-2">🔗 Access Your Data After Migration</h4>
        <div className="text-sm text-blue-200 space-y-2">
          <p><strong>1. Supabase Dashboard:</strong> View/edit conversations at supabase.com/dashboard</p>
          <p><strong>2. Multi-device Access:</strong> Login from any device to see your conversations</p>
          <p><strong>3. Real-time Sync:</strong> Changes sync instantly across all your devices</p>
          <p><strong>4. API Access:</strong> Programmatic access via Supabase REST API</p>
        </div>
      </div>
    </div>
  );
}