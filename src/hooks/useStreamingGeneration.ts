import { useEffect, useRef, useCallback } from 'react';
import { useGeneration } from '../context/GenerationContext';
import { streamingService, type SessionCompletionResult, type FinalTaskResult } from '../services/streamingService';
import { enhancedDBCoachService, GenerationProgress as DBCoachProgress } from '../services/enhancedDBCoachService';

export interface UseStreamingGenerationOptions {
  enableStreaming?: boolean;
  onTaskStart?: (taskId: string, agent: string) => void;
  onTaskProgress?: (taskId: string, content: string) => void;
  onTaskComplete?: (taskId: string, content: string) => void;
  onStreamingComplete?: (results: Map<string, string>) => void;
}

export function useStreamingGeneration(options: UseStreamingGenerationOptions = {}) {
  const { state, startGeneration: originalStartGeneration } = useGeneration();
  const {
    enableStreaming = true,
    onTaskStart,
    onTaskProgress,
    onTaskComplete,
    onStreamingComplete
  } = options;

  const currentSessionRef = useRef<string | null>(null);
  const taskMappingRef = useRef<Map<string, string>>(new Map());

  // Handle DBCoach progress updates
  const handleDBCoachProgress = useCallback((progress: DBCoachProgress) => {
    if (!enableStreaming || !currentSessionRef.current) {
      return;
    }

    const sessionId = currentSessionRef.current;
    const taskId = `${sessionId}_${progress.step}`;
    
    // Start task if not already started
    if (!taskMappingRef.current.has(progress.step)) {
      streamingService.startTask(taskId, getTaskTitle(progress.step), progress.agent);
      taskMappingRef.current.set(progress.step, taskId);
      onTaskStart?.(taskId, progress.agent);
    }
    
    // Add reasoning as content
    if (progress.reasoning) {
      streamingService.addTaskContent(taskId, `${progress.reasoning}\n\n`);
      onTaskProgress?.(taskId, progress.reasoning);
    }

    // Complete task if this is a completion step
    if (progress.isComplete || progress.currentStep === progress.totalSteps || progress.step === 'validation') {
      streamingService.completeTask(taskId);
      onTaskComplete?.(taskId, streamingService.getTaskContent(taskId));
    }
  }, [enableStreaming, onTaskStart, onTaskProgress, onTaskComplete]);

  // Get user-friendly task titles
  const getTaskTitle = (step: string): string => {
    const titles = {
      'analysis': 'Requirements Analysis',
      'design': 'Schema Design', 
      'implementation': 'Implementation Package',
      'validation': 'Quality Assurance'
    };
    return titles[step as keyof typeof titles] || step;
  };

  // Enhanced generation with real streaming
  const startStreamingGeneration = useCallback(async (
    prompt: string, 
    dbType: string, 
    mode: 'standard' | 'dbcoach' = 'dbcoach'
  ) => {
    if (!enableStreaming) {
      return originalStartGeneration(prompt, dbType, mode);
    }

    const sessionId = `session_${Date.now()}`;
    currentSessionRef.current = sessionId;
    taskMappingRef.current.clear();

    try {
      streamingService.initializeSession(sessionId);

      // Start the enhanced DBCoach generation
      const steps = await enhancedDBCoachService.generateDatabaseDesign(
        prompt,
        { type: dbType as 'SQL' | 'NoSQL' | 'VectorDB' },
        handleDBCoachProgress
      );

      // Process completed steps
      for (const step of steps) {
        const taskId = taskMappingRef.current.get(step.type) || `${sessionId}_${step.type}`;
        
        // Add the final content
        streamingService.addTaskContent(taskId, step.content);
        
        // Complete the task
        streamingService.completeTask(taskId);
        onTaskComplete?.(taskId, step.content);
      }

      // Complete session and get properly formatted final results
      const completionResult: SessionCompletionResult = streamingService.completeSession();
      
      // Convert final results to the expected format for display
      const finalResults = new Map<string, string>();
      for (const [taskId, result] of completionResult.finalResults.entries()) {
        finalResults.set(taskId, result.content);
      }

      // Notify completion with clean, final results (no streaming artifacts)
      onStreamingComplete?.(finalResults);
      
      console.log('🎉 Streaming completed:', {
        sessionId: completionResult.sessionId,
        completed: completionResult.summary.completedTasks,
        total: completionResult.summary.totalTasks,
        duration: `${Math.round(completionResult.summary.totalDuration / 1000)}s`
      });
      
      return steps;

    } catch (error) {
      console.error('Streaming generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      streamingService.handleError(currentSessionRef.current || 'unknown', errorMessage);
      throw error;
    }
  }, [
    enableStreaming, 
    originalStartGeneration, 
    handleDBCoachProgress,
    onTaskStart,
    onTaskComplete,
    onStreamingComplete
  ]);

  const getStreamingStatus = useCallback(() => {
    if (!enableStreaming) {
      return null;
    }
    return streamingService.getSessionStatus();
  }, [enableStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (enableStreaming) {
        streamingService.destroy();
      }
    };
  }, [enableStreaming]);

  return {
    // Original generation context
    ...state,
    
    // Enhanced streaming functions
    startStreamingGeneration,
    getStreamingStatus,
    
    // Streaming state
    isStreamingEnabled: enableStreaming,
    currentSession: currentSessionRef.current
  };
}

export default useStreamingGeneration;