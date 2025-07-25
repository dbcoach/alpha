import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Bot,
  Loader2,
  Download
} from 'lucide-react';
import { realTimeStreamingService, RealStreamChunk, StreamingTask } from '../../services/realTimeStreamingService';
import { useRealTimeGeneration } from '../../hooks/useRealTimeGeneration';

interface RealStreamingInterfaceProps {
  prompt: string;
  dbType: string;
  onComplete?: (results: Map<string, string>) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function RealStreamingInterface({ 
  prompt, 
  dbType, 
  onComplete, 
  onError, 
  className = ''
}: RealStreamingInterfaceProps) {
  const [taskContents, setTaskContents] = useState<Map<string, string>>(new Map());
  const [streamingChunks, setStreamingChunks] = useState<string>('');
  const [currentChunkTaskId, setCurrentChunkTaskId] = useState<string>('');
  
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const reasoningRef = useRef<HTMLDivElement>(null);

  const {
    isGenerating,
    currentTask,
    tasks,
    error,
    startGeneration,
    reset
  } = useRealTimeGeneration({
    onTaskStart: (taskId, title, agent) => {
      console.log(`🚀 Task started: ${title} by ${agent}`);
      setCurrentChunkTaskId(taskId);
      setStreamingChunks('');
    },
    onContentChunk: (taskId, chunk) => {
      if (taskId === currentChunkTaskId) {
        setStreamingChunks(prev => prev + chunk);
      }
      
      // Scroll to latest content
      const contentEl = contentRefs.current.get(taskId);
      if (contentEl) {
        contentEl.scrollTop = contentEl.scrollHeight;
      }
    },
    onTaskComplete: (taskId, fullContent) => {
      console.log(`✅ Task completed: ${taskId}`);
      setTaskContents(prev => new Map(prev.set(taskId, fullContent)));
      setStreamingChunks('');
      setCurrentChunkTaskId('');
    },
    onSessionComplete: (allContent) => {
      console.log('🎉 Session completed');
      onComplete?.(allContent);
    },
    onError: (errorMessage) => {
      console.error('❌ Generation error:', errorMessage);
      onError?.(errorMessage);
    }
  });

  // Auto-start generation when component mounts
  useEffect(() => {
    if (prompt && dbType && !isGenerating && tasks.length === 0) {
      startGeneration(prompt, dbType);
    }
  }, [prompt, dbType, startGeneration, isGenerating, tasks.length]);

  // Auto-scroll reasoning panel
  useEffect(() => {
    if (reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [streamingChunks, currentTask]);

  const handleExport = () => {
    const exportData = {\n      prompt,\n      dbType,\n      timestamp: new Date().toISOString(),\n      tasks: tasks.map(task => ({\n        id: task.id,\n        title: task.title,\n        agent: task.agent,\n        status: task.status,\n        content: taskContents.get(task.id) || ''\n      }))\n    };\n    \n    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });\n    const url = URL.createObjectURL(blob);\n    const a = document.createElement('a');\n    a.href = url;\n    a.download = `database-design-${Date.now()}.json`;\n    document.body.appendChild(a);\n    a.click();\n    document.body.removeChild(a);\n    URL.revokeObjectURL(url);\n  };\n\n  return (\n    <div className={`flex h-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden ${className}`}>\n      {/* Left Panel - AI Reasoning */}\n      <div className=\"w-1/3 border-r border-slate-700/50 bg-slate-900/30\">\n        <div className=\"p-4 border-b border-slate-700/50\">\n          <div className=\"flex items-center gap-2\">\n            <Bot className=\"w-5 h-5 text-blue-400\" />\n            <h3 className=\"font-semibold text-slate-200\">AI Reasoning</h3>\n            {isGenerating && (\n              <Loader2 className=\"w-4 h-4 text-blue-400 animate-spin\" />\n            )}\n          </div>\n          {currentTask && (\n            <p className=\"text-sm text-slate-400 mt-1\">\n              {currentTask.agent} • {currentTask.title}\n            </p>\n          )}\n        </div>\n        \n        <div \n          ref={reasoningRef}\n          className=\"p-4 h-full overflow-y-auto text-sm text-slate-300 leading-relaxed\"\n        >\n          {streamingChunks && (\n            <div className=\"whitespace-pre-wrap\">\n              {streamingChunks}\n              {isGenerating && currentChunkTaskId && (\n                <span className=\"inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1\" />\n              )}\n            </div>\n          )}\n          \n          {!isGenerating && !streamingChunks && tasks.length === 0 && (\n            <div className=\"text-center text-slate-500 mt-8\">\n              <Bot className=\"w-12 h-12 mx-auto mb-4 opacity-50\" />\n              <p>AI reasoning will appear here during generation</p>\n            </div>\n          )}\n          \n          {error && (\n            <div className=\"bg-red-900/30 border border-red-700/50 rounded-lg p-4 mt-4\">\n              <div className=\"flex items-center gap-2 text-red-400\">\n                <AlertTriangle className=\"w-5 h-5\" />\n                <span className=\"font-medium\">Error</span>\n              </div>\n              <p className=\"text-sm text-red-300 mt-2\">{error}</p>\n            </div>\n          )}\n        </div>\n      </div>\n\n      {/* Right Panel - Generated Content */}\n      <div className=\"flex-1 flex flex-col\">\n        <div className=\"p-4 border-b border-slate-700/50 bg-slate-800/30\">\n          <div className=\"flex items-center justify-between\">\n            <div>\n              <h3 className=\"font-semibold text-slate-200\">Generated Database Design</h3>\n              <p className=\"text-sm text-slate-400\">\n                {tasks.filter(t => t.status === 'completed').length} of {tasks.length} tasks completed\n              </p>\n            </div>\n            \n            {tasks.length > 0 && (\n              <button\n                onClick={handleExport}\n                className=\"flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors\"\n              >\n                <Download className=\"w-4 h-4\" />\n                Export\n              </button>\n            )}\n          </div>\n        </div>\n        \n        <div className=\"flex-1 overflow-y-auto\">\n          {tasks.map((task) => {\n            const content = taskContents.get(task.id) || '';\n            const isActive = currentTask?.id === task.id;\n            const isCompleted = task.status === 'completed';\n            \n            return (\n              <div key={task.id} className=\"border-b border-slate-700/30 last:border-b-0\">\n                <div className=\"p-4\">\n                  <div className=\"flex items-center gap-3 mb-3\">\n                    <div className=\"flex items-center gap-2\">\n                      {isCompleted ? (\n                        <CheckCircle className=\"w-5 h-5 text-green-400\" />\n                      ) : isActive ? (\n                        <Loader2 className=\"w-5 h-5 text-blue-400 animate-spin\" />\n                      ) : (\n                        <Clock className=\"w-5 h-5 text-slate-500\" />\n                      )}\n                      <h4 className=\"font-medium text-slate-200\">{task.title}</h4>\n                    </div>\n                    \n                    <div className=\"text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded\">\n                      {task.agent}\n                    </div>\n                  </div>\n                  \n                  {content && (\n                    <div \n                      ref={(el) => el && contentRefs.current.set(task.id, el)}\n                      className=\"bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300 leading-relaxed max-h-96 overflow-y-auto\"\n                    >\n                      <div className=\"whitespace-pre-wrap\">{content}</div>\n                      {isActive && streamingChunks && currentChunkTaskId === task.id && (\n                        <div className=\"whitespace-pre-wrap\">\n                          {streamingChunks}\n                          <span className=\"inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1\" />\n                        </div>\n                      )}\n                    </div>\n                  )}\n                  \n                  {isActive && !content && !streamingChunks && (\n                    <div className=\"bg-slate-800/30 rounded-lg p-4 text-center text-slate-500\">\n                      <Loader2 className=\"w-6 h-6 animate-spin mx-auto mb-2\" />\n                      <p>Generating content...</p>\n                    </div>\n                  )}\n                </div>\n              </div>\n            );\n          })}\n          \n          {tasks.length === 0 && !isGenerating && (\n            <div className=\"p-8 text-center text-slate-500\">\n              <Bot className=\"w-16 h-16 mx-auto mb-4 opacity-30\" />\n              <p className=\"text-lg mb-2\">Ready to Generate</p>\n              <p className=\"text-sm\">Your database design will appear here</p>\n            </div>\n          )}\n        </div>\n      </div>\n    </div>\n  );\n}\n\nexport default RealStreamingInterface;\n