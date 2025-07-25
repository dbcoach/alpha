import { useState, useEffect, useRef, useCallback } from 'react';
import { realTimeStreamingService, RealStreamChunk, StreamingTask } from '../services/realTimeStreamingService';

export interface UseRealTimeGenerationOptions {
  onTaskStart?: (taskId: string, title: string, agent: string) => void;
  onContentChunk?: (taskId: string, chunk: string) => void;
  onTaskComplete?: (taskId: string, fullContent: string) => void;
  onSessionComplete?: (allContent: Map<string, string>) => void;
  onError?: (error: string) => void;
}

export interface RealTimeGenerationState {
  isGenerating: boolean;
  currentTask: StreamingTask | null;
  tasks: StreamingTask[];
  error: string | null;
  sessionId: string | null;
}

export function useRealTimeGeneration(options: UseRealTimeGenerationOptions = {}) {
  const {
    onTaskStart,
    onContentChunk,
    onTaskComplete,
    onSessionComplete,
    onError
  } = options;

  const [state, setState] = useState<RealTimeGenerationState>({
    isGenerating: false,
    currentTask: null,
    tasks: [],
    error: null,
    sessionId: null
  });

  const contentBuffers = useRef<Map<string, string>>(new Map());

  // Handle streaming chunks
  const handleStreamChunk = useCallback((chunk: RealStreamChunk) => {
    switch (chunk.type) {
      case 'task_start':
        setState(prev => ({
          ...prev,
          currentTask: {
            id: chunk.taskId,
            title: chunk.taskTitle || 'Unknown Task',
            agent: chunk.agent || 'Unknown Agent',
            status: 'active',
            content: '',
            startTime: new Date()
          },
          error: null
        }));
        
        contentBuffers.current.set(chunk.taskId, '');
        onTaskStart?.(chunk.taskId, chunk.taskTitle || 'Unknown Task', chunk.agent || 'Unknown Agent');
        break;

      case 'content_chunk':
        if (chunk.content) {
          const currentContent = contentBuffers.current.get(chunk.taskId) || '';
          const newContent = currentContent + chunk.content;
          contentBuffers.current.set(chunk.taskId, newContent);
          
          setState(prev => ({
            ...prev,
            currentTask: prev.currentTask ? {
              ...prev.currentTask,
              content: newContent
            } : null
          }));
          
          onContentChunk?.(chunk.taskId, chunk.content);
        }
        break;

      case 'task_complete':
        const fullContent = contentBuffers.current.get(chunk.taskId) || '';
        
        setState(prev => {
          const updatedTasks = [...prev.tasks];
          const taskIndex = updatedTasks.findIndex(t => t.id === chunk.taskId);
          
          if (taskIndex >= 0) {
            updatedTasks[taskIndex] = {
              ...updatedTasks[taskIndex],
              status: 'completed',
              content: fullContent,
              endTime: new Date()
            };
          } else {
            updatedTasks.push({
              id: chunk.taskId,
              title: prev.currentTask?.title || 'Completed Task',
              agent: prev.currentTask?.agent || 'Unknown Agent',
              status: 'completed',
              content: fullContent,
              startTime: prev.currentTask?.startTime || new Date(),
              endTime: new Date()
            });
          }
          
          return {
            ...prev,
            tasks: updatedTasks,
            currentTask: null
          };
        });
        
        onTaskComplete?.(chunk.taskId, fullContent);
        break;

      case 'session_complete':
        setState(prev => ({
          ...prev,
          isGenerating: false,
          currentTask: null
        }));
        
        const allContent = realTimeStreamingService.getAllTasksContent();
        onSessionComplete?.(allContent);
        break;

      case 'error':
        const errorMessage = chunk.content || 'Unknown error occurred';
        setState(prev => ({
          ...prev,
          isGenerating: false,
          currentTask: null,
          error: errorMessage
        }));
        
        onError?.(errorMessage);
        break;
    }
  }, [onTaskStart, onContentChunk, onTaskComplete, onSessionComplete, onError]);

  // Set up event listeners
  useEffect(() => {
    realTimeStreamingService.on('chunk', handleStreamChunk);
    
    return () => {
      realTimeStreamingService.removeAllListeners('chunk');
    };
  }, [handleStreamChunk]);

  // Start real-time generation
  const startGeneration = useCallback(async (prompt: string, dbType: string) => {
    try {
      setState(prev => ({
        ...prev,
        isGenerating: true,
        error: null,
        tasks: [],
        sessionId: `session_${Date.now()}`
      }));
      
      contentBuffers.current.clear();
      
      await realTimeStreamingService.startRealStreamingGeneration(prompt, dbType);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));
      
      onError?.(errorMessage);
    }
  }, [onError]);

  // Get content for a specific task
  const getTaskContent = useCallback((taskId: string): string => {
    return contentBuffers.current.get(taskId) || realTimeStreamingService.getTaskContent(taskId);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      currentTask: null,
      tasks: [],
      error: null,
      sessionId: null
    });
    contentBuffers.current.clear();
    realTimeStreamingService.destroy();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realTimeStreamingService.destroy();
    };
  }, []);

  return {
    ...state,
    startGeneration,
    getTaskContent,
    reset
  };
}

export default useRealTimeGeneration;
