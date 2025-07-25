import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple browser-compatible event emitter
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export interface RealStreamChunk {
  type: 'task_start' | 'content_chunk' | 'task_complete' | 'session_complete' | 'error';
  taskId: string;
  taskTitle?: string;
  agent?: string;
  content?: string;
  timestamp: Date;
  metadata?: {
    isComplete?: boolean;
    totalTasks?: number;
    completedTasks?: number;
  };
}

export interface StreamingTask {
  id: string;
  title: string;
  agent: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  content: string;
  startTime?: Date;
  endTime?: Date;
}

class RealTimeStreamingService extends EventEmitter {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private currentSession: string | null = null;
  private tasks: Map<string, StreamingTask> = new Map();

  constructor() {
    super();
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is required.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite-preview-06-17',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
  }

  async startRealStreamingGeneration(
    prompt: string, 
    dbType: string
  ): Promise<void> {
    const sessionId = `session_${Date.now()}`;
    this.currentSession = sessionId;
    this.tasks.clear();

    // Define the actual tasks we'll perform
    const taskDefinitions = [
      {
        id: 'analysis',
        title: 'Requirements Analysis',
        agent: 'Requirements Analyst',
        prompt: `Analyze the following database requirements and provide a detailed analysis:\n\n${prompt}\n\nDatabase Type: ${dbType}\n\nProvide a comprehensive analysis focusing on:\n1. Business domain understanding\n2. Key entities and relationships\n3. Data volume and scaling requirements\n4. Performance considerations\n5. Security and compliance needs`
      },
      {
        id: 'design',
        title: 'Schema Design',
        agent: 'Schema Architect',
        prompt: `Based on this analysis, design a ${dbType} database schema:\n\n${prompt}\n\nCreate a detailed schema design with:\n1. All tables/collections with proper data types\n2. Primary and foreign key relationships\n3. Indexes for performance optimization\n4. Constraints for data integrity\n5. Normalization considerations (for SQL) or document structure (for NoSQL)`
      },
      {
        id: 'implementation',
        title: 'Implementation Package',
        agent: 'Implementation Specialist',
        prompt: `Generate implementation code for this ${dbType} database:\n\n${prompt}\n\nProvide:\n1. Complete SQL DDL scripts (for SQL databases) or schema definitions\n2. Sample data insertion scripts\n3. Common query examples\n4. API endpoint examples\n5. Migration scripts if applicable`
      },
      {
        id: 'optimization',
        title: 'Performance Optimization',
        agent: 'Performance Optimizer',
        prompt: `Optimize this ${dbType} database design for performance and scalability:\n\n${prompt}\n\nProvide:\n1. Index optimization strategies\n2. Query performance recommendations\n3. Scaling considerations\n4. Caching strategies\n5. Monitoring and maintenance guidelines`
      }
    ];

    try {
      for (let i = 0; i < taskDefinitions.length; i++) {
        const taskDef = taskDefinitions[i];
        const taskId = `${sessionId}_${taskDef.id}`;
        
        // Initialize task
        const task: StreamingTask = {
          id: taskId,
          title: taskDef.title,
          agent: taskDef.agent,
          status: 'active',
          content: '',
          startTime: new Date()
        };
        this.tasks.set(taskId, task);

        // Emit task start
        this.emit('chunk', {
          type: 'task_start',
          taskId,
          taskTitle: taskDef.title,
          agent: taskDef.agent,
          timestamp: new Date(),
          metadata: {
            totalTasks: taskDefinitions.length,
            completedTasks: i
          }
        } as RealStreamChunk);

        // Generate content using real AI streaming
        const result = await this.model.generateContentStream(taskDef.prompt);
        let fullContent = '';

        // Process real AI stream chunks
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullContent += chunkText;
            task.content = fullContent;
            
            // Emit real content chunk
            this.emit('chunk', {
              type: 'content_chunk',
              taskId,
              content: chunkText,
              timestamp: new Date(),
              metadata: {
                isComplete: false
              }
            } as RealStreamChunk);
          }
        }

        // Complete task
        task.status = 'completed';
        task.endTime = new Date();
        this.tasks.set(taskId, task);

        this.emit('chunk', {
          type: 'task_complete',
          taskId,
          timestamp: new Date(),
          metadata: {
            isComplete: true,
            totalTasks: taskDefinitions.length,
            completedTasks: i + 1
          }
        } as RealStreamChunk);
      }

      // Session complete
      this.emit('chunk', {
        type: 'session_complete',
        taskId: sessionId,
        timestamp: new Date(),
        metadata: {
          isComplete: true,
          totalTasks: taskDefinitions.length,
          completedTasks: taskDefinitions.length
        }
      } as RealStreamChunk);

    } catch (error) {
      console.error('Real streaming generation failed:', error);
      this.emit('chunk', {
        type: 'error',
        taskId: this.currentSession || 'unknown',
        content: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      } as RealStreamChunk);
      throw error;
    }
  }

  getTaskContent(taskId: string): string {
    return this.tasks.get(taskId)?.content || '';
  }

  getAllTasksContent(): Map<string, string> {
    const content = new Map<string, string>();
    this.tasks.forEach((task, taskId) => {
      if (task.status === 'completed') {
        content.set(taskId, task.content);
      }
    });
    return content;
  }

  getCurrentSession(): string | null {
    return this.currentSession;
  }

  getTasks(): StreamingTask[] {
    return Array.from(this.tasks.values());
  }

  destroy(): void {
    this.currentSession = null;
    this.tasks.clear();
    this.removeAllListeners();
  }
}

export const realTimeStreamingService = new RealTimeStreamingService();
export default realTimeStreamingService;
