// React hook for agent cleanup functionality
import { useState, useEffect, useCallback } from 'react';
import { agentCleanupService, type AgentHealthCheck, type CleanupStats } from '../services/agentCleanupService';

export interface UseAgentCleanupOptions {
  autoStart?: boolean;
  healthCheckInterval?: number;
}

export function useAgentCleanup(options: UseAgentCleanupOptions = {}) {
  const { autoStart = true, healthCheckInterval = 30000 } = options;
  
  const [isCleanupActive, setIsCleanupActive] = useState(false);
  const [healthChecks, setHealthChecks] = useState<AgentHealthCheck[]>([]);
  const [lastCleanupStats, setLastCleanupStats] = useState<CleanupStats | null>(null);
  const [agentSummary, setAgentSummary] = useState(agentCleanupService.getAgentStatusSummary());

  // Start cleanup service on mount if autoStart is enabled
  useEffect(() => {
    if (autoStart) {
      agentCleanupService.startCleanupService();
      setIsCleanupActive(true);
    }

    return () => {
      if (autoStart) {
        agentCleanupService.stopCleanupService();
        setIsCleanupActive(false);
      }
    };
  }, [autoStart]);

  // Periodic health check updates
  useEffect(() => {
    if (!isCleanupActive) return;

    const interval = setInterval(async () => {
      try {
        const checks = await agentCleanupService.performHealthCheck();
        setHealthChecks(checks);
        setAgentSummary(agentCleanupService.getAgentStatusSummary());
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, healthCheckInterval);

    return () => clearInterval(interval);
  }, [isCleanupActive, healthCheckInterval]);

  // Start cleanup service
  const startCleanup = useCallback(() => {
    agentCleanupService.startCleanupService();
    setIsCleanupActive(true);
  }, []);

  // Stop cleanup service
  const stopCleanup = useCallback(() => {
    agentCleanupService.stopCleanupService();
    setIsCleanupActive(false);
  }, []);

  // Force cleanup stuck agents
  const forceCleanupStuck = useCallback(() => {
    const stats = agentCleanupService.forceCleanupStuckAgents();
    setLastCleanupStats(stats);
    setAgentSummary(agentCleanupService.getAgentStatusSummary());
    return stats;
  }, []);

  // Emergency reset
  const emergencyReset = useCallback(() => {
    agentCleanupService.emergencyReset();
    setHealthChecks([]);
    setLastCleanupStats(null);
    setAgentSummary(agentCleanupService.getAgentStatusSummary());
  }, []);

  // Manual health check
  const performHealthCheck = useCallback(async () => {
    try {
      const checks = await agentCleanupService.performHealthCheck();
      setHealthChecks(checks);
      setAgentSummary(agentCleanupService.getAgentStatusSummary());
      return checks;
    } catch (error) {
      console.error('Manual health check failed:', error);
      return [];
    }
  }, []);

  // Configure cleanup thresholds
  const configureThresholds = useCallback((config: {
    stuckThreshold?: number;
    orphanThreshold?: number;
    cleanupInterval?: number;
  }) => {
    agentCleanupService.configureThresholds(config);
  }, []);

  // Get diagnostics
  const getDiagnostics = useCallback(() => {
    return agentCleanupService.getDiagnostics();
  }, []);

  // Get stuck agents count
  const getStuckAgentsCount = useCallback(() => {
    return agentSummary.stuck + agentSummary.orphaned;
  }, [agentSummary]);

  // Check if any agents are stuck
  const hasStuckAgents = getStuckAgentsCount() > 0;

  return {
    // State
    isCleanupActive,
    healthChecks,
    lastCleanupStats,
    agentSummary,
    hasStuckAgents,
    
    // Actions
    startCleanup,
    stopCleanup,
    forceCleanupStuck,
    emergencyReset,
    performHealthCheck,
    configureThresholds,
    getDiagnostics,
    getStuckAgentsCount,
    
    // Computed
    totalAgents: agentSummary.healthy + agentSummary.stuck + agentSummary.orphaned + agentSummary.completed + agentSummary.failed,
    activeAgents: agentSummary.healthy + agentSummary.stuck + agentSummary.orphaned,
    problemAgents: agentSummary.stuck + agentSummary.orphaned + agentSummary.failed
  };
}

export default useAgentCleanup;