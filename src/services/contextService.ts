import { SavedConversation } from './conversationStorage';

export interface DatabaseContext {
  tables: string[];
  schemas: Record<string, string>;
  relationships: string[];
  statistics?: Record<string, any>;
}

export interface WorkspaceContext {
  activeFile?: string;
  projectStructure?: string[];
  codeContext?: string;
}

export interface UserContext {
  preferences: {
    explanationLevel: 'beginner' | 'intermediate' | 'advanced';
    safetySettings: 'strict' | 'moderate' | 'flexible';
    outputFormat: 'detailed' | 'concise' | 'code-only';
  };
  customRules: string[];
}

export interface ConversationContext {
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentTopic?: string;
  relatedQueries: string[];
}

export class ContextService {
  private contextCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 300000; // 5 minutes

  private getCachedContext<T>(key: string): T | null {
    const cached = this.contextCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedContext<T>(key: string, data: T): T {
    this.contextCache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  async gatherDatabaseContext(): Promise<DatabaseContext> {
    const cached = this.getCachedContext<DatabaseContext>('database');
    if (cached) return cached;

    // In a real implementation, this would query the actual database
    const context = {
      tables: ['users', 'orders', 'products', 'categories'],
      schemas: {
        users: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255));',
        orders: 'CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), total DECIMAL(10,2));'
      },
      relationships: [
        'orders.user_id -> users.id (one-to-many)',
        'order_items.order_id -> orders.id (one-to-many)'
      ]
    };
    
    return this.setCachedContext('database', context);
  }

  async gatherWorkspaceContext(): Promise<WorkspaceContext> {
    const cached = this.getCachedContext<WorkspaceContext>('workspace');
    if (cached) return cached;

    // Would integrate with IDE/editor context
    const context = {
      activeFile: 'schema.sql',
      projectStructure: ['src/', 'migrations/', 'tests/'],
      codeContext: 'Working on database schema design'
    };
    
    return this.setCachedContext('workspace', context);
  }

  async gatherUserContext(): Promise<UserContext> {
    const cached = this.getCachedContext<UserContext>('user');
    if (cached) return cached;

    // Would load from user preferences/settings
    const context = {
      preferences: {
        explanationLevel: 'intermediate' as const,
        safetySettings: 'strict' as const,
        outputFormat: 'detailed' as const
      },
      customRules: [
        'Always use snake_case for table names',
        'Include created_at and updated_at timestamps',
        'Use UUID for primary keys in new tables'
      ]
    };
    
    return this.setCachedContext('user', context);
  }

  async gatherConversationContext(conversation?: SavedConversation): Promise<ConversationContext> {
    if (!conversation) {
      return {
        history: [],
        relatedQueries: []
      };
    }

    // Extract conversation history from saved conversation
    const history = conversation.insights.map(insight => ({
      role: 'assistant' as const,
      content: insight.message,
      timestamp: new Date(insight.timestamp)
    }));

    return {
      history,
      currentTopic: this.extractTopic(conversation.prompt),
      relatedQueries: this.findRelatedQueries(conversation.prompt)
    };
  }

  private extractTopic(prompt: string): string {
    // Simple topic extraction - could be enhanced with NLP
    const topics = [
      'schema design', 'query optimization', 'database migration',
      'performance tuning', 'data modeling', 'security'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    const detectedTopic = topics.find(topic => 
      lowerPrompt.includes(topic.replace(' ', '')) || lowerPrompt.includes(topic)
    );
    
    return detectedTopic || 'general database assistance';
  }

  private findRelatedQueries(prompt: string): string[] {
    // Would use similarity search or keyword matching
    return [
      'How to create indexes for better performance?',
      'What are database normalization best practices?',
      'How to design scalable database schemas?'
    ];
  }
}

export const contextService = new ContextService();