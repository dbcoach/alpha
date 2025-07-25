// Result Aggregation Service - Clean separation between streaming and final results
import { streamingService, type SessionCompletionResult, type FinalTaskResult } from './streamingService';

export interface GenerationPhase {
  id: string;
  type: 'analysis' | 'design' | 'implementation' | 'validation';
  title: string;
  content: string;
  agent: string;
  status: 'pending' | 'streaming' | 'completed' | 'failed';
  confidence?: number;
}

export interface FinalGenerationResult {
  sessionId: string;
  phases: GenerationPhase[];
  metadata: {
    totalDuration: number;
    completedPhases: number;
    generatedAt: Date;
    mode: 'streaming' | 'standard';
  };
}

export interface StreamingToGenerationOptions {
  cleanContent?: boolean;
  includeMetadata?: boolean;
  formatForDisplay?: boolean;
}

class ResultAggregationService {
  /**
   * Convert streaming session results to final generation format
   */
  convertStreamingToGeneration(
    completionResult: SessionCompletionResult,
    options: StreamingToGenerationOptions = {}
  ): FinalGenerationResult {
    const {
      cleanContent = true,
      includeMetadata = true,
      formatForDisplay = true
    } = options;

    const phases: GenerationPhase[] = [];

    // Convert each final task result to a generation phase
    for (const [taskId, taskResult] of completionResult.finalResults.entries()) {
      const phase: GenerationPhase = {
        id: taskId,
        type: this.inferPhaseType(taskResult.title, taskResult.content),
        title: this.formatPhaseTitle(taskResult.title),
        content: cleanContent ? this.cleanContentForDisplay(taskResult.content) : taskResult.content,
        agent: taskResult.agent,
        status: 'completed',
        confidence: this.calculateContentConfidence(taskResult.content)
      };

      phases.push(phase);
    }

    // Sort phases by logical order
    phases.sort((a, b) => this.getPhaseOrder(a.type) - this.getPhaseOrder(b.type));

    return {
      sessionId: completionResult.sessionId,
      phases,
      metadata: {
        totalDuration: completionResult.summary.totalDuration,
        completedPhases: completionResult.summary.completedTasks,
        generatedAt: new Date(),
        mode: 'streaming'
      }
    };
  }

  /**
   * Infer the phase type from task title and content
   */
  private inferPhaseType(title: string, content: string): GenerationPhase['type'] {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    if (titleLower.includes('analysis') || titleLower.includes('requirement')) {
      return 'analysis';
    }
    
    if (titleLower.includes('design') || titleLower.includes('schema') || contentLower.includes('create table')) {
      return 'design';
    }
    
    if (titleLower.includes('implementation') || titleLower.includes('package') || contentLower.includes('def ') || contentLower.includes('class ')) {
      return 'implementation';
    }
    
    if (titleLower.includes('validation') || titleLower.includes('quality') || titleLower.includes('assurance')) {
      return 'validation';
    }

    // Default based on content analysis
    if (contentLower.includes('create table') || contentLower.includes('schema')) return 'design';
    if (contentLower.includes('def ') || contentLower.includes('implementation')) return 'implementation';
    if (contentLower.includes('valid') || contentLower.includes('check')) return 'validation';
    
    return 'analysis'; // Default fallback
  }

  /**
   * Format phase title for display
   */
  private formatPhaseTitle(title: string): string {
    // Remove agent suffixes
    const cleanTitle = title.replace(/\s+(Agent|Analyst|Designer|Specialist)$/i, '');
    
    // Standardize common titles
    const titleMap: Record<string, string> = {
      'Requirements Analysis': 'Requirements Analysis',
      'Schema Design': 'Database Design',
      'Implementation Package': 'Implementation Package',
      'Quality Assurance': 'Quality Validation'
    };

    return titleMap[cleanTitle] || cleanTitle;
  }

