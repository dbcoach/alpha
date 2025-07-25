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

export interface StreamingTask {
  id: string;
  title: string;
  agent: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  content: string;
  timeout?: NodeJS.Timeout;
}

export interface FinalTaskResult {
  taskId: string;
  title: string;
  agent: string;
  content: string;
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface SessionCompletionResult {
  sessionId: string;
  finalResults: Map<string, FinalTaskResult>;
  summary: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalDuration: number;
  };
}

export interface StreamChunk {
  type: 'task_start' | 'content' | 'task_complete' | 'session_complete' | 'error';
  taskId: string;
  content?: string;
  metadata?: {
    agent?: string;
    taskTitle?: string;
  };
  timestamp: Date;
}

export interface StreamingConfig {
  enableInterruption: boolean;
}

class StreamingService extends EventEmitter {
  private tasks: Map<string, StreamingTask> = new Map();
  private config: StreamingConfig;
  private currentSession: string | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly TASK_TIMEOUT = 60000; // 60 seconds timeout per task

  constructor(config?: Partial<StreamingConfig>) {
    super();
    this.config = {
      enableInterruption: true,
      ...config
    };
  }

  /**
   * Initialize a streaming session
   */
  initializeSession(sessionId: string): void {
    this.currentSession = sessionId;
    this.cleanupTasks();
    this.tasks.clear();
    this.startCleanupInterval();
    this.emit('session_initialized', { sessionId });
  }

  /**
   * Start a new task
   */
  startTask(taskId: string, title: string, agent: string): void {
    // Clear any existing timeout for this task
    const existingTask = this.tasks.get(taskId);
    if (existingTask?.timeout) {
      clearTimeout(existingTask.timeout);
    }

    const timeout = setTimeout(() => {
      this.handleTaskTimeout(taskId);
    }, this.TASK_TIMEOUT);

    const task: StreamingTask = {
      id: taskId,
      title,
      agent,
      status: 'active',
      startTime: new Date(),
      content: '',
      timeout
    };
    
    this.tasks.set(taskId, task);
    this.emit('task_started', { taskId, task });
  }

  /**
   * Add content to a task
   */
  addTaskContent(taskId: string, content: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.content += content;
    this.tasks.set(taskId, task);

    this.emit('content_chunk', {
      taskId,
      content,
      timestamp: new Date()
    });
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Clear timeout
    if (task.timeout) {
      clearTimeout(task.timeout);
      task.timeout = undefined;
    }

    task.status = 'completed';
    task.endTime = new Date();
    this.tasks.set(taskId, task);

    this.emit('task_completed', { taskId, task });
  }

  /**
   * Complete the session and prepare final results
   */
  completeSession(): SessionCompletionResult {
    // Aggregate all completed task content into final results
    const finalResults = new Map<string, FinalTaskResult>();
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed') {
        finalResults.set(taskId, {
          taskId,
          title: task.title,
          agent: task.agent,
          content: task.content.trim(), // Clean up streaming artifacts
          startTime: task.startTime!,
          endTime: task.endTime!,
          duration: task.endTime!.getTime() - task.startTime!.getTime()
        });
      }
    }
    
    const completionResult: SessionCompletionResult = {
      sessionId: this.currentSession!,
      finalResults,
      summary: {
        totalTasks: this.tasks.size,
        completedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length,
        failedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'error').length,
        totalDuration: this.calculateTotalDuration()
      }
    };
    
    this.emit('session_completed', completionResult);
    return completionResult;
  }

  /**
   * Handle error
   */
  handleError(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      // Clear timeout
      if (task.timeout) {
        clearTimeout(task.timeout);
        task.timeout = undefined;
      }
      
      task.status = 'error';
      task.endTime = new Date();
      this.tasks.set(taskId, task);
    }
    
    this.emit('error', {
      taskId,
      error,
      timestamp: new Date()
    });
  }

  /**
   * Get current session status
   */
  getSessionStatus(): {
    tasks: StreamingTask[];
    activeTask?: StreamingTask;
    completedTasks: number;
    totalTasks: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const activeTask = tasks.find(task => task.status === 'active');
    const completedTasks = tasks.filter(task => task.status === 'completed').length;

    return {
      tasks,
      activeTask,
      completedTasks,
      totalTasks: tasks.length
    };
  }

  /**
   * Get content for a task (streaming - real-time access)
   */
  getTaskContent(taskId: string): string {
    const task = this.tasks.get(taskId);
    return task ? task.content : '';
  }

  /**
   * Get final results (only for completed tasks)
   */
  getFinalResults(): Map<string, FinalTaskResult> {
    const finalResults = new Map<string, FinalTaskResult>();
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed') {
        finalResults.set(taskId, {
          taskId,
          title: task.title,
          agent: task.agent,
          content: this.cleanContent(task.content),
          startTime: task.startTime!,
          endTime: task.endTime!,
          duration: task.endTime!.getTime() - task.startTime!.getTime()
        });
      }
    }
    
    return finalResults;
  }

  /**
   * Clean streaming artifacts from content
   */
  private cleanContent(content: string): string {
    return content
      .trim()
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/^[\s\n]+|[\s\n]+$/g, '') // Trim whitespace
      .replace(/Generating.*?\.\.\./gi, '') // Remove progress messages
      .replace(/^\s*-+\s*$/gm, '') // Remove separator lines
      .trim();
  }

  /**
   * Calculate total session duration
   */
  private calculateTotalDuration(): number {
    const completedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'completed' && task.startTime && task.endTime);
    
    if (completedTasks.length === 0) return 0;
    
    const earliest = Math.min(...completedTasks.map(task => task.startTime!.getTime()));
    const latest = Math.max(...completedTasks.map(task => task.endTime!.getTime()));
    
    return latest - earliest;
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'active') {
      console.warn(`Task ${taskId} (${task.title}) timed out after ${this.TASK_TIMEOUT}ms`);
      this.handleError(taskId, `Task timed out after ${this.TASK_TIMEOUT/1000} seconds`);
    }
  }

  /**
   * Start periodic cleanup of orphaned tasks
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupOrphanedTasks();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Clean up orphaned tasks that have been active too long
   */
  private cleanupOrphanedTasks(): void {
    const now = new Date().getTime();
    const orphanTimeout = this.TASK_TIMEOUT * 2; // Double timeout for orphan cleanup
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'active' && task.startTime) {
        const taskAge = now - task.startTime.getTime();
        if (taskAge > orphanTimeout) {
          console.warn(`Cleaning up orphaned task: ${taskId} (${task.title}) - Age: ${taskAge}ms`);
          this.handleError(taskId, `Task orphaned - exceeded ${orphanTimeout/1000} seconds`);
        }
      }
    }
  }

  /**
   * Force complete all active tasks (emergency cleanup)
   */
  forceCompleteAllTasks(): void {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'active') {
        console.warn(`Force completing stuck task: ${taskId} (${task.title})`);
        this.handleError(taskId, 'Task force completed due to cleanup');
      }
    }
  }

  /**
   * Clean up task timeouts
   */
  private cleanupTasks(): void {
    for (const task of this.tasks.values()) {
      if (task.timeout) {
        clearTimeout(task.timeout);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cleanupTasks();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.tasks.clear();
    this.currentSession = null;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
export default streamingService;