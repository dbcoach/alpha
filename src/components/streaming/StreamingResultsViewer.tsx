import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw,
  Download, 
  Copy,
  Maximize2,
  Minimize2,
  MessageSquare,
  Bot,
  Database,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  FileText,
  Share,
  Settings
} from 'lucide-react';
import { DatabaseProject, DatabaseSession, DatabaseQuery } from '../../services/databaseProjectsService';

interface StreamingResult {
  taskId: string;
  content: string;
  taskTitle?: string;
  agent?: string;
  timestamp?: string;
}

interface StreamingResultsViewerProps {
  project: DatabaseProject;
  session: DatabaseSession;
  queries: DatabaseQuery[];
  onStartNewChat?: () => void;
  onExport?: (format: 'json' | 'csv' | 'pdf') => void;
}

export function StreamingResultsViewer({ 
  project, 
  session, 
  queries, 
  onStartNewChat,
  onExport 
}: StreamingResultsViewerProps) {
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(40);
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'insights' | 'export'>('results');
  const [displayedContent, setDisplayedContent] = useState<Map<string, string>>(new Map());
  
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract streaming results from queries
  const streamingResults: StreamingResult[] = React.useMemo(() => {
    return queries
      .filter(query => query.results_data && typeof query.results_data === 'object')
      .map(query => {
        if (query.results_data.content && query.results_data.taskId) {
          return {
            taskId: query.results_data.taskId,
            content: query.results_data.content,
            taskTitle: query.query_text?.replace('Streaming Task: ', '') || 'Unknown Task',
            agent: getAgentFromTaskId(query.results_data.taskId),
            timestamp: query.created_at
          };
        }
        return null;
      })
      .filter(Boolean) as StreamingResult[];
  }, [queries]);

  // Extract insights from session metadata
  const insights = React.useMemo(() => {
    const projectMetadata = project.metadata || {};
    const sessionInsights = projectMetadata.insights || [];
    
    // Add some derived insights
    const derivedInsights = [
      {
        agent: 'DB.Coach',
        message: `Generated ${streamingResults.length} components for ${project.database_type} database`,
        timestamp: session.created_at
      },
      {
        agent: 'Quality Assurance',
        message: `Project complexity: ${getComplexityLevel(streamingResults.length)}`,
        timestamp: session.created_at
      }
    ];
    
    return [...sessionInsights, ...derivedInsights];
  }, [project, session, streamingResults]);

  function getAgentFromTaskId(taskId: string): string {
    if (taskId.includes('requirements') || taskId.includes('analysis')) return 'Requirements Analyst';
    if (taskId.includes('schema') || taskId.includes('design')) return 'Schema Architect';
    if (taskId.includes('implementation') || taskId.includes('package')) return 'Implementation Specialist';
    if (taskId.includes('quality') || taskId.includes('assurance')) return 'Quality Assurance';
    return 'DB.Coach';
  }

  function getComplexityLevel(componentCount: number): string {
    if (componentCount <= 2) return 'Simple';
    if (componentCount <= 4) return 'Moderate';
    return 'Complex';
  }

  function getAgentColor(agent: string): string {
    const colors = {
      'Requirements Analyst': 'from-blue-600 to-cyan-600',
      'Schema Architect': 'from-purple-600 to-pink-600',
      'Implementation Specialist': 'from-green-600 to-emerald-600',
      'Quality Assurance': 'from-orange-600 to-red-600',
      'DB.Coach': 'from-purple-600 to-blue-600'
    };
    return colors[agent as keyof typeof colors] || 'from-slate-600 to-slate-700';
  }

  // Initialize displayed content
  useEffect(() => {
    if (!isReplaying) {
      const initialContent = new Map();
      streamingResults.forEach(result => {
        initialContent.set(result.taskId, result.content);
      });
      setDisplayedContent(initialContent);
    }
  }, [streamingResults, isReplaying]);

  // Replay functionality
  const startReplay = () => {
    setIsReplaying(true);
    setCurrentReplayIndex(0);
    setDisplayedContent(new Map());
    
    // Start character-by-character replay
    replayIntervalRef.current = setInterval(() => {
      setCurrentReplayIndex(prev => {
        if (prev >= streamingResults.length) {
          setIsReplaying(false);
          return prev;
        }
        
        const currentResult = streamingResults[prev];
        if (currentResult) {
          setDisplayedContent(prevContent => {
            const newContent = new Map(prevContent);
            const currentText = newContent.get(currentResult.taskId) || '';
            const fullText = currentResult.content;
            
            if (currentText.length < fullText.length) {
              const charsToAdd = Math.max(1, Math.floor(replaySpeed / 60));
              const newText = fullText.substring(0, currentText.length + charsToAdd);
              newContent.set(currentResult.taskId, newText);
            } else if (prev < streamingResults.length - 1) {
              return newContent;
            }
            
            return newContent;
          });
        }
        
        return prev;
      });
    }, 1000 / 60); // 60 FPS
  };

  const stopReplay = () => {
    setIsReplaying(false);
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    
    // Show all content immediately
    const finalContent = new Map();
    streamingResults.forEach(result => {
      finalContent.set(result.taskId, result.content);
    });
    setDisplayedContent(finalContent);
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const exportResults = (format: 'json' | 'csv' | 'pdf') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export logic
      const data = {
        project: project.database_name,
        session: session.session_name,
        timestamp: session.created_at,
        results: streamingResults,
        insights: insights
      };
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.database_name}-${session.session_name}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  useEffect(() => {
    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {session.session_name || 'Streaming Session'}
            </h2>
            <p className="text-slate-400 text-sm">
              {project.database_name} • {formatTimestamp(session.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={isFullscreen ? () => setIsFullscreen(false) : () => setIsFullscreen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700/50 bg-slate-800/30">
        {[
          { id: 'results', label: 'Generated Results', icon: Database },
          { id: 'insights', label: 'AI Insights', icon: Bot },
          { id: 'export', label: 'Export & Share', icon: Share }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id 
                ? 'text-purple-300 border-purple-500 bg-slate-800/50' 
                : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'results' && (
          <div className="h-full flex">
            {/* Controls */}
            <div className="w-64 border-r border-slate-700/50 bg-slate-800/20 p-4">
              <h3 className="text-sm font-medium text-white mb-4">Playback Controls</h3>
              
              <div className="space-y-3">
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

              <div className="mt-6">
                <h4 className="text-xs font-medium text-slate-400 mb-3">Generated Components</h4>
                <div className="space-y-2">
                  {streamingResults.map((result, index) => (
                    <div key={result.taskId} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${
                        displayedContent.has(result.taskId) && displayedContent.get(result.taskId)?.length === result.content.length
                          ? 'bg-green-400' 
                          : displayedContent.has(result.taskId) 
                            ? 'bg-yellow-400' 
                            : 'bg-slate-600'
                      }`} />
                      <span className="text-slate-300 truncate">{result.taskTitle}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {streamingResults.map((result) => {
                  const content = displayedContent.get(result.taskId) || '';
                  const isComplete = content.length === result.content.length;
                  
                  return (
                    <div key={result.taskId} className="bg-slate-800/30 rounded-lg border border-slate-700/50">
                      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getAgentColor(result.agent || '')} flex items-center justify-center`}>
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{result.taskTitle}</h4>
                            <p className="text-xs text-slate-400">{result.agent}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isComplete ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                          )}
                          <button
                            onClick={() => copyToClipboard(result.content)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                            title="Copy content"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <pre className="text-slate-200 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                          {content}
                          {!isComplete && isReplaying && (
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
        )}

        {activeTab === 'insights' && (
          <div className="p-6 overflow-y-auto">
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getAgentColor(insight.agent)} flex items-center justify-center flex-shrink-0`}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{insight.agent}</span>
                      <span className="text-xs text-slate-500">
                        {formatTimestamp(insight.timestamp)}
                      </span>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-slate-300">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="p-6">
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">Export & Share Options</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => exportResults('json')}
                    className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5 text-blue-400" />
                    <div className="text-left">
                      <div className="font-medium text-white">JSON Export</div>
                      <div className="text-xs text-slate-400">Structured data format</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => exportResults('csv')}
                    className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5 text-green-400" />
                    <div className="text-left">
                      <div className="font-medium text-white">CSV Export</div>
                      <div className="text-xs text-slate-400">Spreadsheet format</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => exportResults('pdf')}
                    className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5 text-red-400" />
                    <div className="text-left">
                      <div className="font-medium text-white">PDF Report</div>
                      <div className="text-xs text-slate-400">Formatted document</div>
                    </div>
                  </button>
                </div>

                {onStartNewChat && (
                  <div className="pt-4 border-t border-slate-700/50">
                    <h4 className="font-medium text-white mb-2">Continue Working</h4>
                    <button
                      onClick={onStartNewChat}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Start New Chat Session
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}