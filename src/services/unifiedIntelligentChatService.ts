import { SavedConversation } from './conversationStorage';
import { IntelligentAIChatService, ChatResponse } from './intelligentAIChatService';
import { IntentDrivenDatabaseAgent, TaskExecutionResult } from './intentDrivenDatabaseAgent';

export interface UnifiedChatResponse extends ChatResponse {
  taskExecution?: TaskExecutionResult;
  suggestions: {
    quickActions: string[];
    relatedQuestions: string[];
    nextSteps: string[];
  };
  metadata: {
    processingTime: number;
    aiConfidence: number;
    intentClarity: number;
    contextRelevance: number;
  };
}

export interface ChatSession {
  conversationId: string;
  messageHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  context: SavedConversation;
  activeIntent?: string;
}

/**
 * Unified Intelligent Chat Service that combines AI chat and database agent capabilities
 * This is the main service that replaces the existing AIChatService
 */
export class UnifiedIntelligentChatService {
  private aiChatService: IntelligentAIChatService;
  private databaseAgent: IntentDrivenDatabaseAgent;
  private activeSessions: Map<string, ChatSession> = new Map();

  constructor() {
    this.aiChatService = new IntelligentAIChatService();
    this.databaseAgent = new IntentDrivenDatabaseAgent();
  }

  /**
   * Main method to process user questions with full intelligence
   * This replaces AIChatService.generateResponse
   */
  async processUserQuestion(
    conversation: SavedConversation,
    userQuestion: string,
    sessionId?: string
  ): Promise<UnifiedChatResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🧠 Processing intelligent user question:', userQuestion);

      // Step 1: Initialize or get chat session
      const session = this.getOrCreateSession(conversation, sessionId);
      
      // Step 2: Add user message to session
      session.messageHistory.push({
        role: 'user',
        content: userQuestion,
        timestamp: new Date()
      });

      // Step 3: Get intelligent AI response
      console.log('🤖 Getting AI analysis...');
      const aiResponse = await this.aiChatService.generateIntelligentResponse(
        conversation,
        userQuestion
      );

      // Step 4: Determine if this requires database task execution
      const requiresExecution = this.shouldExecuteDatabaseTask(aiResponse);
      
      let taskExecution: TaskExecutionResult | undefined;
      if (requiresExecution) {
        console.log('⚙️ Executing database task...');
        taskExecution = await this.databaseAgent.executeDatabaseTask(
          userQuestion,
          conversation,
          aiResponse.intent
        );
      }

      // Step 5: Create unified response
      const response = await this.createUnifiedResponse(
        aiResponse,
        taskExecution,
        session,
        startTime
      );

