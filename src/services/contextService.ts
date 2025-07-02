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
  async gatherDatabaseContext(): Promise<DatabaseContext> {
    // In a real implementation, this would query the actual database
    return {
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
  }

  async gatherWorkspaceContext(): Promise<WorkspaceContext> {
    // Would integrate with IDE/editor context
    return {
      activeFile: 'schema.sql',
      projectStructure: ['src/', 'migrations/', 'tests/'],
      codeContext: 'Working on database schema design'
    };
  }

  async gatherUserContext(): Promise<UserContext> {
    // Would load from user preferences/settings
    return {
      preferences: {
        explanationLevel: 'intermediate',
        safetySettings: 'strict',
        outputFormat: 'detailed'
      },
      customRules: [
        'Always use snake_case for table names',
        'Include created_at and updated_at timestamps',
        'Use UUID for primary keys in new tables'
      ]
    };
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