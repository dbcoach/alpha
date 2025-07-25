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

  // Auto-complete streaming when results are available and agents are healthy
  useEffect(() => {
    if (isStreaming && streamingResults.size > 0) {
      let timeoutId: NodeJS.Timeout;
      
      const checkAgentsAndComplete = async () => {
        try {
          // Import agent cleanup service dynamically to avoid circular imports
          const { agentCleanupService } = await import('../../services/agentCleanupService');
          
          // Perform health check to ensure agents are ready
          const healthChecks = await agentCleanupService.performHealthCheck();
          const activeAgents = healthChecks.filter(check => 
            check.status === 'healthy' || check.status === 'stuck' || check.status === 'orphaned'
          );
          
          // Only proceed if no agents are actively processing or if they've been cleaned up
          if (activeAgents.length === 0 || activeAgents.every(agent => agent.status !== 'healthy')) {
            if (isStreaming && !isTransitioning) {
              console.log('🔄 Auto-completing streaming transition with clean agents...');
              completeStreaming(streamingResults).catch(console.error);
            }
          } else {
            // Wait a bit longer if agents are still healthy and working
            console.log(`⏳ Waiting for ${activeAgents.length} agents to complete...`);
            timeoutId = setTimeout(checkAgentsAndComplete, 3000);
          }
        } catch (error) {
          console.warn('⚠️ Agent health check failed, proceeding with completion:', error);
          if (isStreaming && !isTransitioning) {
            completeStreaming(streamingResults).catch(console.error);
          }
        }
      };

      // Initial delay before checking agents
      timeoutId = setTimeout(checkAgentsAndComplete, 2000);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
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
              Finalizing Generation
            </h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>✅ Cleaning up active agents</p>
              <p>🔄 Processing streaming content</p>
              <p>📝 Formatting results for display</p>
            </div>
            <div className="mt-4 text-xs text-blue-600">
              This ensures all agents have completed and content is properly formatted
            </div>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="animate-pulse flex space-x-1 mr-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Generating Database...
                </h3>
              </div>
              <div className="text-sm text-gray-600">
                {streamingResults.size} active agents
              </div>
            </div>
            
            {/* Show streaming content preview */}
            {streamingResults.size > 0 && (
              <div className="space-y-2">
                {Array.from(streamingResults.entries()).map(([taskId, content]) => (
                  <div key={taskId} className="bg-white border rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-700">
                        {taskId.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                        Active
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {content.length > 150 ? 
                        content.substring(0, 150).replace(/[^\s]*$/, '') + '...' : 
                        content
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 text-xs text-gray-500 text-center">
              Agents will auto-complete when processing is finished
            </div>
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