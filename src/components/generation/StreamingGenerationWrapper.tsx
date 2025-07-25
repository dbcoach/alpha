// Streaming Generation Wrapper - Manages the complete workflow from streaming to final display
import React, { useEffect, useState } from 'react';
import { useStreamingToGeneration } from '../../hooks/useStreamingToGeneration';
import { FinalGenerationDisplay } from './FinalGenerationDisplay';
import { type GenerationPhase } from '../../services/resultAggregationService';

interface StreamingGenerationWrapperProps {
  sessionId?: string;
  isActive?: boolean;
  onComplete?: (results: GenerationPhase[]) => void;
  onError?: (error: string) => void;
  streamingComponent?: React.ReactNode;
  className?: string;
}

export const StreamingGenerationWrapper: React.FC<StreamingGenerationWrapperProps> = ({
  sessionId,
  isActive = false,
  onComplete,
  onError,
  streamingComponent,
  className = ''
}) => {
  const [showTransition, setShowTransition] = useState(false);

  const {
    isStreaming,
    isTransitioning,
    isComplete,
    streamingResults,
    finalResults,
    error,
    startStreaming,
    updateStreamingContent,
    completeStreaming,
    reset
  } = useStreamingToGeneration({
    onStreamingStart: () => {
      console.log('🚀 Streaming started');
    },
    onStreamingProgress: (taskId, content) => {
      console.log('📝 Streaming progress:', taskId, content.length, 'chars');
    },
    onTransitionStart: () => {
      console.log('🔄 Transitioning from streaming to generation...');
      setShowTransition(true);
    },
    onGenerationReady: (results) => {
      console.log('✅ Generation results ready:', results.length, 'phases');
      setShowTransition(false);
      onComplete?.(results);
    },
    onError: (errorMessage) => {
      console.error('❌ Streaming to generation error:', errorMessage);
      setShowTransition(false);
      onError?.(errorMessage);
    }
  });

  // Start streaming when session becomes active
  useEffect(() => {
    if (isActive && sessionId && !isStreaming && !isComplete) {
      startStreaming(sessionId);
    }
  }, [isActive, sessionId, isStreaming, isComplete, startStreaming]);

  // Reset when session changes
  useEffect(() => {
    if (!isActive || !sessionId) {
      reset();
      setShowTransition(false);
    }
  }, [sessionId, isActive, reset]);

  // Auto-complete streaming when results are available
  useEffect(() => {
    if (isStreaming && streamingResults.size > 0) {
      // Check if streaming appears complete (no new content for a while)
      const timer = setTimeout(() => {
        if (isStreaming && !isTransitioning) {
          console.log('🔄 Auto-completing streaming transition...');
          completeStreaming(streamingResults).catch(console.error);
        }
      }, 2000); // Wait 2 seconds after last update

      return () => clearTimeout(timer);
    }
  }, [streamingResults, isStreaming, isTransitioning, completeStreaming]);

  // Render different states
  if (error) {
    return (
      <div className={`streaming-generation-wrapper ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">❌</span>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Generation Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showTransition || isTransitioning) {
    return (
      <div className={`streaming-generation-wrapper ${className}`}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Preparing Generation Results
            </h3>
            <p className="text-blue-700">
              Processing streaming content and formatting for display...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete && finalResults) {
    return (
      <div className={`streaming-generation-wrapper ${className}`}>
        <FinalGenerationDisplay 
          phases={finalResults}
          showMetadata={true}
        />
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className={`streaming-generation-wrapper ${className}`}>
        {/* Show streaming component if provided */}
        {streamingComponent || (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="animate-pulse flex space-x-1 mr-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Generating Database...
              </h3>
            </div>
            
            {/* Show streaming content preview */}
            {streamingResults.size > 0 && (
              <div className="space-y-2">
                {Array.from(streamingResults.entries()).map(([taskId, content]) => (
                  <div key={taskId} className="bg-white border rounded p-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {taskId}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {content.substring(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default state - waiting to start
  return (
    <div className={`streaming-generation-wrapper ${className}`}>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">
          Ready to start generation...
        </p>
      </div>
    </div>
  );
};

export default StreamingGenerationWrapper;