      // Step 6: Add assistant response to session
      session.messageHistory.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          intent: response.intent,
          confidence: response.confidence,
          taskExecuted: !!taskExecution
        }
      });

      // Step 7: Update session context
      session.activeIntent = aiResponse.intent;
      this.activeSessions.set(session.conversationId, session);

      console.log('✅ Intelligent response completed');
      return response;

    } catch (error) {
      console.error('❌ Unified chat processing failed:', error);
      
      return {
        content: "I apologize, but I encountered an error processing your request. Let me help you in a different way. Could you please rephrase your question or let me know specifically what you'd like to accomplish with your database?",
        type: 'text',
        confidence: 0.1,
        intent: 'error',
        suggestions: {
          quickActions: ['Ask about schema', 'Get help with queries', 'Explain database concepts'],
          relatedQuestions: [
            'What tables are in my database?',
            'How do I write a query?',
            'What are database best practices?'
          ],
          nextSteps: ['Try a more specific question', 'Ask for help with a particular task']
        },
        metadata: {
          processingTime: Date.now() - startTime,
          aiConfidence: 0.1,
          intentClarity: 0.1,
          contextRelevance: 0.1
        }
      };
    }
  }

  /**
   * Get or create a chat session
   */
  private getOrCreateSession(conversation: SavedConversation, sessionId?: string): ChatSession {
    const id = sessionId || conversation.id;
    
    if (this.activeSessions.has(id)) {
      const session = this.activeSessions.get(id)!;
      // Update context with latest conversation data
      session.context = conversation;
      return session;
    }

    // Create new session
    const session: ChatSession = {
      conversationId: id,
      messageHistory: [],
      context: conversation
    };

    this.activeSessions.set(id, session);
    return session;
  }

  /**
   * Determine if the response requires database task execution
   */
  private shouldExecuteDatabaseTask(aiResponse: ChatResponse): boolean {
    const executionIntents = [
      'schema_design',
      'query_help', 
      'performance',
      'migration',
      'implementation'
    ];

    return aiResponse.intent ? executionIntents.includes(aiResponse.intent) : false;
  }

  /**
   * Create unified response combining AI chat and task execution
   */
  private async createUnifiedResponse(
    aiResponse: ChatResponse,
    taskExecution: TaskExecutionResult | undefined,
    session: ChatSession,
    startTime: number
  ): Promise<UnifiedChatResponse> {
    
    let enhancedContent = aiResponse.content;
    
    // If we have task execution results, enhance the response
    if (taskExecution && taskExecution.success) {
      enhancedContent += '\n\n## 🎯 Executed Solution\n\n';
      
      if (taskExecution.result.sql) {
        enhancedContent += '### Generated SQL:\n```sql\n' + taskExecution.result.sql + '\n```\n\n';
      }
      
      enhancedContent += '### Explanation:\n' + taskExecution.result.explanation + '\n\n';
      enhancedContent += '### Reasoning:\n' + taskExecution.result.reasoning + '\n\n';
      
      if (taskExecution.result.bestPractices.length > 0) {
        enhancedContent += '### ✅ Best Practices Applied:\n';
        taskExecution.result.bestPractices.forEach(practice => {
          enhancedContent += `- ${practice}\n`;
        });
        enhancedContent += '\n';
      }

      if (taskExecution.result.warnings.length > 0) {
        enhancedContent += '### ⚠️ Important Considerations:\n';
        taskExecution.result.warnings.forEach(warning => {
          enhancedContent += `- ${warning}\n`;
        });
        enhancedContent += '\n';
      }
    }

    // Generate intelligent suggestions
    const suggestions = this.generateIntelligentSuggestions(aiResponse, taskExecution, session);

    // Calculate metadata
    const processingTime = Date.now() - startTime;
    const metadata = {
      processingTime,
      aiConfidence: aiResponse.confidence || 0.8,
      intentClarity: this.calculateIntentClarity(aiResponse),
      contextRelevance: this.calculateContextRelevance(session)
    };

    return {
      content: enhancedContent,
      type: taskExecution?.result.sql ? 'sql' : aiResponse.type,
      confidence: taskExecution ? 
        Math.min(aiResponse.confidence || 0.8, taskExecution.confidence) : 
        aiResponse.confidence,
      intent: aiResponse.intent,
      actions: aiResponse.actions,
      followUpQuestions: aiResponse.followUpQuestions,
      taskExecution,
      suggestions,
      metadata
    };
  }

  /**
   * Generate intelligent suggestions based on context
   */
  private generateIntelligentSuggestions(
    aiResponse: ChatResponse,
    taskExecution: TaskExecutionResult | undefined,
    session: ChatSession
  ): UnifiedChatResponse['suggestions'] {
    
    const quickActions: string[] = [];
    const relatedQuestions: string[] = [];
    const nextSteps: string[] = [];

    // Generate actions based on intent
    switch (aiResponse.intent) {
      case 'schema_design':
        quickActions.push('Add indexes', 'Create sample data', 'Generate API endpoints');
        relatedQuestions.push(
          'How do I add relationships between tables?',
          'What indexes should I create?',
          'How do I handle data validation?'
        );
        nextSteps.push('Test the schema', 'Add constraints', 'Plan data migration');
        break;

      case 'query_help':
        quickActions.push('Optimize query', 'Explain execution plan', 'Add indexes');
        relatedQuestions.push(
          'How can I make this query faster?',
          'What indexes would help?',
          'How do I handle large result sets?'
        );
        nextSteps.push('Test query performance', 'Monitor execution time', 'Consider caching');
        break;

      case 'performance':
        quickActions.push('Analyze slow queries', 'Suggest indexes', 'Review schema');
        relatedQuestions.push(
          'What are the slowest queries?',
          'How do I monitor performance?',
          'When should I consider partitioning?'
        );
        nextSteps.push('Implement optimizations', 'Monitor improvements', 'Set up alerts');
        break;

      default:
        quickActions.push('Ask about schema', 'Write a query', 'Optimize performance');
        relatedQuestions.push(
          'How is my database structured?',
          'What can I do with this data?',
          'How do I improve performance?'
        );
        nextSteps.push('Explore your database', 'Try specific queries', 'Learn best practices');
    }

    // Add task-specific suggestions if execution occurred
    if (taskExecution && taskExecution.success) {
      nextSteps.unshift(...taskExecution.result.nextSteps);
    }

    // Add follow-up questions from AI response
    if (aiResponse.followUpQuestions) {
      relatedQuestions.unshift(...aiResponse.followUpQuestions);
    }

    return {
      quickActions: [...new Set(quickActions)], // Remove duplicates
      relatedQuestions: [...new Set(relatedQuestions)],
      nextSteps: [...new Set(nextSteps)]
    };
  }

  /**
   * Calculate intent clarity score
   */
  private calculateIntentClarity(aiResponse: ChatResponse): number {
    let clarity = aiResponse.confidence || 0.8;
    
    // Boost clarity if we have specific intent
    if (aiResponse.intent && aiResponse.intent !== 'general') {
      clarity += 0.1;
    }

    // Boost if we have actions
    if (aiResponse.actions && aiResponse.actions.length > 0) {
      clarity += 0.05;
    }

    return Math.min(clarity, 1.0);
  }

  /**
   * Calculate context relevance score
   */
  private calculateContextRelevance(session: ChatSession): number {
    let relevance = 0.8; // Base relevance

    // Boost if we have conversation history
    if (session.messageHistory.length > 2) {
      relevance += 0.1;
    }

    // Boost if we have generated content to work with
    if (Object.keys(session.context.generatedContent).length > 0) {
      relevance += 0.1;
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Get session history for context
   */
  getSessionHistory(sessionId: string): ChatSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Clear session history
   */
  clearSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Test the unified service
   */
  async testUnifiedService(): Promise<boolean> {
    try {
      const testConversation: SavedConversation = {
        id: 'test_unified',
        prompt: 'Create a blog management system',
        dbType: 'PostgreSQL',
        title: 'Test Blog System',
        generatedContent: {
          schema_design: 'CREATE TABLE posts (id SERIAL PRIMARY KEY, title VARCHAR(255), content TEXT);'
        },
        insights: [
          { agent: 'Schema Architect', message: 'Created basic blog structure', timestamp: new Date().toISOString() }
        ],
        tasks: [
          { id: '1', title: 'Schema Design', agent: 'Schema Architect', status: 'completed', progress: 100 }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed'
      };

      const response = await this.processUserQuestion(
        testConversation,
        "How do I add a comments table that relates to posts?"
      );

      console.log('🧪 Unified Service Test:', response);
      return response.metadata.aiConfidence > 0.7 && response.content.length > 100;
    } catch (error) {
      console.error('❌ Unified service test failed:', error);
      return false;
    }
  }
}

export const unifiedIntelligentChatService = new UnifiedIntelligentChatService();