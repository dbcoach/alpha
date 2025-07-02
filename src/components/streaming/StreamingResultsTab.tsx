import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw,
  Download, 
  Copy,
  Maximize2,
  Minimize2,
  Bot,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  FileText,
  Eye,
  Calendar,
  Database
} from 'lucide-react';
import { streamingDataCapture, CapturedStreamingSession } from '../../services/streamingDataCapture';
import { DatabaseProject } from '../../services/databaseProjectsService';

interface StreamingResultsTabProps {
  project: DatabaseProject;
  onExport?: (format: 'json' | 'csv' | 'pdf') => void;
  className?: string;
}

export function StreamingResultsTab({ 
  project, 
  onExport,
  className = ''
}: StreamingResultsTabProps) {
  const [sessionData, setSessionData] = useState<CapturedStreamingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(40);
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  const [displayedContent, setDisplayedContent] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadStreamingData();
  }, [project]);

  const loadStreamingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if this project has streaming metadata
      const streamingSessionId = project.metadata?.streaming_session_id;
      if (!streamingSessionId) {
        setError('This project does not contain streaming data');
        return;
      }

      await streamingDataCapture.initialize();
      const data = await streamingDataCapture.getSessionData(streamingSessionId);
      
      if (!data) {
        setError('Streaming session not found');
        return;
      }

      setSessionData(data);
      
      // Initialize displayed content with all chunks
      const initialContent = new Map();
      data.chunks.forEach(chunk => {
        const existingContent = initialContent.get(chunk.task_id) || '';
        initialContent.set(chunk.task_id, existingContent + chunk.content);
      });
      setDisplayedContent(initialContent);
      
    } catch (error) {
      console.error('Error loading streaming data:', error);
      setError('Failed to load streaming data');
    } finally {
      setLoading(false);
    }
  };

  const startReplay = () => {
    if (!sessionData) return;
    
    setIsReplaying(true);
    setCurrentReplayIndex(0);
    setDisplayedContent(new Map());
    
    // Replay chunks in order
    let chunkIndex = 0;
    const replayInterval = setInterval(() => {
      if (chunkIndex >= sessionData.chunks.length) {
        setIsReplaying(false);
        clearInterval(replayInterval);
        return;
      }
      
      const chunk = sessionData.chunks[chunkIndex];
      setDisplayedContent(prev => {
        const newContent = new Map(prev);
        const existingContent = newContent.get(chunk.task_id) || '';
        newContent.set(chunk.task_id, existingContent + chunk.content);
        return newContent;
      });
      
      setCurrentReplayIndex(chunkIndex);
      chunkIndex++;
    }, 1000 / (replaySpeed / 10)); // Adjust speed
  };

  const stopReplay = () => {
    setIsReplaying(false);
    
    // Show all content immediately
    if (sessionData) {
      const finalContent = new Map();
      sessionData.chunks.forEach(chunk => {
        const existingContent = finalContent.get(chunk.task_id) || '';
        finalContent.set(chunk.task_id, existingContent + chunk.content);
      });
      setDisplayedContent(finalContent);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const exportResults = (format: 'json' | 'csv' | 'pdf') => {
    if (!sessionData) return;
    
    if (onExport) {
      onExport(format);
    } else {
      // Default export logic
      const data = {
        project: project.database_name,
        session: sessionData.streamingData,
        chunks: sessionData.chunks,
        insights: sessionData.insights,
        exported_at: new Date().toISOString()
      };
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.database_name}-streaming-results.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAgentColor = (agent: string): string => {
    const colors = {
      'Requirements Analyst': 'from-blue-600 to-cyan-600',
      'Schema Architect': 'from-purple-600 to-pink-600',
      'Implementation Specialist': 'from-green-600 to-emerald-600',
      'Quality Assurance': 'from-orange-600 to-red-600',
      'DB.Coach': 'from-purple-600 to-blue-600'
    };
    return colors[agent as keyof typeof colors] || 'from-slate-600 to-slate-700';
  };

  const getUniqueTaskIds = (): string[] => {
    if (!sessionData) return [];
    return Array.from(new Set(sessionData.chunks.map(chunk => chunk.task_id)));
  };

  const getTaskTitle = (taskId: string): string => {
    if (!sessionData) return taskId;
    const chunk = sessionData.chunks.find(c => c.task_id === taskId);
    return chunk?.task_title || taskId;
  };

  const getTaskAgent = (taskId: string): string => {
    if (!sessionData) return 'Unknown';
    const chunk = sessionData.chunks.find(c => c.task_id === taskId);
    return chunk?.agent_name || 'Unknown';
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading streaming data...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className={`${className}`}>
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-8">
          <div className="text-center">
            <Database className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">No Streaming Data Available</p>
            <p className="text-slate-500 text-sm">
              {error || 'This project was not created using the streaming interface'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/20 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${
            sessionData.streamingData.status === 'completed' ? 'bg-green-400' : 
            sessionData.streamingData.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
          }`}></div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Streaming Generation Results
            </h3>
            <p className="text-slate-400 text-sm">
              {sessionData.streamingData.database_type} • {formatTimestamp(sessionData.streamingData.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportResults('json')}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="flex h-96">
        {/* Controls Sidebar */}
        <div className="w-64 border-r border-slate-700/50 bg-slate-800/10 p-4">
          <h4 className="text-sm font-medium text-white mb-4">Playback Controls</h4>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={isReplaying ? stopReplay : startReplay}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
              >
                {isReplaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isReplaying ? 'Pause' : 'Replay'}
              </button>
              
              <button
                onClick={() => {
                  setCurrentReplayIndex(0);
                  setDisplayedContent(new Map());
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Speed</label>
              <input
                type="range"
                min="10"
                max="100"
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="text-xs text-slate-500 mt-1">
                {(replaySpeed / 40).toFixed(1)}x
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h5 className="text-xs font-medium text-slate-400 mb-3">Session Info</h5>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Database className="w-3 h-3 text-blue-400" />
                <span className="text-slate-300">{sessionData.streamingData.database_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-green-400" />
                <span className="text-slate-300">
                  {sessionData.endTime 
                    ? `${Math.round((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 1000)}s`
                    : 'In progress'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 text-purple-400" />
                <span className="text-slate-300">{sessionData.chunks.length} chunks</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-medium text-slate-400 mb-3">Generated Components</h5>
            <div className="space-y-2">
              {getUniqueTaskIds().map((taskId) => (
                <div key={taskId} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    displayedContent.has(taskId) ? 'bg-green-400' : 'bg-slate-600'
                  }`} />
                  <span className="text-slate-300 truncate">{getTaskTitle(taskId)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {getUniqueTaskIds().map((taskId) => {
              const content = displayedContent.get(taskId) || '';
              const agent = getTaskAgent(taskId);
              const title = getTaskTitle(taskId);
              
              return (
                <div key={taskId} className="bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getAgentColor(agent)} flex items-center justify-center`}>
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">{title}</h4>
                        <p className="text-xs text-slate-400">{agent}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <button
                        onClick={() => copyToClipboard(content)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                        title="Copy content"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <pre className="text-slate-200 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {content}
                      {isReplaying && !content && (
                        <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
                      )}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}