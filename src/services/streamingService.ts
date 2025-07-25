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
    this.tasks.clear();
    this.emit('session_initialized', { sessionId });
  }

  /**
   * Start a new task
   */
  startTask(taskId: string, title: string, agent: string): void {
    const task: StreamingTask = {
      id: taskId,
      title,
      agent,
      status: 'active',
      startTime: new Date(),
      content: ''
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

    task.status = 'completed';
    task.endTime = new Date();
    this.tasks.set(taskId, task);

    this.emit('task_completed', { taskId, task });
  }

  /**
   * Complete the session
   */
  completeSession(): void {
    this.emit('session_completed', {
      sessionId: this.currentSession,
      tasks: Array.from(this.tasks.values())
    });
  }

  /**
   * Handle error
   */
  handleError(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'error';
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
   * Get content for a task
   */
  getTaskContent(taskId: string): string {
    const task = this.tasks.get(taskId);
    return task ? task.content : '';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.tasks.clear();
    this.currentSession = null;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
export default streamingService;