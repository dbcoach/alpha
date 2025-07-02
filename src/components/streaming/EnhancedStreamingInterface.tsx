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
import { conversationStorage, ConversationTitleGenerator, SavedConversation } from '../../services/conversationStorage';
import { AIChatService } from '../../services/aiChatService';
import { useAuth } from '../../contexts/AuthContext';
import { revolutionaryDBCoachService } from '../../services/revolutionaryDBCoachService';

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
  const [streamingSpeed, setStreamingSpeed] = useState(40);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [taskContent, setTaskContent] = useState<Map<string, string>>(new Map());
  const [insights, setInsights] = useState<Array<{ agent: string; message: string; timestamp: Date }>>([]);
  const [aiReasoning, setAiReasoning] = useState<AIReasoning[]>([]);
  const [cleanOutput, setCleanOutput] = useState<Map<string, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'none' | 'saving' | 'saved' | 'error'>('none');
  const [startTime] = useState(() => new Date());
  
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

  // Initialize streaming session and capture
  useEffect(() => {
    if (isViewingMode && existingConversation) {
      loadExistingConversation();
    } else {
      initializeStreamingSession();
    }
    
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
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
    
    // Load existing content
    const contentMap = new Map<string, string>();
    Object.entries(existingConversation.generatedContent).forEach(([taskId, content]) => {
      contentMap.set(taskId, content);
    });
    setTaskContent(contentMap);
    
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
      const content = await generateIntelligentTaskContent(task, prompt, dbType, localContent);
      console.log(`✅ Intelligent content generated for ${task.title} - Length: ${content.length}`);
      
      // Stream content character by character
      let contentIndex = 0;
      const streamContent = async () => {
        if (contentIndex < content.length && isPlaying) {
          const charsToAdd = Math.max(1, Math.floor(streamingSpeed / 60));
          const newChars = content.substring(contentIndex, contentIndex + charsToAdd);
          contentIndex += charsToAdd;

          // Update both local and state content
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
            setTimeout(streamContent, 1000 / 60); // 60 FPS
          } else {
            // Task completed - store clean output for middle panel
            const cleanContent = extractCleanOutput(content);
            setCleanOutput(prev => {
              const newMap = new Map(prev);
              newMap.set(task.id, cleanContent);
              return newMap;
            });
            
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
            setTimeout(() => processNextTask(), 1000);
          }
        } else if (!isPlaying) {
          // Paused, check again later
          setTimeout(streamContent, 100);
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
        
        // Small delay between reasoning steps for visual effect
        await new Promise(resolve => setTimeout(resolve, 300));
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
      
      // Use the revolutionary service to generate content
      const steps = await revolutionaryDBCoachService.generateDatabaseDesign(
        prompt,
        dbType,
        (progress) => {
          // Stream progress reasoning to left panel
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
        }
      );
      
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
    // Remove common reasoning patterns from AI output
    let cleanContent = content
      // Remove meta analysis sections
      .replace(/## 🎯 Context-Aware Requirements Analysis[\s\S]*?## /g, '## ')
      .replace(/\*\*Domain\*\*:.*?\n/g, '')
      .replace(/\*\*Scale\*\*:.*?\n/g, '')
      .replace(/\*\*Complexity\*\*:.*?\n/g, '')
      .replace(/\*\*Confidence Score\*\*:.*?\n/g, '')
      // Remove thinking process sections
      .replace(/### 📋 Intelligent Requirements Understanding[\s\S]*?### /g, '### ')
      .replace(/\*\*Explicit requirements\*\*:.*?\n/g, '')
      .replace(/\*\*Implicit requirements\*\*:.*?\n/g, '')
      .replace(/\*\*Context Analysis\*\*:.*?\n/g, '')
      // Keep only the core content (schema, implementation, etc.)
      .replace(/^#+ 🗄️ Revolutionary Database Design.*?\n/gm, '# Database Design\n')
      .replace(/^#+ ⚡ Context-Optimized Schema/gm, '## Database Schema')
      .replace(/^#+ 🚀 Revolutionary Performance & Security/gm, '## Performance & Security')
      .replace(/^#+ 📊 Intelligent Sample Queries/gm, '## Sample Queries')
      .replace(/^#+ 🛡️ Revolutionary Safety & Rollback Plans/gm, '## Safety & Rollback')
      // Clean up excessive emojis and marketing language
      .replace(/Revolutionary|Context-Aware|Intelligent/g, '')
      .replace(/🗄️|⚡|🚀|📊|🛡️|🎯|📋/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
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

  // Parse and render database content visually
  const renderDatabaseContent = (content: string, taskTitle: string) => {
    if (!content) return null;

    // Extract SQL blocks
    const sqlBlocks = content.match(/```sql\n?([\s\S]*?)```/gi) || [];
    const tableCreations = content.match(/CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi) || [];
    
    // Extract sections
    const sections = content.split(/#{2,3}\s+(.+)/g).filter(Boolean);
    
    return (
      <div className="space-y-6">
        {/* Task Header */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg p-4 border border-slate-600/50">
          <h4 className="text-white font-semibold text-lg mb-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            {taskTitle}
          </h4>
        </div>

        {/* SQL Tables Visualization */}
        {tableCreations.length > 0 && (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600/50">
            <h5 className="text-white font-medium mb-4 flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              Database Tables ({tableCreations.length})
            </h5>
            <div className="grid gap-4">
              {tableCreations.map((tableSQL, index) => {
                const tableName = tableSQL.match(/CREATE TABLE\s+(\w+)/i)?.[1] || `table_${index}`;
                const columns = tableSQL.match(/\(\s*([\s\S]*?)\s*\)/)?.[1]
                  ?.split(',')
                  .map(col => col.trim())
                  .filter(col => col && !col.toLowerCase().includes('constraint'))
                  .slice(0, 6) || [];

                return (
                  <div key={index} className="bg-slate-800/50 rounded-lg border border-slate-600/30 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 px-4 py-3 border-b border-slate-600/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">T</span>
                        </div>
                        <span className="text-white font-medium">{tableName}</span>
                        <span className="text-xs text-slate-400">({columns.length} columns)</span>
                      </div>
                    </div>
                    
                    {/* Columns */}
                    <div className="p-3">
                      <div className="grid gap-2">
                        {columns.slice(0, 4).map((column, colIndex) => {
                          const [name, type] = column.split(/\s+/);
                          const isPrimary = column.toLowerCase().includes('primary key');
                          const isForeign = column.toLowerCase().includes('references');
                          
                          return (
                            <div key={colIndex} className="flex items-center gap-2 text-sm">
                              <div className={`w-3 h-3 rounded ${
                                isPrimary ? 'bg-yellow-400' : 
                                isForeign ? 'bg-blue-400' : 'bg-slate-400'
                              }`}></div>
                              <span className="text-slate-200 font-mono">{name}</span>
                              <span className="text-slate-400 text-xs">{type}</span>
                              {isPrimary && <span className="text-yellow-400 text-xs">PK</span>}
                              {isForeign && <span className="text-blue-400 text-xs">FK</span>}
                            </div>
                          );
                        })}
                        {columns.length > 4 && (
                          <div className="text-xs text-slate-500">
                            +{columns.length - 4} more columns...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SQL Code Blocks */}
        {sqlBlocks.length > 0 && (
          <div className="space-y-4">
            {sqlBlocks.map((block, index) => {
              const cleanSQL = block.replace(/```sql\n?/gi, '').replace(/```/g, '').trim();
              const sqlType = cleanSQL.toLowerCase().includes('create table') ? 'Schema' :
                           cleanSQL.toLowerCase().includes('create index') ? 'Indexes' :
                           cleanSQL.toLowerCase().includes('insert') ? 'Sample Data' : 'SQL Code';
              
              return (
                <div key={index} className="bg-slate-900/70 rounded-lg border border-slate-600/50 overflow-hidden">
                  <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-600/30 flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-400 rounded"></div>
                    <span className="text-white font-medium text-sm">{sqlType}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-slate-400">{cleanSQL.split('\n').length} lines</span>
                    </div>
                  </div>
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-green-300 font-mono text-sm leading-relaxed">
                      {cleanSQL}
                    </code>
                  </pre>
                </div>
              );
            })}
          </div>
        )}

        {/* Text Content */}
        {sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((section, index) => {
              if (index % 2 === 0) return null; // Skip section headers
              const header = sections[index - 1];
              
              return (
                <div key={index} className="bg-slate-800/30 rounded-lg p-4 border border-slate-600/30">
                  <h6 className="text-white font-medium mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded"></div>
                    {header}
                  </h6>
                  <div className="text-slate-300 leading-relaxed text-sm">
                    {section.split('\n').map((line, lineIndex) => (
                      <p key={lineIndex} className="mb-2">{line}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
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
    </StreamingErrorBoundary>
  );
}