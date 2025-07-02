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
  progress: number; // 0-100
  estimatedTime: number; // seconds
  startTime?: Date;
  endTime?: Date;
  subtasks: StreamingSubtask[];
}

export interface StreamingSubtask {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
}

export interface StreamChunk {
  type: 'text' | 'task_update' | 'progress' | 'completion' | 'error';
  taskId?: string;
  content?: string;
  metadata?: {
    agent?: string;
    reasoning?: string;
    progress?: number;
    estimatedRemaining?: number;
  };
  timestamp: Date;
}

export interface StreamingConfig {
  textSpeed: number; // characters per second (default: 40)
  enableInterruption: boolean;
  enableSpeedControl: boolean;
  bufferSize: number;
}

class StreamingService extends EventEmitter {
  private tasks: Map<string, StreamingTask> = new Map();
  private activeStreams: Map<string, boolean> = new Map();
  private streamBuffers: Map<string, string[]> = new Map();
  private renderQueues: Map<string, string[]> = new Map();
  private config: StreamingConfig;
  private animationFrameId: number | null = null;
  private lastRenderTime: number = 0;

  constructor(config?: Partial<StreamingConfig>) {
    super();
    this.config = {
      textSpeed: 40, // 40 chars per second
      enableInterruption: true,
      enableSpeedControl: true,
      bufferSize: 1000,
      ...config
    };
  }

  /**
   * Initialize a streaming session with predefined tasks
   */
  initializeSession(sessionId: string, tasks: Omit<StreamingTask, 'id'>[]): void {
    this.tasks.clear();
    
    tasks.forEach((task, index) => {
      const taskId = `${sessionId}_task_${index}`;
      this.tasks.set(taskId, {
        ...task,
        id: taskId,
        status: index === 0 ? 'active' : 'pending'
      });
    });

    this.emit('session_initialized', {
      sessionId,
      tasks: Array.from(this.tasks.values())
    });
  }

  /**
   * Start streaming content for a specific task
   */
  startTaskStream(taskId: string, content: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update task status
    task.status = 'active';
    task.startTime = new Date();
    this.tasks.set(taskId, task);

    // Initialize streaming buffers
    this.streamBuffers.set(taskId, content.split(''));
    this.renderQueues.set(taskId, []);
    this.activeStreams.set(taskId, true);

    this.emit('task_started', { taskId, task });
    
    // Start the rendering loop if not already running
    if (!this.animationFrameId) {
      this.startRenderLoop();
    }
  }

  /**
   * Update task progress
   */
  updateTaskProgress(taskId: string, progress: number, reasoning?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = Math.min(100, Math.max(0, progress));
    this.tasks.set(taskId, task);

    this.emit('task_progress', {
      taskId,
      progress: task.progress,
      reasoning,
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
    task.progress = 100;
    this.tasks.set(taskId, task);

    // Stop streaming for this task
    this.activeStreams.set(taskId, false);

    this.emit('task_completed', { taskId, task });

    // Start next pending task
    this.startNextTask();
  }

  /**
   * Start the next pending task
   */
  private startNextTask(): void {
    const nextTask = Array.from(this.tasks.values())
      .find(task => task.status === 'pending');
    
    if (nextTask) {
      nextTask.status = 'active';
      nextTask.startTime = new Date();
      this.tasks.set(nextTask.id, nextTask);
      
      this.emit('task_started', { taskId: nextTask.id, task: nextTask });
    } else {
      // All tasks completed
      this.emit('session_completed', {
        tasks: Array.from(this.tasks.values())
      });
      this.stopRenderLoop();
    }
  }

  /**
   * Main rendering loop for character-by-character streaming
   */
  private startRenderLoop(): void {
    const render = (currentTime: number) => {
      if (currentTime - this.lastRenderTime >= 1000 / 60) { // 60 FPS
        this.processStreamingChunks();
        this.lastRenderTime = currentTime;
      }

      // Continue loop if there are active streams
      if (Array.from(this.activeStreams.values()).some(active => active)) {
        this.animationFrameId = requestAnimationFrame(render);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  /**
   * Process streaming chunks for all active tasks
   */
  private processStreamingChunks(): void {
    this.activeStreams.forEach((isActive, taskId) => {
      if (!isActive) return;

      const buffer = this.streamBuffers.get(taskId);
      const queue = this.renderQueues.get(taskId);
      
      if (!buffer || !queue) return;

      // Calculate how many characters to render this frame
      const charsPerFrame = Math.max(1, Math.floor(this.config.textSpeed / 60));
      
      for (let i = 0; i < charsPerFrame && buffer.length > 0; i++) {
        const char = buffer.shift();
        if (char) {
          queue.push(char);
          
          // Emit character stream event
          this.emit('character_streamed', {
            taskId,
            character: char,
            remaining: buffer.length,
            rendered: queue.join('')
          });
        }
      }

      // If buffer is empty, mark as complete
      if (buffer.length === 0) {
        this.activeStreams.set(taskId, false);
      }
    });
  }

  /**
   * Stop rendering loop
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Pause streaming for all tasks
   */
  pauseStreaming(): void {
    this.activeStreams.forEach((_, taskId) => {
      this.activeStreams.set(taskId, false);
    });
    this.stopRenderLoop();
    this.emit('streaming_paused');
  }

  /**
   * Resume streaming
   */
  resumeStreaming(): void {
    const hasActiveStreams = Array.from(this.streamBuffers.entries())
      .some(([taskId, buffer]) => {
        const task = this.tasks.get(taskId);
        return task?.status === 'active' && buffer.length > 0;
      });

    if (hasActiveStreams) {
      this.activeStreams.forEach((_, taskId) => {
        const buffer = this.streamBuffers.get(taskId);
        const task = this.tasks.get(taskId);
        if (buffer && buffer.length > 0 && task?.status === 'active') {
          this.activeStreams.set(taskId, true);
        }
      });
      
      if (!this.animationFrameId) {
        this.startRenderLoop();
      }
      this.emit('streaming_resumed');
    }
  }

  /**
   * Adjust streaming speed
   */
  setStreamingSpeed(speed: number): void {
    this.config.textSpeed = Math.max(10, Math.min(200, speed));
    this.emit('speed_changed', { speed: this.config.textSpeed });
  }

  /**
   * Get current session status
   */
  getSessionStatus(): {
    tasks: StreamingTask[];
    totalProgress: number;
    activeTask?: StreamingTask;
    estimatedTimeRemaining: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length;
    const activeTask = tasks.find(task => task.status === 'active');
    
    // Calculate estimated time remaining
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const remainingTasks = tasks.length - completedTasks;
    const avgTaskTime = 30; // seconds per task average
    const estimatedTimeRemaining = remainingTasks * avgTaskTime;

    return {
      tasks,
      totalProgress,
      activeTask,
      estimatedTimeRemaining
    };
  }

  /**
   * Get rendered content for a task
   */
  getTaskContent(taskId: string): string {
    const queue = this.renderQueues.get(taskId);
    return queue ? queue.join('') : '';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopRenderLoop();
    this.tasks.clear();
    this.activeStreams.clear();
    this.streamBuffers.clear();
    this.renderQueues.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
export default streamingService;