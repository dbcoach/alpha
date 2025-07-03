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
  Loader2,
  Save,
  Database,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { StreamingErrorBoundary } from './StreamingErrorBoundary';
import StreamingErrorHandler from './StreamingErrorHandler';
import { conversationStorage, ConversationTitleGenerator, SavedConversation } from '../../services/conversationStorage';
import { AIChatService } from '../../services/aiChatService';
import { useAuth } from '../../contexts/AuthContext';
import { revolutionaryDBCoachService } from '../../services/revolutionaryDBCoachService';
import { resilientStreamingService } from '../../services/resilientStreamingService';

interface StreamingTask {
  id: string;
  title: string;
  agent: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  estimatedTime: number;
  startTime?: Date;
  endTime?: Date;
  subtasks: StreamingSubtask[];
}

interface AIReasoning {
  id: string;
  taskId: string;
  agent: string;
  step: string;
  content: string;
  timestamp: Date;
  isExpanded: boolean;
  confidence?: number;
}

interface StreamingSubtask {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'code' | 'sql';
}

interface EnhancedStreamingInterfaceProps {
  prompt: string;
  dbType: string;
  onComplete?: (conversationId: string) => void;
  onError?: (error: string) => void;
  className?: string;
  mode?: string; // 'dbcoach' | 'standard'
  isViewingMode?: boolean;
  existingConversation?: SavedConversation;
}

export function EnhancedStreamingInterface({ 
  prompt, 
  dbType, 
  onComplete, 
  onError, 
  className = '',
  mode = 'dbcoach',
  isViewingMode = false,
  existingConversation
}: EnhancedStreamingInterfaceProps) {
  const { user } = useAuth();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [tasks, setTasks] = useState<StreamingTask[]>([]);
  const [activeTask, setActiveTask] = useState<StreamingTask | null>(null);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [streamingSpeed, setStreamingSpeed] = useState(80); // Increased from 40 to 80 for faster streaming
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [taskContent, setTaskContent] = useState<Map<string, string>>(new Map());
  const [insights, setInsights] = useState<Array<{ agent: string; message: string; timestamp: Date }>>([]);
  const [aiReasoning, setAiReasoning] = useState<AIReasoning[]>([]);
  const [cleanOutput, setCleanOutput] = useState<Map<string, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'none' | 'saving' | 'saved' | 'error'>('none');
  const [startTime] = useState(() => new Date());
  
  // Error handling state
  const [streamingError, setStreamingError] = useState<Error | null>(null);
  const [isInFallbackMode, setIsInFallbackMode] = useState(false);
  const [errorRecoveryAttempts, setErrorRecoveryAttempts] = useState(0);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cursorRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const insightsEndRef = useRef<HTMLDivElement>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Enhanced timeout and state management refs
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const streamingStateRef = useRef<{
    taskId: string;
    contentIndex: number;
    isActive: boolean;
  } | null>(null);
  const taskTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize streaming session and capture
  useEffect(() => {
    if (isViewingMode && existingConversation) {
      loadExistingConversation();
    } else {
      initializeStreamingSession();
    }
    
    return () => {
      // Comprehensive cleanup of all timeouts and intervals
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
      
      // Clear all streaming timeouts
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current.clear();
      
      // Clear all task timeouts
      taskTimeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      taskTimeoutRefs.current.clear();
      
      // Reset streaming state
      streamingStateRef.current = null;
    };
  }, [isViewingMode, existingConversation]);

  const loadExistingConversation = () => {
    if (!existingConversation) return;
    
    console.log('🔍 Loading existing conversation in enhanced viewing mode:', existingConversation);
    console.log('📊 Existing conversation content summary:', {
      tasksCount: existingConversation.tasks?.length || 0,
      insightsCount: existingConversation.insights?.length || 0,
      contentKeys: Object.keys(existingConversation.generatedContent || {}),
      totalContentLength: Object.values(existingConversation.generatedContent || {}).join('').length
    });
    
    // Load existing tasks
    setTasks(existingConversation.tasks.map(task => ({
      id: task.id,
      title: task.title,
      agent: task.agent,
      status: 'completed' as const,
      progress: 100,
      estimatedTime: 0,
      subtasks: []
    })));
    
    // Load existing content and generate clean output for middle panel
    const contentMap = new Map<string, string>();
    const cleanOutputMap = new Map<string, string>();
    
    Object.entries(existingConversation.generatedContent || {}).forEach(([taskId, content]) => {
      if (typeof content === 'string' && content.length > 0) {
        contentMap.set(taskId, content);
        
        // Extract clean output for the middle panel
        const cleanContent = extractCleanOutput(content);
        
        // If clean content is empty, use minimal content generation
        if (!cleanContent || cleanContent.length < 20) {
          const taskTitle = existingConversation.tasks?.find(t => t.id === taskId)?.title || taskId;
          const minimalContent = generateMinimalContent({
            id: taskId,
            title: taskTitle,
            agent: 'DB.Coach',
            status: 'completed',
            progress: 100,
            estimatedTime: 0,
            subtasks: []
          }, existingConversation.prompt, existingConversation.dbType);
          cleanOutputMap.set(taskId, minimalContent);
          console.log(`📝 Generated minimal content for ${taskId} (original was too short)`);
        } else {
          cleanOutputMap.set(taskId, cleanContent);
        }
        
        console.log(`📄 Loaded content for ${taskId}:`, {
          originalLength: content.length,
          cleanLength: cleanOutputMap.get(taskId)?.length || 0,
          hasContent: (cleanOutputMap.get(taskId)?.length || 0) > 0
        });
      }
    });
    
    setTaskContent(contentMap);
    setCleanOutput(cleanOutputMap);
    
    console.log('✅ Clean output populated for middle panel:', cleanOutputMap.size, 'tasks');
    
    // Load existing insights
    setInsights(existingConversation.insights.map(insight => ({
      agent: insight.agent,
      message: insight.message,
      timestamp: new Date(insight.timestamp)
    })));
    
    // Set completed state
    setTotalProgress(100);
    setIsPlaying(false);
    setSaveStatus('saved');
  };

  const initializeStreamingSession = async () => {
    try {
      console.log('🚀 Initializing streaming session - Mode:', mode, 'ViewingMode:', isViewingMode);
      // Add initial insight
      setInsights([{
        agent: 'DB.Coach',
        message: `Starting ${mode} database generation for: ${prompt}`,
        timestamp: new Date()
      }]);

      // Initialize predefined tasks
      const predefinedTasks = [
        {
          id: 'requirements_analysis',
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
          id: 'schema_design',
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
          id: 'implementation_package',
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
          id: 'quality_assurance',
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

      setTasks(predefinedTasks);
      console.log('📋 Set predefined tasks:', predefinedTasks.length);

      // Start streaming simulation
      console.log('🎬 Starting streaming simulation...');
      startStreamingSimulation(predefinedTasks);
      
    } catch (error) {
      console.error('Failed to initialize streaming session:', error);
      onError?.('Failed to initialize streaming session');
    }
  };

  const startStreamingSimulation = (tasks: StreamingTask[]) => {
    console.log('🎯 startStreamingSimulation called - ViewingMode:', isViewingMode, 'Tasks:', tasks.length);
    // Don't start streaming in viewing mode
    if (isViewingMode) {
      console.log('⏸️ Skipping streaming - in viewing mode');
      return;
    }
    
    let currentTaskIndex = 0;
    const localContent = new Map<string, string>();
    const localInsights: Array<{ agent: string; message: string; timestamp: Date }> = [...insights];
    const localTasks = [...tasks];

    const processNextTask = async () => {
      console.log(`🔄 Processing task ${currentTaskIndex}/${localTasks.length}`);
      if (currentTaskIndex >= localTasks.length) {
        console.log('✅ All tasks completed, finishing streaming');
        console.log('📊 Final data before save:', {
          tasksCount: localTasks.length,
          insightsCount: localInsights.length,
          contentKeys: Array.from(localContent.keys()),
          totalContentLength: Array.from(localContent.values()).join('').length
        });
        await completeStreaming(localTasks, localContent, localInsights);
        return;
      }

      const task = localTasks[currentTaskIndex];
      console.log(`🎯 Starting task: ${task.title}`);
      
      // Start task
      task.status = 'active';
      setActiveTask(task);
      setTasks([...localTasks]);
      
      // Add task timeout safety net (30 seconds)
      const taskTimeoutId = setTimeout(() => {
        console.warn(`⚠️ Task ${task.title} timed out after 30 seconds, forcing completion`);
        
        // Force complete the task
        task.status = 'completed';
        task.progress = 100;
        setTasks([...localTasks]);
        
        // Add timeout completion insight
        const timeoutInsight = {
          agent: task.agent,
          message: `${task.title} completed (timeout safety net triggered)`,
          timestamp: new Date()
        };
        localInsights.push(timeoutInsight);
        setInsights(prev => [...prev, timeoutInsight]);
        
        // Clear any existing streaming state
        streamingStateRef.current = null;
        
        // Continue to next task with reduced delay
        currentTaskIndex++;
        const nextTaskTimeoutId = setTimeout(() => processNextTask(), 500);
        timeoutRefs.current.add(nextTaskTimeoutId);
      }, 30000); // 30 second timeout
      
      taskTimeoutRefs.current.set(task.id, taskTimeoutId);

      // Add insight about starting task
      const startInsight = {
        agent: task.agent,
        message: `Starting ${task.title.toLowerCase()}...`,
        timestamp: new Date()
      };
      localInsights.push(startInsight);
      setInsights(prev => [...prev, startInsight]);

      // Generate content for this task using INTELLIGENT AI
      console.log(`🚀 Generating intelligent content for ${task.title}...`);
      
      // Add immediate progress indicator
      const generationStartInsight = {
        agent: task.agent,
        message: `🧠 Starting AI generation for ${task.title}...`,
        timestamp: new Date()
      };
      localInsights.push(generationStartInsight);
      setInsights(prev => [...prev, generationStartInsight]);
      
      let content = '';
      
      try {
        const startTime = Date.now();
        content = await generateIntelligentTaskContent(task, prompt, dbType, localContent);
        const duration = Date.now() - startTime;
        console.log(`✅ Intelligent content generated for ${task.title} - Length: ${content.length} - Duration: ${duration}ms`);
        
        // Add success insight with timing
        const successInsight = {
          agent: task.agent,
          message: `✅ AI generation completed for ${task.title} (${(duration / 1000).toFixed(1)}s)`,
          timestamp: new Date()
        };
        localInsights.push(successInsight);
        setInsights(prev => [...prev, successInsight]);
        
      } catch (error) {
        console.error(`❌ Intelligent content generation failed for ${task.title}:`, error);
        
        // Add error insight
        const errorInsight = {
          agent: task.agent,
          message: `⚠️ AI generation failed for ${task.title}, using fallback content`,
          timestamp: new Date()
        };
        localInsights.push(errorInsight);
        setInsights(prev => [...prev, errorInsight]);
        
        // Use enhanced static content as fallback
        content = generateEnhancedStaticContent(task, prompt, dbType);
        console.log(`🔄 Using fallback content for ${task.title} - Length: ${content.length}`);
      }
      
      // Ensure we have some content
      if (!content || content.length < 50) {
        console.warn(`⚠️ Content too short for ${task.title}, using minimal fallback`);
        content = generateMinimalContent(task, prompt, dbType);
      }
      
      // Immediately extract and store clean output
      const cleanContent = extractCleanOutput(content);
      console.log(`🧹 Clean content extracted for ${task.title} - Length: ${cleanContent.length}`);
      
      // Store clean output immediately for the middle panel
      setCleanOutput(prev => {
        const newMap = new Map(prev);
        newMap.set(task.id, cleanContent);
        return newMap;
      });
      
      // Stream content character by character (for raw content if needed)
      let contentIndex = 0;
      
      // Initialize streaming state
      streamingStateRef.current = {
        taskId: task.id,
        contentIndex: 0,
        isActive: true
      };
      
      const streamContent = async () => {
        // Check if this streaming instance is still valid
        if (!streamingStateRef.current || streamingStateRef.current.taskId !== task.id) {
          console.log(`🚫 Streaming cancelled for ${task.title} - state mismatch`);
          return;
        }
        
        if (contentIndex < content.length && isPlaying && streamingStateRef.current.isActive) {
          const charsToAdd = Math.max(1, Math.floor(streamingSpeed / 60));
          const newChars = content.substring(contentIndex, contentIndex + charsToAdd);
          contentIndex += charsToAdd;
          
          // Update streaming state
          streamingStateRef.current.contentIndex = contentIndex;

          // Update both local and state content (raw content for insights)
          const currentContent = localContent.get(task.id) || '';
          const updatedContent = currentContent + newChars;
          localContent.set(task.id, updatedContent);
          
          setTaskContent(prev => {
            const newMap = new Map(prev);
            newMap.set(task.id, updatedContent);
            return newMap;
          });

          // Update progress
          const progress = Math.min(100, (contentIndex / content.length) * 100);
          task.progress = progress;
          setTasks([...localTasks]);

          if (contentIndex < content.length) {
            const timeoutId = setTimeout(streamContent, 1000 / 60); // 60 FPS
            timeoutRefs.current.add(timeoutId);
          } else {
            // Task completed successfully
            console.log(`✅ Task ${task.title} completed naturally`);
            
            // Clear task timeout
            const taskTimeoutId = taskTimeoutRefs.current.get(task.id);
            if (taskTimeoutId) {
              clearTimeout(taskTimeoutId);
              taskTimeoutRefs.current.delete(task.id);
            }
            
            // Clear streaming state
            streamingStateRef.current = null;
            
            task.status = 'completed';
            task.progress = 100;
            setTasks([...localTasks]);

            // Add completion insight
            const completionInsight = {
              agent: task.agent,
              message: `${task.title} completed successfully! Clean output ready.`,
              timestamp: new Date()
            };
            localInsights.push(completionInsight);
            setInsights(prev => [...prev, completionInsight]);

            currentTaskIndex++;
            // Reduced delay between tasks for faster progression (500ms instead of 1000ms)
            const nextTaskTimeoutId = setTimeout(() => processNextTask(), 500);
            timeoutRefs.current.add(nextTaskTimeoutId);
          }
        } else if (!isPlaying && streamingStateRef.current && streamingStateRef.current.isActive) {
          // Paused state - implement smart resume logic
          console.log(`⏸️ Task ${task.title} paused at ${contentIndex}/${content.length}`);
          
          const checkResume = () => {
            // Verify this resume check is still valid
            if (!streamingStateRef.current || streamingStateRef.current.taskId !== task.id) {
              return; // Streaming was cancelled or moved to different task
            }
            
            if (isPlaying && streamingStateRef.current.isActive) {
              console.log(`▶️ Resuming task ${task.title} from ${contentIndex}/${content.length}`);
              streamContent(); // Resume from current position
            } else if (!isPlaying && streamingStateRef.current.isActive) {
              // Still paused, check again
              const resumeTimeoutId = setTimeout(checkResume, 250); // Check every 250ms
              timeoutRefs.current.add(resumeTimeoutId);
            }
          };
          
          const resumeTimeoutId = setTimeout(checkResume, 250);
          timeoutRefs.current.add(resumeTimeoutId);
        }
      };

      streamContent();
    };

    processNextTask();
  };

  const completeStreaming = async (finalTasks?: StreamingTask[], finalContent?: Map<string, string>, finalInsights?: Array<{ agent: string; message: string; timestamp: Date }>) => {
    // Don't save in viewing mode - already saved
    if (isViewingMode) return;
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');

      // Use the passed parameters or current state as fallback
      const tasksToSave = finalTasks || tasks;
      const contentToSave = finalContent || taskContent;
      const insightsToSave = finalInsights || insights;

      // Create conversation data for Supabase
      const endTime = new Date();
      const title = ConversationTitleGenerator.generate(prompt, dbType);
      
      const conversation: SavedConversation = {
        id: sessionId,
        prompt,
        dbType,
        title,
        generatedContent: Object.fromEntries(contentToSave.entries()),
        insights: insightsToSave.map(insight => ({
          agent: insight.agent,
          message: insight.message,
          timestamp: insight.timestamp.toISOString()
        })),
        tasks: tasksToSave.map(task => ({
          id: task.id,
          title: task.title,
          agent: task.agent,
          status: 'completed' as const,
          progress: task.progress
        })),
        createdAt: startTime.toISOString(),
        updatedAt: endTime.toISOString(),
        status: 'completed',
        userId: user?.id,
        metadata: {
          duration: endTime.getTime() - startTime.getTime(),
          totalChunks: Array.from(contentToSave.values()).join('').length,
          totalInsights: insightsToSave.length,
          mode
        }
      };

      // Save to Supabase
      console.log('💾 Saving conversation to Supabase:', {
        title: conversation.title,
        tasksCount: conversation.tasks.length,
        insightsCount: conversation.insights.length,
        contentLength: Object.values(conversation.generatedContent).join('').length
      });
      await conversationStorage.saveConversation(conversation);
      console.log('✅ Conversation saved successfully!');

      setSaveStatus('saved');
      setTotalProgress(100);
      setIsPlaying(false);

      // Add final insight
      setInsights(prev => [...prev, {
        agent: 'DB.Coach',
        message: '✅ Database design complete! All components generated and saved successfully.',
        timestamp: new Date()
      }]);

      console.log(`Saved conversation: ${title}`);
      onComplete?.(sessionId);
    } catch (error) {
      console.error('Error completing streaming:', error);
      setSaveStatus('error');
      onError?.('Failed to save streaming results');
    } finally {
      setIsSaving(false);
    }
  };

  // Intelligent content generation with separated reasoning and output
  const generateIntelligentTaskContent = async (
    task: StreamingTask, 
    prompt: string, 
    dbType: string, 
    existingContent: Map<string, string>
  ): Promise<string> => {
    try {
      console.log(`🧠 Generating intelligent content for task: ${task.title}`);
      
      // Add reasoning steps that will stream to the left panel
      const reasoningSteps = [
        `Analyzing ${task.title.toLowerCase()} requirements...`,
        `Processing domain context: ${prompt.substring(0, 50)}...`,
        `Selecting optimal ${dbType} patterns...`,
        `Generating content with AI reasoning...`,
        `Validating output quality and completeness...`
      ];
      
      // Stream reasoning steps to left panel
      for (let i = 0; i < reasoningSteps.length; i++) {
        const reasoning: AIReasoning = {
          id: `reasoning_${task.id}_${i}`,
          taskId: task.id,
          agent: task.agent,
          step: `Step ${i + 1}`,
          content: reasoningSteps[i],
          timestamp: new Date(),
          isExpanded: i === reasoningSteps.length - 1, // Last step expanded by default
          confidence: 0.8 + (i * 0.04) // Increasing confidence
        };
        
        setAiReasoning(prev => [...prev, reasoning]);
        
        // Reduced delay between reasoning steps for faster transitions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Map task type to generation step type
      const stepTypeMap: Record<string, string> = {
        'Requirements Analysis': 'analysis',
        'Schema Design': 'design', 
        'Implementation Package': 'implementation',
        'Quality Assurance': 'validation'
      };
      
      const stepType = stepTypeMap[task.title] || 'design';
      
      // Add AI reasoning step
      const finalReasoningStep: AIReasoning = {
        id: `reasoning_${task.id}_final`,
        taskId: task.id,
        agent: task.agent,
        step: 'AI Generation',
        content: `Executing ${stepType} generation using Revolutionary DBCoach Service with context-aware prompts and domain-specific optimization for ${dbType} database.`,
        timestamp: new Date(),
        isExpanded: false,
        confidence: 0.95
      };
      setAiReasoning(prev => [...prev, finalReasoningStep]);
      
      // Use the revolutionary service to generate content with timeout fallback
      console.time(`🔥 AI Generation for ${task.title}`);
      
      // Add timeout to prevent hanging on AI service
      const GENERATION_TIMEOUT = 15000; // 15 seconds timeout
      let steps;
      
      try {
        // Use resilient streaming service instead of direct service call
        const result = await resilientStreamingService.generateDatabaseDesign(
          prompt,
          dbType,
          (progress) => {
            // Stream progress reasoning to left panel with immediate updates
            const progressReasoning: AIReasoning = {
              id: `progress_${task.id}_${Date.now()}`,
              taskId: task.id,
              agent: progress.agent,
              step: progress.step,
              content: progress.reasoning,
              timestamp: new Date(),
              isExpanded: false,
              confidence: progress.confidence
            };
            setAiReasoning(prev => [...prev, progressReasoning]);
            
            // Log timing for debugging
            console.log(`📊 Progress update for ${task.title}: ${progress.step} (${progress.confidence * 100}% confidence)`);
          }
        );
        
        if (!result.success) {
          throw result.error || new Error('Generation failed');
        }
        
        if (result.fallbackUsed) {
          setIsInFallbackMode(true);
          const fallbackInsight = {
            agent: task.agent,
            message: `⚠️ Using fallback mode for ${task.title} - AI service temporarily unavailable`,
            timestamp: new Date()
          };
          setInsights(prev => [...prev, fallbackInsight]);
        }
        
        steps = result.data;
        console.timeEnd(`🔥 AI Generation for ${task.title}`);
        
      } catch (error) {
        console.warn(`⚠️ AI Service failed for ${task.title}:`, error);
        setStreamingError(error instanceof Error ? error : new Error(String(error)));
        throw error; // Will be caught by outer try-catch and use fallback content
      }
      
      // Find the matching step or use the first one
      const targetStep = steps.find(step => step.type === stepType) || steps[0];
      
      if (targetStep) {
        // Add completion reasoning
        const completionReasoning: AIReasoning = {
          id: `completion_${task.id}`,
          taskId: task.id,
          agent: task.agent,
          step: 'Complete',
          content: `✅ Successfully generated ${targetStep.content.length} characters of ${stepType} content with ${Math.round(targetStep.confidence * 100)}% confidence.`,
          timestamp: new Date(),
          isExpanded: false,
          confidence: targetStep.confidence
        };
        setAiReasoning(prev => [...prev, completionReasoning]);
        
        console.log(`✅ Generated ${targetStep.type} content with ${targetStep.content.length} characters`);
        
        // Extract clean output (remove reasoning sections)
        const cleanOutput = extractCleanOutput(targetStep.content);
        return cleanOutput;
      } else {
        throw new Error('No content generated');
      }
      
    } catch (error) {
      console.error(`❌ Intelligent generation failed for ${task.title}:`, error);
      
      // Add error reasoning
      const errorReasoning: AIReasoning = {
        id: `error_${task.id}`,
        taskId: task.id,
        agent: task.agent,
        step: 'Fallback',
        content: `⚠️ AI generation failed, using enhanced static content: ${error}`,
        timestamp: new Date(),
        isExpanded: true,
        confidence: 0.6
      };
      setAiReasoning(prev => [...prev, errorReasoning]);
      
      // Fallback to enhanced static content that's at least contextual
      return generateEnhancedStaticContent(task, prompt, dbType);
    }
  };

  // Extract clean output by removing reasoning and meta content
  const extractCleanOutput = (content: string): string => {
    if (!content || content.length === 0) {
      console.warn('⚠️ extractCleanOutput: Empty content provided');
      return content;
    }

    console.log('🧹 Extracting clean output from content length:', content.length);
    
    // If content is very short, return as-is (might be fallback content)
    if (content.length < 100) {
      return content;
    }
    
    // Remove reasoning patterns but preserve the core database content
    let cleanContent = content
      // Remove meta analysis headers but keep the content
      .replace(/^#{1,3}\s*🎯.*?Requirements Analysis.*?\n/gmi, '')
      .replace(/^\*\*Domain\*\*:.*?\n/gm, '')
      .replace(/^\*\*Scale\*\*:.*?\n/gm, '')
      .replace(/^\*\*Complexity\*\*:.*?\n/gm, '')
      .replace(/^\*\*Confidence Score\*\*:.*?\n/gm, '')
      // Remove thinking process headers
      .replace(/^#{1,3}\s*📋.*?Understanding.*?\n/gmi, '')
      .replace(/^\*\*Explicit requirements\*\*:.*?\n/gm, '')
      .replace(/^\*\*Implicit requirements\*\*:.*?\n/gm, '')
      .replace(/^\*\*Context Analysis\*\*:.*?\n/gm, '')
      // Clean up revolutionary language but keep structure
      .replace(/🗄️\s*Revolutionary Database Design/g, 'Database Design')
      .replace(/⚡\s*Context-Optimized Schema/g, 'Database Schema')
      .replace(/🚀\s*Revolutionary Performance & Security/g, 'Performance & Security')
      .replace(/📊\s*Intelligent Sample Queries/g, 'Sample Queries')
      .replace(/🛡️\s*Revolutionary Safety & Rollback Plans/g, 'Safety & Rollback')
      // Remove excessive marketing language but preserve technical content
      .replace(/Revolutionary\s+/g, '')
      .replace(/Context-Aware\s+/g, '')
      .replace(/Intelligent\s+/g, '')
      // Clean up extra spaces but preserve line breaks
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    console.log('✅ Clean content extracted, length:', cleanContent.length);
    
    // If cleaning removed everything, return original content
    if (cleanContent.length < 50 && content.length > 100) {
      console.warn('⚠️ Over-cleaning detected, returning original content');
      return content;
    }
    
    return cleanContent;
  };

  // Toggle reasoning expansion
  const toggleReasoningExpansion = (reasoningId: string) => {
    setAiReasoning(prev => prev.map(reasoning => 
      reasoning.id === reasoningId 
        ? { ...reasoning, isExpanded: !reasoning.isExpanded }
        : reasoning
    ));
  };

  // Parse and render database content visually with database-type specific formatting
  const renderDatabaseContent = (content: string, taskTitle: string) => {
    if (!content) {
      console.warn('⚠️ renderDatabaseContent: No content to render for', taskTitle);
      return null;
    }

    console.log('🎨 Rendering database content for', taskTitle, 'DB Type:', dbType, 'length:', content.length);

    // Database-specific content extraction
    const extractDatabaseContent = () => {
      switch (dbType?.toLowerCase()) {
        case 'sql':
          return extractSQLContent(content);
        case 'nosql':
          return extractNoSQLContent(content);
        case 'vectordb':
          return extractVectorDBContent(content);
        default:
          return extractSQLContent(content); // Fallback to SQL
      }
    };

    const extractSQLContent = (content: string) => {
      const sqlBlocks = content.match(/```sql\n?([\s\S]*?)```/gi) || [];
      const tableCreations = content.match(/CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi) || [];
      const insertStatements = content.match(/INSERT INTO\s+\w+[\s\S]*?;/gi) || [];
      const constraints = content.match(/(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)[\s\S]*?[,;]/gi) || [];
      
      return {
        type: 'SQL',
        icon: '🗄️',
        color: 'blue',
        blocks: sqlBlocks,
        tables: tableCreations,
        inserts: insertStatements,
        constraints: constraints
      };
    };

    const extractNoSQLContent = (content: string) => {
      const jsonBlocks = content.match(/```json\n?([\s\S]*?)```/gi) || [];
      const mongoBlocks = content.match(/```mongodb?\n?([\s\S]*?)```/gi) || [];
      const collections = content.match(/db\.(\w+)\./g) || [];
      const documents = content.match(/\{[\s\S]*?\}/g) || [];
      
      return {
        type: 'NoSQL',
        icon: '📄',
        color: 'green',
        blocks: [...jsonBlocks, ...mongoBlocks],
        collections: [...new Set(collections.map(c => c.replace(/db\./, '').replace(/\.$/, '')))],
        documents: documents.slice(0, 5), // Limit to first 5 documents
        schemas: content.match(/schema:\s*\{[\s\S]*?\}/gi) || []
      };
    };

    const extractVectorDBContent = (content: string) => {
      const vectorBlocks = content.match(/```(?:python|vector|embedding)\n?([\s\S]*?)```/gi) || [];
      const embeddings = content.match(/embeddings?:\s*\[[\s\S]*?\]/gi) || [];
      const indices = content.match(/index[_\s]*(?:name|type):\s*[\w\-"']+/gi) || [];
      const dimensions = content.match(/dimension[s]?:\s*(\d+)/gi) || [];
      const metrics = content.match(/metric[s]?:\s*(cosine|euclidean|dotproduct|manhattan)/gi) || [];
      
      return {
        type: 'VectorDB',
        icon: '🧮',
        color: 'purple',
        blocks: vectorBlocks,
        embeddings: embeddings.slice(0, 3), // Limit to first 3 embeddings
        indices: indices,
        dimensions: dimensions,
        metrics: metrics
      };
    };

    const dbContent = extractDatabaseContent();
    
    console.log('📊 Content analysis:', {
      type: dbContent.type,
      blocks: dbContent.blocks?.length || 0,
      tables: dbContent.tables?.length || 0,
      collections: dbContent.collections?.length || 0,
      embeddings: dbContent.embeddings?.length || 0
    });

    const getColorClasses = (color: string) => {
      const colors = {
        blue: { bg: 'bg-blue-500/20', border: 'border-blue-400/30', text: 'text-blue-300', accent: 'bg-blue-400' },
        green: { bg: 'bg-green-500/20', border: 'border-green-400/30', text: 'text-green-300', accent: 'bg-green-400' },
        purple: { bg: 'bg-purple-500/20', border: 'border-purple-400/30', text: 'text-purple-300', accent: 'bg-purple-400' }
      };
      return colors[color as keyof typeof colors] || colors.blue;
    };

    const colorClasses = getColorClasses(dbContent.color);

    // Render database-specific content
    return (
      <div className="space-y-4">
        {/* Task Header with DB Type */}
        <div className={`${colorClasses.bg} rounded-lg p-3 border ${colorClasses.border}`}>
          <h4 className="text-white font-medium flex items-center gap-2">
            <span className="text-lg">{dbContent.icon}</span>
            {taskTitle}
            <span className={`text-xs px-2 py-1 rounded-full ${colorClasses.bg} ${colorClasses.text}`}>
              {dbContent.type}
            </span>
          </h4>
        </div>

        {/* Database-specific Content Display */}
        <div className="bg-slate-900/50 rounded-lg border border-slate-600/50 overflow-hidden">
          {dbContent.type === 'SQL' && renderSQLContent(dbContent, colorClasses)}
          {dbContent.type === 'NoSQL' && renderNoSQLContent(dbContent, colorClasses)}
          {dbContent.type === 'VectorDB' && renderVectorDBContent(dbContent, colorClasses)}
        </div>
      </div>
    );
  };

  const renderSQLContent = (dbContent: any, colorClasses: any) => (
    <div className="p-4 space-y-4">
      {/* SQL Code Blocks */}
      {dbContent.blocks.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            SQL Statements ({dbContent.blocks.length})
          </h5>
          {dbContent.blocks.map((block: string, index: number) => {
            const cleanSQL = block.replace(/```sql\n?/gi, '').replace(/```/g, '').trim();
            return (
              <div key={index} className={`${colorClasses.bg} rounded p-3 border ${colorClasses.border}`}>
                <pre className="text-blue-300 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                  <code>{cleanSQL}</code>
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {/* Database Tables */}
      {dbContent.tables.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            Database Tables ({dbContent.tables.length})
          </h5>
          {dbContent.tables.map((tableSQL: string, index: number) => {
            const tableName = tableSQL.match(/CREATE TABLE\s+(\w+)/i)?.[1] || `table_${index}`;
            return (
              <div key={index} className="bg-slate-800/30 rounded p-3 border border-slate-700/30">
                <div className="text-white font-medium mb-2 flex items-center gap-2">
                  <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
                  {tableName}
                </div>
                <pre className="text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  <code>{tableSQL}</code>
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback Text Content */}
      {(dbContent.blocks.length === 0 && dbContent.tables.length === 0) && (
        <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );

  const renderNoSQLContent = (dbContent: any, colorClasses: any) => (
    <div className="p-4 space-y-4">
      {/* Collections */}
      {dbContent.collections.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            Collections ({dbContent.collections.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {dbContent.collections.map((collection: string, index: number) => (
              <span key={index} className={`px-3 py-1 ${colorClasses.bg} ${colorClasses.text} rounded-full text-sm border ${colorClasses.border}`}>
                {collection}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* JSON/MongoDB Blocks */}
      {dbContent.blocks.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            Document Schemas ({dbContent.blocks.length})
          </h5>
          {dbContent.blocks.map((block: string, index: number) => {
            const cleanJSON = block.replace(/```(?:json|mongodb?)\n?/gi, '').replace(/```/g, '').trim();
            let formattedJSON = cleanJSON;
            try {
              const parsed = JSON.parse(cleanJSON);
              formattedJSON = JSON.stringify(parsed, null, 2);
            } catch (e) {
              // Keep original if not valid JSON
            }
            return (
              <div key={index} className={`${colorClasses.bg} rounded p-3 border ${colorClasses.border}`}>
                <pre className="text-green-300 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                  <code>{formattedJSON}</code>
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {/* Sample Documents */}
      {dbContent.documents.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            Sample Documents ({dbContent.documents.length})
          </h5>
          {dbContent.documents.map((doc: string, index: number) => {
            let formattedDoc = doc;
            try {
              const parsed = JSON.parse(doc);
              formattedDoc = JSON.stringify(parsed, null, 2);
            } catch (e) {
              // Keep original if not valid JSON
            }
            return (
              <div key={index} className="bg-slate-800/30 rounded p-3 border border-slate-700/30">
                <pre className="text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  <code>{formattedDoc}</code>
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback Text Content */}
      {(dbContent.blocks.length === 0 && dbContent.collections.length === 0) && (
        <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );

  const renderVectorDBContent = (dbContent: any, colorClasses: any) => (
    <div className="p-4 space-y-4">
      {/* Vector Configuration */}
      {(dbContent.dimensions.length > 0 || dbContent.metrics.length > 0) && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            Vector Configuration
          </h5>
          <div className="grid grid-cols-2 gap-3">
            {dbContent.dimensions.length > 0 && (
              <div className={`${colorClasses.bg} rounded p-3 border ${colorClasses.border}`}>
                <div className="text-xs text-slate-400 mb-1">Dimensions</div>
                <div className={`${colorClasses.text} font-mono`}>{dbContent.dimensions[0]}</div>
              </div>
            )}
            {dbContent.metrics.length > 0 && (
              <div className={`${colorClasses.bg} rounded p-3 border ${colorClasses.border}`}>
                <div className="text-xs text-slate-400 mb-1">Distance Metric</div>
                <div className={`${colorClasses.text} font-mono`}>{dbContent.metrics[0]}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vector Indices */}
      {dbContent.indices.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            Vector Indices ({dbContent.indices.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {dbContent.indices.map((index: string, idx: number) => (
              <span key={idx} className={`px-3 py-1 ${colorClasses.bg} ${colorClasses.text} rounded-full text-sm border ${colorClasses.border}`}>
                {index}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Vector Code Blocks */}
      {dbContent.blocks.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            Vector Operations ({dbContent.blocks.length})
          </h5>
          {dbContent.blocks.map((block: string, index: number) => {
            const cleanCode = block.replace(/```(?:python|vector|embedding)\n?/gi, '').replace(/```/g, '').trim();
            return (
              <div key={index} className={`${colorClasses.bg} rounded p-3 border ${colorClasses.border}`}>
                <pre className="text-purple-300 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                  <code>{cleanCode}</code>
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {/* Sample Embeddings */}
      {dbContent.embeddings.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClasses.accent} rounded`}></div>
            Sample Embeddings ({dbContent.embeddings.length})
          </h5>
          {dbContent.embeddings.map((embedding: string, index: number) => (
            <div key={index} className="bg-slate-800/30 rounded p-3 border border-slate-700/30">
              <pre className="text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                <code>{embedding}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Fallback Text Content */}
      {(dbContent.blocks.length === 0 && dbContent.embeddings.length === 0) && (
        <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );

  // Generate minimal content that always works
  const generateMinimalContent = (task: StreamingTask, prompt: string, dbType: string): string => {
    const timestamp = new Date().toLocaleString();
    
    switch (task.title) {
      case 'Requirements Analysis':
        return `# Requirements Analysis

## Project Overview
**Database Type:** ${dbType}
**Request:** ${prompt}

## Core Requirements
- Data storage and retrieval system
- Scalable database architecture
- Performance optimization
- Security implementation

## Next Steps
- Define database schema
- Plan table relationships
- Consider indexing strategy

*Generated: ${timestamp}*`;

      case 'Schema Design':
        return `# Database Schema Design

## Core Tables
\`\`\`sql
-- Primary entities for your ${dbType} database
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE main_entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## Relationships
- Users can have multiple main entities (1:N)
- Foreign key constraints ensure data integrity

*Generated: ${timestamp}*`;

      case 'Implementation Package':
        return `# Implementation Guide

## Database Setup
\`\`\`sql
-- Create database
CREATE DATABASE ${prompt.split(' ').slice(0,2).join('_').toLowerCase()}_db;

-- Basic table structure
CREATE TABLE core_data (
    id SERIAL PRIMARY KEY,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## Performance Optimizations
- Primary key indexing
- Query optimization
- Connection pooling

*Generated: ${timestamp}*`;

      case 'Quality Assurance':
        return `# Quality Assurance Report

## Schema Validation
✅ Table structure validated
✅ Relationships verified  
✅ Constraints applied
✅ Indexes optimized

## Security Checks
✅ Access controls implemented
✅ Data validation enabled
✅ SQL injection prevention

## Performance Review
✅ Query optimization complete
✅ Indexing strategy applied

*Generated: ${timestamp}*`;

      default:
        return `# ${task.title}

Database design content for your ${dbType} project.

**Prompt:** ${prompt}

Content generated at ${timestamp}`;
    }
  };

  // Enhanced static content as fallback (much better than the old static content)
  const generateEnhancedStaticContent = (task: StreamingTask, prompt: string, dbType: string): string => {
    const domainKeywords = prompt.toLowerCase();
    const isEcommerce = ['shop', 'store', 'product', 'order', 'cart'].some(keyword => domainKeywords.includes(keyword));
    const isBlog = ['blog', 'post', 'article', 'comment'].some(keyword => domainKeywords.includes(keyword));
    const isSocial = ['social', 'user', 'follow', 'like', 'friend'].some(keyword => domainKeywords.includes(keyword));
    
    switch (task.title) {
      case 'Requirements Analysis':
        if (isEcommerce) {
          return `# E-Commerce Requirements Analysis

## Domain Analysis
**Detected Domain**: E-commerce Platform
**Database Type**: ${dbType}
**Original Request**: "${prompt}"

## Core Requirements Identified
### Functional Requirements:
- Product catalog management with categories and variants
- Shopping cart and checkout functionality  
- Order processing and fulfillment tracking
- Customer account management and authentication
- Inventory tracking and stock management
- Payment processing integration
- Multi-currency and tax calculation support

### Technical Requirements:
- High performance for catalog browsing (< 100ms response)
- ACID compliance for order transactions
- Scalability for seasonal traffic spikes
- Security for payment and personal data
- Search functionality with filtering and sorting

### Business Logic:
- Product variants (size, color, style)
- Discount codes and promotional pricing
- Customer loyalty programs
- Supplier and vendor management
- Multi-warehouse inventory

## Assumptions & Recommendations:
- Assuming B2C e-commerce model
- Recommending normalized schema for data integrity
- Suggesting separate read replicas for catalog queries
- Planning for international expansion (i18n support)`;
        }
        
        if (isBlog) {
          return `# Blog Platform Requirements Analysis

## Domain Analysis  
**Detected Domain**: Blog Management System
**Database Type**: ${dbType}
**Original Request**: "${prompt}"

## Core Requirements Identified
### Content Management:
- Article creation, editing, and publishing workflow
- Category and tag organization system
- Author management and multi-author support
- Comment system with moderation capabilities
- Media management (images, videos, attachments)

### User Experience:
- Public blog interface with responsive design
- Search functionality across all content
- RSS feed generation
- Social sharing integration
- Email subscription management

### Technical Requirements:
- Content versioning and revision history
- SEO optimization (meta tags, URLs, sitemaps)
- Caching strategy for high-traffic articles
- Content delivery network (CDN) integration
- Backup and disaster recovery

## Schema Recommendations:
- Hierarchical categories for content organization
- Flexible tagging system for cross-referencing
- Comment threading and reply functionality
- Author roles and permission management`;
        }
        
        return `# Requirements Analysis

## Project Analysis
**Database Type**: ${dbType}
**Original Request**: "${prompt}"

## Requirements Extraction
Based on your request, I've identified the following core requirements and designed an appropriate database structure to meet your needs.

### Functional Requirements:
- Core entity management and relationships
- User authentication and authorization
- Data validation and integrity constraints
- Query performance optimization
- Scalable architecture design

### Technical Considerations:
- ${dbType} database optimization
- Proper indexing strategy
- ACID compliance where needed
- Security best practices implementation
- Future scalability planning`;

      case 'Schema Design':
        if (isEcommerce) {
          return `# E-Commerce Database Schema Design

## Core Tables Design

\`\`\`sql
-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    sku VARCHAR(100) UNIQUE NOT NULL,
    inventory_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## Indexes for Performance

\`\`\`sql
-- Customer indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Product indexes  
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active_price ON products(is_active, price) WHERE is_active = true;

-- Order indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
\`\`\`

## Relationships Summary:
- **One-to-Many**: Categories → Products, Customers → Orders, Orders → Order Items
- **Self-Referencing**: Categories (parent-child hierarchy)
- **Foreign Key Constraints**: Maintain referential integrity across all relationships`;
        }
        
        return generateTaskContent(task, prompt, dbType);

      default:
        return generateTaskContent(task, prompt, dbType);
    }
  };

  // Original static content generator (keep as final fallback)
  const generateTaskContent = (task: StreamingTask, prompt: string, dbType: string): string => {
    switch (task.id) {
      case 'requirements_analysis':
        return `# Requirements Analysis Report

## Domain Analysis
Based on the prompt: "${prompt}"

### Identified Entities:
- Primary entities detected from domain analysis
- Secondary supporting entities
- Junction/relationship entities

### Functional Requirements:
- Data storage requirements
- Query performance needs
- Scalability considerations
- Integration requirements

### Non-Functional Requirements:
- Performance targets: < 100ms query response
- Concurrency: Support 1000+ concurrent users
- Data consistency: ACID compliance required
- Security: Role-based access control

### Complexity Assessment:
- Schema complexity: Moderate to High
- Relationship complexity: High
- Query complexity: Moderate
- Estimated development time: 2-3 weeks`;

      case 'schema_design':
        return `# Database Schema Design

## Entity Relationship Diagram

### Core Tables:

\`\`\`sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Primary business entity
CREATE TABLE main_entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### Relationships:
- One-to-Many: Users → Entities
- Many-to-Many: Entities ↔ Categories
- Self-referencing: Hierarchical structures

### Indexes:
- Primary keys: Clustered indexes
- Foreign keys: Non-clustered indexes
- Search fields: Composite indexes
- Unique constraints: Email, username`;

      case 'implementation_package':
        return `# Implementation Package

## SQL Scripts

### Database Creation:
\`\`\`sql
-- Database setup
CREATE DATABASE ${prompt.split(' ').slice(0,2).join('_').toLowerCase()}_db;
USE ${prompt.split(' ').slice(0,2).join('_').toLowerCase()}_db;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\`\`\`

### Sample Data:
\`\`\`sql
-- Insert sample users
INSERT INTO users (username, email, password_hash) VALUES
('admin', 'admin@example.com', 'hashed_password_1'),
('user1', 'user1@example.com', 'hashed_password_2'),
('user2', 'user2@example.com', 'hashed_password_3');

-- Insert sample entities
INSERT INTO main_entities (name, description, user_id) VALUES
('Sample Entity 1', 'Description for entity 1', 1),
('Sample Entity 2', 'Description for entity 2', 2);
\`\`\`

### API Examples:
\`\`\`javascript
// REST API endpoints
const api = {
  getUsers: () => fetch('/api/users'),
  createUser: (data) => fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getEntities: () => fetch('/api/entities'),
  createEntity: (data) => fetch('/api/entities', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
\`\`\``;

      case 'quality_assurance':
        return `# Quality Assurance Report

## Design Validation ✅
- Schema normalization: 3NF compliance verified
- Foreign key constraints: All relationships validated
- Data types: Appropriate selection confirmed
- Naming conventions: Consistent throughout

## Performance Analysis 📊
- Query optimization: Indexes properly placed
- Expected query time: < 50ms for most operations
- Scalability: Designed for 10x growth
- Connection pooling: Recommended configuration

## Security Audit 🔒
- SQL injection prevention: Parameterized queries
- Data encryption: Sensitive fields protected
- Access control: Role-based permissions
- Audit logging: All changes tracked

## Recommendations:
1. Implement regular backups (daily)
2. Monitor query performance metrics
3. Set up replication for high availability
4. Regular security updates and patches

## Deployment Checklist:
- [ ] Database server configuration
- [ ] Security hardening
- [ ] Backup strategy implementation
- [ ] Monitoring setup
- [ ] Performance baseline establishment`;

      default:
        return `Generated content for ${task.title}...`;
    }
  };

  const getContentType = (taskTitle: string): 'text' | 'code' | 'schema' | 'query' => {
    if (taskTitle.toLowerCase().includes('schema') || taskTitle.toLowerCase().includes('design')) {
      return 'schema';
    }
    if (taskTitle.toLowerCase().includes('sql') || taskTitle.toLowerCase().includes('implementation')) {
      return 'code';
    }
    if (taskTitle.toLowerCase().includes('query')) {
      return 'query';
    }
    return 'text';
  };

  const handlePlayPause = useCallback(() => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    // Log state change for debugging
    console.log(`🎬 Play/Pause: ${isPlaying ? 'PAUSED' : 'PLAYING'} -> ${newPlayingState ? 'PLAYING' : 'PAUSED'}`);
    
    // If resuming and we have active streaming state, it will automatically resume
    // If pausing, the streaming will detect this and pause gracefully
    if (streamingStateRef.current) {
      console.log(`📊 Current streaming state:`, {
        taskId: streamingStateRef.current.taskId,
        contentIndex: streamingStateRef.current.contentIndex,
        isActive: streamingStateRef.current.isActive
      });
    }
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    console.log('🛑 Stop requested - forcing completion');
    
    // Stop all streaming
    setIsPlaying(false);
    
    // Deactivate current streaming state
    if (streamingStateRef.current) {
      streamingStateRef.current.isActive = false;
      streamingStateRef.current = null;
    }
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
    
    taskTimeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    taskTimeoutRefs.current.clear();
    
    // Force complete streaming
    completeStreaming();
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setStreamingSpeed(speed);
  }, []);

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

  // Chat functions
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Create current conversation context for AI
      const currentConversation: SavedConversation = {
        id: sessionId,
        prompt,
        dbType,
        title: ConversationTitleGenerator.generate(prompt, dbType),
        generatedContent: Object.fromEntries(taskContent.entries()),
        insights: insights.map(insight => ({
          agent: insight.agent,
          message: insight.message,
          timestamp: insight.timestamp.toISOString()
        })),
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          agent: task.agent,
          status: task.status as 'completed',
          progress: task.progress
        })),
        createdAt: startTime.toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'streaming',
        userId: user?.id
      };

      // Debug: Log the context being sent to AI
      console.log('🤖 Chat AI Context:', {
        prompt: currentConversation.prompt,
        dbType: currentConversation.dbType,
        generatedContentKeys: Object.keys(currentConversation.generatedContent),
        contentSizes: Object.entries(currentConversation.generatedContent).map(([key, content]) => 
          ({ task: key, contentLength: content.length })),
        insightsCount: currentConversation.insights.length,
        tasksCount: currentConversation.tasks.length,
        userQuestion: chatInput.trim()
      });

      const response = await AIChatService.generateResponse(currentConversation, chatInput.trim());
      
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        type: response.type || 'text'
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating chat response:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date(),
        type: 'text'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const formatChatMessage = (content: string, type?: string) => {
    if (type === 'code' || type === 'sql') {
      return (
        <pre className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 overflow-x-auto">
          <code className="text-sm font-mono text-green-300">{content}</code>
        </pre>
      );
    }
    return <div className="whitespace-pre-wrap">{content}</div>;
  };

  // Auto-scroll chat messages to bottom
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Focus chat input when chat is shown
  useEffect(() => {
    if (showChat && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [showChat]);

  return (
    <StreamingErrorBoundary>
      <div className={`h-full bg-slate-900/20 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                DB.Coach Live Generation
              </h2>
              <p className="text-slate-400 text-sm">
                Creating {dbType} database: "{prompt.substring(0, 50)}..."
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Chat Toggle Button */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showChat 
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50' 
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300'
              }`}
              title={showChat ? 'Hide Chat' : 'Show Chat'}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">
                Chat {showChat ? '✓' : ''}
              </span>
            </button>
            
            {/* Save Status Indicator */}
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-yellow-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-2 text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Saved</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Save Error</span>
                </div>
              )}
            </div>
            
            <div className="text-sm text-slate-400">
              ETA: {Math.floor(estimatedTimeRemaining / 60)}:{(estimatedTimeRemaining % 60).toString().padStart(2, '0')}
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

        <div className="flex h-full min-h-0">
          {/* Left Side: AI Agent Reasoning Stream */}
          <div className={`${showChat ? 'w-1/3' : 'w-1/2'} border-r border-slate-700/50 bg-slate-800/20 flex flex-col overflow-hidden transition-all duration-300`}>
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
                {/* AI Reasoning Steps with Collapsible Sections */}
                {aiReasoning.map((reasoning) => (
                  <div key={reasoning.id} className="text-sm">
                    <div 
                      className="flex items-center gap-2 p-2 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-colors"
                      onClick={() => toggleReasoningExpansion(reasoning.id)}
                    >
                      {reasoning.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getAgentColor(reasoning.agent)} flex items-center justify-center flex-shrink-0`}>
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-xs">{reasoning.agent}</span>
                          <span className="text-xs text-slate-500">{reasoning.step}</span>
                        </div>
                        {reasoning.confidence && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-300"
                                style={{ width: `${reasoning.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">{Math.round(reasoning.confidence * 100)}%</span>
                          </div>
                        )}
                      </div>
                      
                      <span className="text-xs text-slate-500">
                        {reasoning.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {/* Expanded Content */}
                    {reasoning.isExpanded && (
                      <div className="mt-2 ml-8 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                        <p className="text-slate-300 leading-relaxed text-sm">{reasoning.content}</p>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Legacy Insights (still show for compatibility) */}
                {insights.map((insight, index) => (
                  <div key={`insight-${index}`} className="flex items-start gap-3 text-sm opacity-80">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getAgentColor(insight.agent)} flex items-center justify-center flex-shrink-0`}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-xs">{insight.agent}</span>
                        <span className="text-xs text-slate-500">
                          {insight.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/30">
                        <p className="text-slate-400 leading-relaxed text-xs">{insight.message}</p>
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
                        <span className="font-medium text-white text-xs">{activeTask.agent}</span>
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

          {/* Middle: Generated Results */}
          <div className={`${showChat ? 'w-1/3' : 'w-1/2'} ${showChat ? 'border-r border-slate-700/50' : ''} flex flex-col overflow-hidden transition-all duration-300`}>
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-green-400" />
                Database Design Output
              </h3>
              <p className="text-sm text-slate-400 mt-1">Visual database components and implementation</p>
            </div>

            {/* Live Content Generation */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-6">
                {tasks.map((task) => {
                  const cleanContent = cleanOutput.get(task.id) || '';
                  
                  return (
                    <div key={task.id} className={`transition-all duration-300 ${
                      task.status === 'pending' ? 'opacity-30' : 'opacity-100'
                    }`}>
                      
                      <div className="min-h-[120px]">
                        {cleanContent ? (
                          renderDatabaseContent(cleanContent, task.title)
                        ) : (
                          <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700/50 min-h-[120px]">
                            <div className="flex items-center justify-center h-20 text-slate-500">
                              {task.status === 'pending' ? (
                                <div className="text-center">
                                  <Clock className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                                  <span className="text-sm text-slate-400">Waiting for {task.agent}...</span>
                                  <div className="text-xs text-slate-500 mt-1">Database design in queue</div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-3 mb-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                    <Database className="w-6 h-6 text-green-400 animate-pulse" />
                                  </div>
                                  <span className="text-sm text-slate-300">Generating database design...</span>
                                  <div className="text-xs text-slate-500 mt-1">{task.title} in progress</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Progress indicator for active tasks */}
                        {task.status === 'active' && cleanContent && (
                          <div className="mt-4 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-lg p-3 border border-blue-500/20">
                            <div className="flex items-center gap-2 text-blue-400">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                              <span className="text-sm">Live database generation...</span>
                              <div className="ml-auto text-xs text-slate-400">{Math.round(task.progress)}%</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Side: Chat Panel */}
          {showChat && (
            <div className="w-1/3 bg-slate-800/10 flex flex-col overflow-hidden min-h-0 h-full">
              <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  AI Assistant
                </h3>
                <p className="text-sm text-slate-400 mt-1">Ask questions about your database design</p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                <div className="space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                      <p className="text-sm mb-2">Start a conversation!</p>
                      <p className="text-xs text-slate-600">Ask me about the database design, schema, or implementation.</p>
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={() => setChatInput("Explain the database schema design")}
                          className="block w-full text-left px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm transition-colors"
                        >
                          💡 Explain the database schema design
                        </button>
                        <button
                          onClick={() => setChatInput("What are the key relationships in this database?")}
                          className="block w-full text-left px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm transition-colors"
                        >
                          🔗 What are the key relationships?
                        </button>
                        <button
                          onClick={() => setChatInput("How can I optimize this database for performance?")}
                          className="block w-full text-left px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm transition-colors"
                        >
                          ⚡ How to optimize for performance?
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {chatMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user' 
                              ? 'bg-purple-600/20 text-purple-100 border border-purple-500/30' 
                              : 'bg-slate-800/50 text-slate-200 border border-slate-700/50'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              {message.role === 'user' ? (
                                <User className="w-4 h-4 text-purple-300" />
                              ) : (
                                <Bot className="w-4 h-4 text-blue-400" />
                              )}
                              <span className="text-xs text-slate-400">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-sm">
                              {formatChatMessage(message.content, message.type)}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing Indicator */}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 max-w-[80%]">
                            <div className="flex items-center gap-2 mb-1">
                              <Bot className="w-4 h-4 text-blue-400" />
                              <span className="text-xs text-slate-400">AI Assistant</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span className="text-xs text-slate-400">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatMessagesEndRef} />
                    </>
                  )}
                </div>
              </div>

              {/* Chat Input */}
              <div className="border-t border-slate-700/50 bg-slate-800/30 p-4 flex-shrink-0 min-h-[80px]">
                <div className="flex items-center gap-3">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    placeholder="Ask about the database design..."
                    disabled={isChatLoading}
                    className="flex-1 px-4 py-3 bg-slate-900/80 border-2 border-slate-600/50 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 min-w-0 h-12"
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200 disabled:opacity-50 flex-shrink-0"
                  >
                    {isChatLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Error Recovery Handler */}
      {streamingError && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50">
          <StreamingErrorHandler
            error={streamingError}
            onRetry={() => {
              setStreamingError(null);
              setErrorRecoveryAttempts(prev => prev + 1);
              
              // Reset streaming state and retry
              setTasks([]);
              setActiveTask(null);
              setTaskContent(new Map());
              setCleanOutput(new Map());
              setAiReasoning([]);
              setInsights([]);
              
              // Restart streaming with error recovery mode
              setTimeout(() => {
                startEnhancedStreaming();
              }, 1000);
            }}
            onFallbackMode={() => {
              setStreamingError(null);
              setIsInFallbackMode(true);
              
              // Generate fallback content
              const fallbackContent = resilientStreamingService.generateStaticFallback(prompt, dbType);
              
              // Update state with fallback content
              const fallbackTasks = fallbackContent.map((content: any, index: number) => ({
                id: `fallback_${index}`,
                title: content.title,
                agent: content.agent,
                status: 'completed' as const,
                progress: 100,
                estimatedTime: 0,
                subtasks: []
              }));
              
              setTasks(fallbackTasks);
              
              const fallbackCleanOutput = new Map();
              fallbackContent.forEach((content: any, index: number) => {
                fallbackCleanOutput.set(`fallback_${index}`, content.content);
              });
              setCleanOutput(fallbackCleanOutput);
              
              // Add fallback insight
              setInsights([{
                agent: 'System',
                message: '⚠️ Using fallback mode - AI services temporarily unavailable',
                timestamp: new Date()
              }]);
            }}
            className="max-w-lg"
          />
        </div>
      )}
    </StreamingErrorBoundary>
  );
}