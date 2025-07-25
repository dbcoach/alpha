// Agent Status Monitor Component for debugging and managing stuck agents
import React, { useState } from 'react';
import { useAgentCleanup } from '../../hooks/useAgentCleanup';

interface AgentStatusMonitorProps {
  className?: string;
  showDetails?: boolean;
  autoCleanup?: boolean;
}

export const AgentStatusMonitor: React.FC<AgentStatusMonitorProps> = ({ 
  className = '',
  showDetails = false,
  autoCleanup = true
}) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const {
    isCleanupActive,
    healthChecks,
    lastCleanupStats,
    agentSummary,
    hasStuckAgents,
    startCleanup,
    stopCleanup,
    forceCleanupStuck,
    emergencyReset,
    performHealthCheck,
    getDiagnostics,
    totalAgents,
    activeAgents,
    problemAgents
  } = useAgentCleanup({ autoStart: autoCleanup });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'stuck': return 'text-yellow-600';
      case 'orphaned': return 'text-red-600';
      case 'completed': return 'text-blue-600';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const diagnostics = getDiagnostics();

  return (
    <div className={`agent-status-monitor ${className}`}>
      {/* Compact Status Bar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              hasStuckAgents ? 'bg-red-500 animate-pulse' : 
              activeAgents > 0 ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium">
              Agents: {totalAgents} ({activeAgents} active)
            </span>
          </div>
          
          {hasStuckAgents && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-red-600 font-medium">
                ⚠️ {agentSummary.stuck + agentSummary.orphaned} stuck
              </span>
              <button
                onClick={forceCleanupStuck}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Cleanup
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className={`text-xs px-2 py-1 rounded ${
            isCleanupActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {isCleanupActive ? '🟢 Active' : '🔴 Inactive'}
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? '▼' : '▶'} Details
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2 p-4 bg-white border rounded-lg space-y-4">
          {/* Agent Summary */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Agent Status Summary</h4>
            <div className="grid grid-cols-5 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{agentSummary.healthy}</div>
                <div className="text-xs text-gray-600">Healthy</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{agentSummary.stuck}</div>
                <div className="text-xs text-gray-600">Stuck</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{agentSummary.orphaned}</div>
                <div className="text-xs text-gray-600">Orphaned</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{agentSummary.completed}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-500">{agentSummary.failed}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
            </div>
          </div>

          {/* Health Checks */}
          {healthChecks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Active Task Health</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {healthChecks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        check.status === 'healthy' ? 'bg-green-500' :
                        check.status === 'stuck' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="font-mono">{check.taskId}</span>
                      <span className="text-gray-600">{check.agent}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={getStatusColor(check.status)}>{check.status}</span>
                      <span className="text-gray-500">{formatDuration(check.age)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={isCleanupActive ? stopCleanup : startCleanup}
              className={`px-3 py-1 text-sm rounded ${
                isCleanupActive 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isCleanupActive ? 'Stop Cleanup' : 'Start Cleanup'}
            </button>
            
            <button
              onClick={performHealthCheck}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Health Check
            </button>
            
            {problemAgents > 0 && (
              <button
                onClick={forceCleanupStuck}
                className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                Force Cleanup
              </button>
            )}
            
            <button
              onClick={emergencyReset}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Emergency Reset
            </button>
            
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
            </button>
          </div>

          {/* Last Cleanup Stats */}
          {lastCleanupStats && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
              <div className="text-sm font-semibold text-yellow-800">Last Cleanup Results:</div>
              <div className="text-xs text-yellow-700 mt-1">
                Cleaned {lastCleanupStats.cleanedTasks} out of {lastCleanupStats.stuckTasks} stuck tasks
              </div>
            </div>
          )}

          {/* Diagnostics */}
          {showDiagnostics && (
            <div className="p-3 bg-gray-50 border rounded">
              <h4 className="text-sm font-semibold mb-2">System Diagnostics</h4>
              <div className="text-xs space-y-1 font-mono">
                <div>Cleanup Service: {diagnostics.isCleanupRunning ? '🟢 Running' : '🔴 Stopped'}</div>
                <div>Stuck Threshold: {diagnostics.thresholds.stuck}ms</div>
                <div>Orphan Threshold: {diagnostics.thresholds.orphan}ms</div>
                <div>Cleanup Interval: {diagnostics.thresholds.cleanup}ms</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentStatusMonitor;