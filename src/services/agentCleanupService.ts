// Agent Cleanup Service for handling stuck and orphaned agents
import { streamingService } from './streamingService';
import { streamingDataCapture } from './streamingDataCapture';

export interface AgentHealthCheck {
  sessionId: string;
  taskId: string;
  agent: string;
  status: 'healthy' | 'stuck' | 'orphaned' | 'timeout';
  age: number;
  lastActivity?: Date;
}

export interface CleanupStats {
  totalTasks: number;
  activeTasks: number;
  stuckTasks: number;
  cleanedTasks: number;
  orphanedSessions: number;
}

class AgentCleanupService {
  private readonly STUCK_THRESHOLD = 120000; // 2 minutes
  private readonly ORPHAN_THRESHOLD = 300000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the automatic cleanup service
   */
  startCleanupService(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.cleanupTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.CLEANUP_INTERVAL);

    console.log('🧹 Agent cleanup service started');
  }

  /**
   * Stop the cleanup service
   */
  stopCleanupService(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.isRunning = false;
    console.log('🛑 Agent cleanup service stopped');
  }

  /**
   * Perform a health check on all active agents
   */
  async performHealthCheck(): Promise<AgentHealthCheck[]> {
    const healthChecks: AgentHealthCheck[] = [];
    const sessionStatus = streamingService.getSessionStatus();
    const now = new Date().getTime();

    // Check active tasks
    for (const task of sessionStatus.tasks) {
      if (task.status === 'active' && task.startTime) {
        const age = now - task.startTime.getTime();
        let status: AgentHealthCheck['status'] = 'healthy';

        if (age > this.ORPHAN_THRESHOLD) {
          status = 'orphaned';
        } else if (age > this.STUCK_THRESHOLD) {
          status = 'stuck';
        }

        healthChecks.push({
          sessionId: 'current',
          taskId: task.id,
          agent: task.agent,
          status,
          age,
          lastActivity: task.startTime
        });

        // Auto-cleanup stuck or orphaned tasks
        if (status === 'stuck' || status === 'orphaned') {
          console.warn(`🚨 Cleaning up ${status} task: ${task.id} (${task.agent}) - Age: ${age}ms`);
          streamingService.handleError(task.id, `Task ${status} - automatically cleaned up`);
        }
      }
    }

    if (healthChecks.length > 0) {
      console.log(`🔍 Health check completed: ${healthChecks.length} tasks checked`);
    }

    return healthChecks;
  }

  /**
   * Force cleanup all stuck agents
   */
  forceCleanupStuckAgents(): CleanupStats {
    const sessionStatus = streamingService.getSessionStatus();
    const now = new Date().getTime();
    
    let stuckTasks = 0;
    let cleanedTasks = 0;

    for (const task of sessionStatus.tasks) {
      if (task.status === 'active' && task.startTime) {
        const age = now - task.startTime.getTime();
        
        if (age > this.STUCK_THRESHOLD) {
          stuckTasks++;
          console.warn(`🧹 Force cleaning stuck task: ${task.id} (${task.agent})`);
          streamingService.handleError(task.id, 'Force cleaned - stuck agent');
          cleanedTasks++;
        }
      }
    }

    // Also force complete any remaining active tasks
    streamingService.forceCompleteAllTasks();

    const stats: CleanupStats = {
      totalTasks: sessionStatus.totalTasks,
      activeTasks: sessionStatus.tasks.filter(t => t.status === 'active').length,
      stuckTasks,
      cleanedTasks,
      orphanedSessions: 0
    };

    console.log('🧹 Force cleanup completed:', stats);
    return stats;
  }

  /**
   * Get current agent status summary
   */
  getAgentStatusSummary(): {
    healthy: number;
    stuck: number;
    orphaned: number;
    completed: number;
    failed: number;
  } {
    const sessionStatus = streamingService.getSessionStatus();
    const now = new Date().getTime();
    
    const summary = {
      healthy: 0,
      stuck: 0,
      orphaned: 0,
      completed: 0,
      failed: 0
    };

    for (const task of sessionStatus.tasks) {
      switch (task.status) {
        case 'completed':
          summary.completed++;
          break;
        case 'error':
          summary.failed++;
          break;
        case 'active':
          if (task.startTime) {
            const age = now - task.startTime.getTime();
            if (age > this.ORPHAN_THRESHOLD) {
              summary.orphaned++;
            } else if (age > this.STUCK_THRESHOLD) {
              summary.stuck++;
            } else {
              summary.healthy++;
            }
          } else {
            summary.stuck++;
          }
          break;
      }
    }

    return summary;
  }

  /**
   * Reset all agent states (emergency function)
   */
  emergencyReset(): void {
    console.warn('🚨 EMERGENCY RESET: Clearing all agent states');
    
    // Force complete all tasks
    streamingService.forceCompleteAllTasks();
    
    // Destroy and reinitialize streaming service
    streamingService.destroy();
    
    console.log('✅ Emergency reset completed');
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics(): {
    isCleanupRunning: boolean;
    thresholds: {
      stuck: number;
      orphan: number;
      cleanup: number;
    };
    lastCheck?: Date;
    summary: ReturnType<typeof this.getAgentStatusSummary>;
  } {
    return {
      isCleanupRunning: this.isRunning,
      thresholds: {
        stuck: this.STUCK_THRESHOLD,
        orphan: this.ORPHAN_THRESHOLD,
        cleanup: this.CLEANUP_INTERVAL
      },
      summary: this.getAgentStatusSummary()
    };
  }

  /**
   * Configure cleanup thresholds
   */
  configureThresholds(config: {
    stuckThreshold?: number;
    orphanThreshold?: number;
    cleanupInterval?: number;
  }): void {
    if (config.stuckThreshold) {
      Object.defineProperty(this, 'STUCK_THRESHOLD', { value: config.stuckThreshold });
    }
    if (config.orphanThreshold) {
      Object.defineProperty(this, 'ORPHAN_THRESHOLD', { value: config.orphanThreshold });
    }
    if (config.cleanupInterval) {
      Object.defineProperty(this, 'CLEANUP_INTERVAL', { value: config.cleanupInterval });
      
      // Restart timer with new interval
      if (this.isRunning) {
        this.stopCleanupService();
        this.startCleanupService();
      }
    }
    
    console.log('⚙️ Cleanup thresholds updated:', {
      stuck: this.STUCK_THRESHOLD,
      orphan: this.ORPHAN_THRESHOLD,
      interval: this.CLEANUP_INTERVAL
    });
  }
}

export const agentCleanupService = new AgentCleanupService();
export default agentCleanupService;