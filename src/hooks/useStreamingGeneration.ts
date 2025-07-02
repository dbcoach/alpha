import { useEffect, useRef, useCallback } from 'react';
import { useGeneration } from '../context/GenerationContext';
import { streamingService } from '../services/streamingService';
import { enhancedDBCoachService, GenerationProgress as DBCoachProgress } from '../services/enhancedDBCoachService';

export interface UseStreamingGenerationOptions {
  enableStreaming?: boolean;
  streamingSpeed?: number;
  onTaskStart?: (taskId: string, agent: string) => void;
  onTaskProgress?: (taskId: string, progress: number, reasoning: string) => void;
  onTaskComplete?: (taskId: string, content: string) => void;
  onStreamingComplete?: (results: Map<string, string>) => void;
}

export function useStreamingGeneration(options: UseStreamingGenerationOptions = {}) {
  const { state, startGeneration: originalStartGeneration } = useGeneration();
  const {
    enableStreaming = true,
    streamingSpeed = 40,
    onTaskStart,
    onTaskProgress,
    onTaskComplete,
    onStreamingComplete
  } = options;

  const currentSessionRef = useRef<string | null>(null);
  const taskMappingRef = useRef<Map<string, string>>(new Map());

  // Configure streaming service
  useEffect(() => {
    if (enableStreaming) {
      streamingService.setStreamingSpeed(streamingSpeed);
    }
  }, [enableStreaming, streamingSpeed]);

  // Enhanced reasoning messages for each agent
  const getDetailedReasoning = (progress: DBCoachProgress): string[] => {
    const messages = [];
    
    switch (progress.step) {
      case 'analysis':
        messages.push(
          `🔍 Analyzing domain: "${progress.reasoning}"`,
          `📊 Estimating scale: Small/Medium/Large based on keyword analysis`,
          `🎯 Extracting entities: Users, Products, Orders from context`,
          `⚡ Inferring relationships: One-to-many, many-to-many patterns`,
          `✅ Requirements analysis complete`
        );
        break;
      case 'design':
        messages.push(
          `🏗️ Selecting PostgreSQL for ACID compliance and complex relationships`,
          `📐 Designing core entities with proper normalization (3NF)`,
          `🔗 Mapping relationships: Foreign keys and junction tables`,
          `⚡ Planning indexes for query optimization`,
          `🛡️ Adding constraints for data integrity`,
          `✅ Schema design complete`
        );
        break;
      case 'implementation':
        messages.push(
          `⚙️ Generating CREATE TABLE statements with proper data types`,
          `📝 Creating sample data that reflects business domain`,
          `🔍 Adding indexes for commonly queried fields`,
          `🚀 Preparing API endpoint examples for CRUD operations`,
          `🧪 Setting up migration scripts for version control`,
          `✅ Implementation package ready`
        );
        break;
      case 'validation':
        messages.push(
          `🔍 Validating schema structure for normalization compliance`,
          `⚡ Reviewing query performance and index coverage`,
          `🛡️ Checking security measures and data protection`,
          `📈 Assessing scalability for future growth`,
          `✅ Quality assurance complete - production ready!`
        );
        break;
    }
    
    return messages;
  };

  // Enhanced progress handler that feeds into streaming service
  const handleStreamingProgress = useCallback((progress: DBCoachProgress) => {
    if (!enableStreaming || !currentSessionRef.current) {
      return;
    }

    const sessionId = currentSessionRef.current;
    const taskId = `${sessionId}_task_${progress.currentStep - 1}`;
    
    // Update task progress in streaming service
    const progressPercent = (progress.currentStep / progress.totalSteps) * 100;
    streamingService.updateTaskProgress(taskId, progressPercent, progress.reasoning);
    
    // Add detailed reasoning messages for better UX
    const detailedMessages = getDetailedReasoning(progress);
    detailedMessages.forEach((message, index) => {
      setTimeout(() => {
        streamingService.emit('insight_message', {
          agent: progress.agent,
          message,
          timestamp: new Date()
        });
      }, index * 1000); // Stagger messages by 1 second
    });
    
    // Trigger callbacks
    onTaskProgress?.(taskId, progressPercent, progress.reasoning);
    
    // Map DBCoach steps to task IDs for content streaming
    taskMappingRef.current.set(progress.step, taskId);
  }, [enableStreaming, onTaskProgress]);

  // Enhanced generation starter with streaming support
  const startStreamingGeneration = useCallback(async (
    prompt: string, 
    dbType: string, 
    mode: 'standard' | 'dbcoach' = 'dbcoach'
  ) => {
    if (!enableStreaming) {
      // Fall back to original generation
      return originalStartGeneration(prompt, dbType, mode);
    }

    const sessionId = `session_${Date.now()}`;
    currentSessionRef.current = sessionId;

    try {
      // Initialize streaming session with DBCoach tasks
      const streamingTasks = [
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

      streamingService.initializeSession(sessionId, streamingTasks);

      // Start the enhanced DBCoach generation with streaming progress handler
      const steps = await enhancedDBCoachService.generateDatabaseDesign(
        prompt,
        dbType,
        handleStreamingProgress
      );

      // Stream each completed step's content
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const taskId = `${sessionId}_task_${i}`;
        
        onTaskStart?.(taskId, step.agent);
        
        // Start streaming the content
        streamingService.startTaskStream(taskId, step.content);
        
        // Simulate realistic streaming timing
        await new Promise(resolve => {
          const contentLength = step.content.length;
          const streamTime = Math.max(2000, contentLength / streamingSpeed * 1000);
          
          setTimeout(() => {
            streamingService.completeTask(taskId);
            onTaskComplete?.(taskId, step.content);
            resolve(void 0);
          }, streamTime);
        });
      }

      // Collect final results
      const results = new Map<string, string>();
      steps.forEach((step, index) => {
        const taskId = `${sessionId}_task_${index}`;
        results.set(taskId, step.content);
      });

      onStreamingComplete?.(results);
      
      return steps;

    } catch (error) {
      console.error('Streaming generation failed:', error);
      throw error;
    }
  }, [
    enableStreaming, 
    originalStartGeneration, 
    handleStreamingProgress, 
    streamingSpeed,
    onTaskStart,
    onTaskComplete,
    onStreamingComplete
  ]);

  // Control functions
  const pauseStreaming = useCallback(() => {
    if (enableStreaming) {
      streamingService.pauseStreaming();
    }
  }, [enableStreaming]);

  const resumeStreaming = useCallback(() => {
    if (enableStreaming) {
      streamingService.resumeStreaming();
    }
  }, [enableStreaming]);

  const setSpeed = useCallback((speed: number) => {
    if (enableStreaming) {
      streamingService.setStreamingSpeed(speed);
    }
  }, [enableStreaming]);

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
    pauseStreaming,
    resumeStreaming,
    setStreamingSpeed: setSpeed,
    getStreamingStatus,
    
    // Streaming state
    isStreamingEnabled: enableStreaming,
    currentSession: currentSessionRef.current
  };
}

export default useStreamingGeneration;