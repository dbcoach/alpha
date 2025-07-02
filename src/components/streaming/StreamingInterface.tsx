import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  Zap, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Settings,
  User,
  Bot,
  Loader2
} from 'lucide-react';
import { streamingService, StreamingTask, StreamChunk } from '../../services/streamingService';
import { streamingDataCapture } from '../../services/streamingDataCapture';
import { StreamingErrorBoundary } from './StreamingErrorBoundary';

import { SavedConversation } from '../../services/conversationStorage';

interface StreamingInterfaceProps {
  prompt: string;
  dbType: string;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
  className?: string;
  isViewingMode?: boolean;
  existingConversation?: SavedConversation;
}

export function StreamingInterface({ 
  prompt, 
  dbType, 
  onComplete, 
  onError, 
  className = '',
  isViewingMode = false,
  existingConversation
}: StreamingInterfaceProps) {
  const [tasks, setTasks] = useState<StreamingTask[]>([]);
  const [activeTask, setActiveTask] = useState<StreamingTask | null>(null);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [streamingSpeed, setStreamingSpeed] = useState(40);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [taskContent, setTaskContent] = useState<Map<string, string>>(new Map());
  const [insights, setInsights] = useState<Array<{ agent: string; message: string; timestamp: Date }>>([]);
  
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cursorRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const insightsEndRef = useRef<HTMLDivElement>(null);

  // Initialize streaming session or load existing data
  useEffect(() => {
    const initializeInterface = async () => {
      if (isViewingMode && existingConversation) {
        // Load existing conversation data
        console.log('🔍 Loading existing conversation in viewing mode:', existingConversation);
        try {
          // Create tasks from existing conversation
          const existingTasks: StreamingTask[] = existingConversation.tasks.map(task => ({
            id: task.id,
            title: task.title,
            agent: task.agent,
            status: task.status as 'pending' | 'active' | 'completed' | 'error',
            progress: task.progress,
            estimatedTime: 0,
            subtasks: []
          }));
          
          console.log('📋 Setting tasks:', existingTasks);
          setTasks(existingTasks);
          setTotalProgress(100);
          setIsPlaying(false);
          
          // Load content for each task
          const contentMap = new Map<string, string>();
          Object.entries(existingConversation.generatedContent).forEach(([taskId, content]) => {
            contentMap.set(taskId, content);
          });
          console.log('📝 Setting task content:', contentMap);
          setTaskContent(contentMap);
          
          // Load insights
          const formattedInsights = existingConversation.insights.map(insight => ({
            agent: insight.agent,
            message: insight.message,
            timestamp: new Date(insight.timestamp)
          }));
          console.log('💡 Setting insights:', formattedInsights);
          setInsights(formattedInsights);
          
        } catch (error) {
          console.error('Error loading existing conversation:', error);
          onError?.('Failed to load conversation data');
        }
        return; // Don't set up streaming service for viewing mode
      }

      // Start new streaming session (only if not in viewing mode)
      const sessionId = `session_${Date.now()}`;
      const predefinedTasks = [
        {
          title: 'Requirements Analysis',
          agent: 'Requirements Analyst',
          status: 'pending' as const,
          progress: 0,
          estimatedTime: 15,
          subtasks: [
              { id: 'analyze_domain', title: 'Analyzing domain context', status: 'pending' as const, progress: 0 },
              { id: 'extract_requirements', title: 'Extracting requirements', status: 'pending' as const, progress: 0 },
              { id: 'classify_complexity', title: 'Classifying complexity', status: 'pending' as const, progress: 0 }
            ]
          },
          {
            title: 'Schema Design',
            agent: 'Schema Architect',
            status: 'pending' as const,
            progress: 0,
            estimatedTime: 25,
            subtasks: [
              { id: 'design_entities', title: 'Designing core entities', status: 'pending' as const, progress: 0 },
              { id: 'map_relationships', title: 'Mapping relationships', status: 'pending' as const, progress: 0 },
              { id: 'optimize_structure', title: 'Optimizing structure', status: 'pending' as const, progress: 0 }
            ]
          },
          {
            title: 'Implementation Package',
            agent: 'Implementation Specialist',
            status: 'pending' as const,
            progress: 0,
            estimatedTime: 20,
            subtasks: [
              { id: 'generate_sql', title: 'Generating SQL scripts', status: 'pending' as const, progress: 0 },
              { id: 'create_samples', title: 'Creating sample data', status: 'pending' as const, progress: 0 },
              { id: 'setup_apis', title: 'Setting up API examples', status: 'pending' as const, progress: 0 }
            ]
          },
          {
            title: 'Quality Assurance',
            agent: 'Quality Assurance',
            status: 'pending' as const,
            progress: 0,
            estimatedTime: 10,
            subtasks: [
              { id: 'validate_design', title: 'Validating design', status: 'pending' as const, progress: 0 },
              { id: 'performance_review', title: 'Performance review', status: 'pending' as const, progress: 0 },
              { id: 'security_audit', title: 'Security audit', status: 'pending' as const, progress: 0 }
            ]
          }
        ];

        streamingService.initializeSession(sessionId, predefinedTasks);
      }
    };
    
    initializeInterface();
    
    return () => {
      if (!isViewingMode) {
        streamingService.destroy();
      }
    };
  }, [isViewingMode, existingConversation, onError]);

  // Event listeners for streaming service (only for new sessions)
  useEffect(() => {
    if (isViewingMode) return; // Skip event listeners in viewing mode
    
    const handleSessionInitialized = (data: { tasks: StreamingTask[] }) => {
      setTasks(data.tasks);
    };

    const handleTaskStarted = (data: { taskId: string; task: StreamingTask }) => {
      setActiveTask(data.task);
      setTasks(prev => prev.map(task => 
        task.id === data.taskId ? data.task : task
      ));
      
      // Add insight message
      setInsights(prev => [...prev, {
        agent: data.task.agent,
        message: `Starting ${data.task.title.toLowerCase()}...`,
        timestamp: new Date()
      }]);
    };

    const handleTaskProgress = (data: { taskId: string; progress: number; reasoning?: string }) => {
      setTasks(prev => prev.map(task => 
        task.id === data.taskId 
          ? { ...task, progress: data.progress }
          : task
      ));
      
      if (data.reasoning) {
        const task = tasks.find(t => t.id === data.taskId);
        if (task) {
          setInsights(prev => [...prev, {
            agent: task.agent,
            message: data.reasoning!,
            timestamp: new Date()
          }]);
        }
      }
    };

    const handleCharacterStreamed = (data: { taskId: string; character: string; rendered: string }) => {
      setTaskContent(prev => {
        const newMap = new Map(prev);
        newMap.set(data.taskId, data.rendered);
        return newMap;
      });
      
      // Update cursor position
      const cursorRef = cursorRefs.current.get(data.taskId);
      if (cursorRef) {
        cursorRef.style.display = 'inline';
      }
    };

    const handleTaskCompleted = (data: { taskId: string; task: StreamingTask }) => {
      setTasks(prev => prev.map(task => 
        task.id === data.taskId ? data.task : task
      ));
      
      // Hide cursor for completed task
      const cursorRef = cursorRefs.current.get(data.taskId);
      if (cursorRef) {
        cursorRef.style.display = 'none';
      }
      
      setInsights(prev => [...prev, {
        agent: data.task.agent,
        message: `${data.task.title} completed successfully!`,
        timestamp: new Date()
      }]);
    };

    const handleSessionCompleted = () => {
      setActiveTask(null);
      setTotalProgress(100);
      setIsPlaying(false);
      
      setInsights(prev => [...prev, {
        agent: 'DB.Coach',
        message: '✅ Database design complete! All components generated successfully.',
        timestamp: new Date()
      }]);

      onComplete?.(Array.from(taskContent.entries()));
    };

    const handleStreamingPaused = () => {
      setIsPlaying(false);
    };

    const handleStreamingResumed = () => {
      setIsPlaying(true);
    };

    const handleInsightMessage = (data: { agent: string; message: string; timestamp: Date }) => {
      setInsights(prev => [...prev, data]);
    };

    if (!isViewingMode) {
      // Subscribe to events only for new streaming sessions
      streamingService.on('session_initialized', handleSessionInitialized);
      streamingService.on('task_started', handleTaskStarted);
      streamingService.on('task_progress', handleTaskProgress);
      streamingService.on('character_streamed', handleCharacterStreamed);
      streamingService.on('task_completed', handleTaskCompleted);
      streamingService.on('session_completed', handleSessionCompleted);
      streamingService.on('streaming_paused', handleStreamingPaused);
      streamingService.on('streaming_resumed', handleStreamingResumed);
      streamingService.on('insight_message', handleInsightMessage);
    }

    // Initialize the interface
    initializeInterface();

    return () => {
      if (!isViewingMode) {
        streamingService.removeAllListeners();
      }
    };
  }, [isViewingMode, existingConversation]);

  // Auto-scroll insights to bottom
  useEffect(() => {
    if (insightsEndRef.current) {
      insightsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [insights]);

  // Update progress and time estimates (only for new sessions)
  useEffect(() => {
    if (isViewingMode) return; // Skip progress updates in viewing mode
    
    const interval = setInterval(() => {
      const status = streamingService.getSessionStatus();
      setTotalProgress(status.totalProgress);
      setEstimatedTimeRemaining(status.estimatedTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [isViewingMode]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      streamingService.pauseStreaming();
    } else {
      streamingService.resumeStreaming();
    }
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    streamingService.pauseStreaming();
    onComplete?.(Array.from(taskContent.entries()));
  }, [taskContent, onComplete]);

  const handleSpeedChange = useCallback((speed: number) => {
    setStreamingSpeed(speed);
    streamingService.setStreamingSpeed(speed);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: StreamingTask['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'active': return <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getAgentColor = (agent: string): string => {
    const colors = {
      'Requirements Analyst': 'from-blue-600 to-cyan-600',
      'Schema Architect': 'from-purple-600 to-pink-600',
      'Implementation Specialist': 'from-green-600 to-emerald-600',
      'Quality Assurance': 'from-orange-600 to-red-600'
    };
    return colors[agent as keyof typeof colors] || 'from-slate-600 to-slate-700';
  };

  return (
    <StreamingErrorBoundary>
      <div className={`h-full bg-slate-900/20 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isViewingMode ? 'bg-blue-400' : 'bg-green-400 animate-pulse'}`}></div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isViewingMode ? 'Database Generation Results' : 'DB.Coach Live Generation'}
            </h2>
            <p className="text-slate-400 text-sm">
              {isViewingMode ? `Viewing ${dbType} database generation` : `Creating ${dbType} database`}: "{prompt.substring(0, 50)}..."
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-400">
            ETA: {formatTime(estimatedTimeRemaining)}
          </div>
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <span className="text-sm text-slate-300 font-mono">
            {Math.round(totalProgress)}%
          </span>
        </div>
      </div>

      <div className="flex h-full">
        {/* Left Side: AI Agent Reasoning Stream */}
        <div className="w-1/2 border-r border-slate-700/50 bg-slate-800/20 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              AI Agent Reasoning
            </h3>
            <p className="text-sm text-slate-400 mt-1">Watch agents think and make decisions</p>
          </div>
          
          {/* Task Progress Overview */}
          <div className="p-4 border-b border-slate-700/50 bg-slate-800/10">
            <div className="grid grid-cols-2 gap-3">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    task.status === 'active' 
                      ? 'bg-yellow-500/10 border-yellow-500/30' 
                      : task.status === 'completed'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-slate-700/30 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(task.status)}
                    <span className="text-sm font-medium text-white truncate">{task.title}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live AI Reasoning Stream */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getAgentColor(insight.agent)} flex items-center justify-center flex-shrink-0`}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{insight.agent}</span>
                      <span className="text-xs text-slate-500">
                        {insight.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-slate-300 leading-relaxed">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator for active agent */}
              {activeTask && (
                <div className="flex items-start gap-3 text-sm">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getAgentColor(activeTask.agent)} flex items-center justify-center flex-shrink-0`}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{activeTask.agent}</span>
                      <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-yellow-500/30">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-yellow-300 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={insightsEndRef} />
            </div>
          </div>
        </div>

        {/* Right Side: Generated Results */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-green-400" />
              Generated Database Design
            </h3>
            <p className="text-sm text-slate-400 mt-1">Real-time content generation</p>
          </div>

          {/* Live Content Generation */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-6">
              {tasks.map((task) => {
                const content = taskContent.get(task.id) || '';
                
                return (
                  <div key={task.id} className={`transition-all duration-300 ${
                    task.status === 'pending' ? 'opacity-30' : 'opacity-100'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getAgentColor(task.agent)} flex items-center justify-center`}>
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <h4 className="font-semibold text-white">{task.title}</h4>
                      {task.status === 'active' && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-xs text-green-400">Generating...</span>
                        </div>
                      )}
                      {task.status === 'completed' && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-green-400">Complete</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 min-h-[100px]">
                      {content ? (
                        <div 
                          ref={(el) => {
                            if (el) contentRefs.current.set(task.id, el);
                          }}
                          className="text-slate-200 whitespace-pre-wrap font-mono text-sm leading-relaxed"
                        >
                          {content}
                          {task.status === 'active' && (
                            <span 
                              ref={(el) => {
                                if (el) cursorRefs.current.set(task.id, el);
                              }}
                              className="inline-block w-2 h-5 bg-green-400 animate-pulse ml-1"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-20 text-slate-500">
                          {task.status === 'pending' ? (
                            <span className="text-sm">Waiting for {task.agent}...</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Preparing content...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="border-t border-slate-700/50 bg-slate-800/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!isViewingMode && (
                  <>
                    <button
                      onClick={handlePlayPause}
                      className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    
                    <button
                      onClick={handleStop}
                      className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => onComplete?.(Array.from(taskContent.entries()))}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {isViewingMode ? 'Export Results' : 'Export Draft'}
                </button>
              </div>
              
              {!isViewingMode && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-300">Speed:</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={streamingSpeed}
                    onChange={(e) => handleSpeedChange(Number(e.target.value))}
                    className="w-24 accent-purple-500"
                  />
                  <span className="text-sm text-slate-400 font-mono w-8">
                    {(streamingSpeed / 40).toFixed(1)}x
                  </span>
                </div>
              )}
              
              {isViewingMode && (
                <div className="text-sm text-slate-400">
                  ✅ Generation completed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </StreamingErrorBoundary>
  );
}