  /**
   * Clean content for final display (remove streaming artifacts)
   */
  private cleanContentForDisplay(content: string): string {
    let cleanedContent = content
      // Remove progress indicators
      .replace(/Generating[^.]*\.\.\./gi, '')
      .replace(/Processing[^.]*\.\.\./gi, '')
      .replace(/Analyzing[^.]*\.\.\./gi, '')
      
      // Remove streaming markers
      .replace(/^[\s]*[-=]{3,}[\s]*$/gm, '')
      .replace(/^[\s]*\[STREAMING\][\s]*/gm, '')
      .replace(/^[\s]*\[PROGRESS\][\s]*/gm, '')
      
      // Clean up formatting
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/^[\s\n]+|[\s\n]+$/g, '') // Trim
      .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2'); // Proper paragraph spacing

    // Preserve code blocks and structured content
    const hasCodeBlocks = cleanedContent.includes('```');
    const hasMarkdownHeaders = cleanedContent.includes('##');
    
    // Only remove incomplete sentences if content doesn't have structured elements
    if (!hasCodeBlocks && !hasMarkdownHeaders) {
      // More conservative approach - only remove if it's clearly incomplete
      const lines = cleanedContent.split('\n');
      const lastLine = lines[lines.length - 1]?.trim();
      
      // Only remove last line if it's very short and doesn't end with punctuation or colon
      if (lastLine && lastLine.length < 30 && !lastLine.match(/[.!?:]$/) && !lastLine.includes(':')) {
        lines.pop();
        cleanedContent = lines.join('\n');
      }
    }
    
    return cleanedContent.trim();
  }

  /**
   * Calculate content confidence based on completeness indicators
   */
  private calculateContentConfidence(content: string): number {
    let confidence = 1.0;
    
    // More lenient confidence calculation
    // Penalize for obvious incompleteness but be less aggressive
    if (content.includes('...') && content.split('...').length > 2) confidence *= 0.9; // Only penalize if multiple ellipses
    if (content.length < 50) confidence *= 0.8; // Only penalize very short content
    
    // Don't penalize for code blocks or structured content without ending punctuation
    const hasStructuredContent = content.includes('```') || content.includes('##') || content.includes('CREATE TABLE');
    if (!hasStructuredContent && !content.trim().endsWith('.') && !content.trim().endsWith(':')) {
      confidence *= 0.95; // Small penalty only
    }
    
    // Reward for quality indicators
    if (content.includes('```')) confidence *= 1.1;
    if (content.includes('##') || content.includes('###')) confidence *= 1.05;
    if (content.includes('CREATE TABLE') || content.includes('def ') || content.includes('class ')) confidence *= 1.1;
    
    // Reward for proper sentence structure
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 10);
    if (sentences.length >= 3) confidence *= 1.05;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get logical order for phases
   */
  private getPhaseOrder(type: GenerationPhase['type']): number {
    const order = {
      'analysis': 1,
      'design': 2,
      'implementation': 3,
      'validation': 4
    };
    return order[type] || 99;
  }

  /**
   * Wait for streaming to complete and then convert results
   */
  async waitForStreamingComplete(
    sessionId: string,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<FinalGenerationResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for streaming completion'));
      }, maxWaitTime);

      const handleSessionComplete = (result: SessionCompletionResult) => {
        if (result.sessionId === sessionId) {
          clearTimeout(timeout);
          streamingService.removeAllListeners('session_completed');
          
          const finalResult = this.convertStreamingToGeneration(result);
          resolve(finalResult);
        }
      };

      streamingService.on('session_completed', handleSessionComplete);
    });
  }

  /**
   * Get current streaming status for a session
   */
  getStreamingStatus(sessionId: string): {
    isComplete: boolean;
    activeTasks: number;
    completedTasks: number;
    totalTasks: number;
  } {
    const status = streamingService.getSessionStatus();
    
    return {
      isComplete: status.activeTasks === 0 && status.totalTasks > 0,
      activeTasks: status.activeTasks?.id ? 1 : 0,
      completedTasks: status.completedTasks,
      totalTasks: status.totalTasks
    };
  }

  /**
   * Force completion of streaming session (emergency use)
   */
  forceStreamingComplete(sessionId: string): FinalGenerationResult | null {
    console.warn('🚨 Force completing streaming session:', sessionId);
    
    try {
      const completionResult = streamingService.completeSession();
      return this.convertStreamingToGeneration(completionResult);
    } catch (error) {
      console.error('Failed to force complete streaming:', error);
      return null;
    }
  }
}

export const resultAggregationService = new ResultAggregationService();
export default resultAggregationService;