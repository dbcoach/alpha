// Hook for managing the clean transition from streaming to generation display
import { useState, useCallback, useRef } from 'react';
import { resultAggregationService, type FinalGenerationResult, type GenerationPhase } from '../services/resultAggregationService';
import { streamingService, type SessionCompletionResult } from '../services/streamingService';

export interface StreamingToGenerationState {
  isStreaming: boolean;
  isTransitioning: boolean;
  isComplete: boolean;
  streamingResults: Map<string, string>; // Real-time streaming content
  finalResults: GenerationPhase[] | null; // Clean, formatted final results
  error: string | null;
}

export interface UseStreamingToGenerationOptions {
  onStreamingStart?: () => void;
  onStreamingProgress?: (taskId: string, content: string) => void;
  onTransitionStart?: () => void;
  onGenerationReady?: (results: GenerationPhase[]) => void;
  onError?: (error: string) => void;
}

export function useStreamingToGeneration(options: UseStreamingToGenerationOptions = {}) {
  const {
    onStreamingStart,
    onStreamingProgress,
    onTransitionStart,
    onGenerationReady,
    onError
  } = options;

  const [state, setState] = useState<StreamingToGenerationState>({
    isStreaming: false,
    isTransitioning: false,
    isComplete: false,
    streamingResults: new Map(),
    finalResults: null,
    error: null
  });

  const currentSessionRef = useRef<string | null>(null);

  /**
   * Start streaming phase
   */
  const startStreaming = useCallback((sessionId: string) => {
    currentSessionRef.current = sessionId;
    
    setState(prev => ({
      ...prev,
      isStreaming: true,
      isTransitioning: false,
      isComplete: false,
      streamingResults: new Map(),
      finalResults: null,
      error: null
    }));

    onStreamingStart?.();
  }, [onStreamingStart]);

  /**
   * Update streaming content (real-time)
   */
  const updateStreamingContent = useCallback((taskId: string, content: string) => {
    setState(prev => {
      const newStreamingResults = new Map(prev.streamingResults);
      newStreamingResults.set(taskId, content);
      
      return {
        ...prev,
        streamingResults: newStreamingResults
      };
    });

    onStreamingProgress?.(taskId, content);
  }, [onStreamingProgress]);

  /**
   * Complete streaming and transition to final generation display
   */
  const completeStreaming = useCallback(async (
    streamingResults?: Map<string, string>
  ): Promise<GenerationPhase[]> => {
    if (!currentSessionRef.current) {
      const error = 'No active streaming session to complete';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      throw new Error(error);
    }

    setState(prev => ({
      ...prev,
      isStreaming: false,
      isTransitioning: true
    }));

    onTransitionStart?.();

    try {
      // Get the completion result from streaming service
      const completionResult: SessionCompletionResult = streamingService.completeSession();
      
      // Convert streaming results to clean, formatted final results
      const finalGenerationResult: FinalGenerationResult = resultAggregationService.convertStreamingToGeneration(
        completionResult,
        {
          cleanContent: true,
          includeMetadata: true,
          formatForDisplay: true
        }
      );

      // Update state with final results
      setState(prev => ({
        ...prev,
        isTransitioning: false,
        isComplete: true,
        finalResults: finalGenerationResult.phases,
        error: null
      }));

      console.log('✅ Streaming to Generation transition completed:', {
        sessionId: finalGenerationResult.sessionId,
        phases: finalGenerationResult.phases.length,
        duration: `${Math.round(finalGenerationResult.metadata.totalDuration / 1000)}s`
      });

      onGenerationReady?.(finalGenerationResult.phases);
      return finalGenerationResult.phases;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete streaming transition';
      
      setState(prev => ({
        ...prev,
        isTransitioning: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
      throw error;
    }
  }, [onTransitionStart, onGenerationReady, onError]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    currentSessionRef.current = null;
    setState({
      isStreaming: false,
      isTransitioning: false,
      isComplete: false,
      streamingResults: new Map(),
      finalResults: null,
      error: null
    });
  }, []);

  /**
   * Force complete streaming (emergency use)
   */
  const forceComplete = useCallback(() => {
    if (!currentSessionRef.current) return null;

    console.warn('🚨 Force completing streaming transition');
    
    const finalResult = resultAggregationService.forceStreamingComplete(currentSessionRef.current);
    
    if (finalResult) {
      setState(prev => ({
        ...prev,
        isStreaming: false,
        isTransitioning: false,
        isComplete: true,
        finalResults: finalResult.phases,
        error: null
      }));

      onGenerationReady?.(finalResult.phases);
      return finalResult.phases;
    }

    return null;
  }, [onGenerationReady]);

  /**
   * Get streaming status for current session
   */
  const getStreamingStatus = useCallback(() => {
    if (!currentSessionRef.current) return null;
    return resultAggregationService.getStreamingStatus(currentSessionRef.current);
  }, []);

  return {
    // State
    ...state,
    currentSessionId: currentSessionRef.current,
    
    // Actions
    startStreaming,
    updateStreamingContent,
    completeStreaming,
    reset,
    forceComplete,
    getStreamingStatus,
    
    // Computed
    hasStreamingContent: state.streamingResults.size > 0,
    hasFinalResults: state.finalResults !== null && state.finalResults.length > 0,
    isActive: state.isStreaming || state.isTransitioning
  };
}

export default useStreamingToGeneration;