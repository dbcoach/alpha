import { GoogleGenerativeAI } from '@google/generative-ai';
import { SavedConversation } from './conversationStorage';

export interface ChatResponse {
  content: string;
  type?: 'text' | 'code' | 'sql';
  confidence?: number;
  intent?: string;
  actions?: string[];
  followUpQuestions?: string[];
}

export interface UserIntent {
  primary: string;
  secondary?: string[];
  entities: {
    tables?: string[];
    columns?: string[];
    operations?: string[];
    technologies?: string[];
  };
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Intelligent AI Chat Service that actually understands user intent
 * and provides contextual, helpful database assistance
 */
export class IntelligentAIChatService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  // Core system prompt for intelligent chat
  private readonly INTELLIGENT_CHAT_PROMPT = `You are DB.Coach, an expert AI database assistant with deep understanding of database design, optimization, and implementation. Your role is to provide intelligent, contextual assistance based on user intent and conversation context.

## CORE CAPABILITIES
- **Intent Understanding**: Accurately identify what the user wants to accomplish
- **Context Awareness**: Use conversation history and database context intelligently  
- **Practical Solutions**: Provide actionable, implementable advice
- **Educational Guidance**: Explain concepts clearly while solving problems
- **Safety First**: Always consider data integrity and security

## RESPONSE PRINCIPLES
1. **Understand First**: Analyze the user's true intent before responding
2. **Be Specific**: Provide concrete, actionable solutions
3. **Teach While Helping**: Explain the reasoning behind your recommendations
4. **Stay Contextual**: Use the conversation and database context appropriately
5. **Suggest Next Steps**: Always provide helpful follow-up options

## INTENT CATEGORIES
- **schema_design**: Creating or modifying database structure
- **query_help**: Writing, optimizing, or debugging SQL queries
- **performance**: Analyzing and improving database performance
- **troubleshooting**: Solving database problems and errors
- **explanation**: Understanding database concepts or existing designs
- **migration**: Moving or updating database schemas/data
- **security**: Implementing database security measures
- **integration**: Connecting databases with applications

## RESPONSE FORMAT
Always structure responses with:
1. Intent acknowledgment
2. Specific solution or explanation
3. Code examples when applicable
4. Reasoning and best practices
5. Suggested next steps or follow-up questions`;

  // Intent analysis prompt
  private readonly INTENT_ANALYSIS_PROMPT = `Analyze the user's intent from their question. Consider:

1. **Primary Intent**: What is the main thing they want to accomplish?
2. **Secondary Intents**: Are there additional goals or concerns?
3. **Entity Extraction**: What specific database elements are mentioned?
4. **Complexity Assessment**: How complex is their request?
5. **Context Dependencies**: Do they need information from the conversation/database context?

Return a JSON analysis:
{
  "primary": "intent_category",
  "secondary": ["additional_intents"],
  "entities": {
    "tables": ["mentioned_tables"],
    "columns": ["mentioned_columns"], 
    "operations": ["mentioned_operations"],
    "technologies": ["mentioned_technologies"]
  },
  "confidence": 0.95,
  "complexity": "simple|moderate|complex",
  "context_needed": ["conversation_history", "database_schema", "previous_results"],
  "suggested_approach": "brief description of how to help"
}`;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite-preview-06-17',
      generationConfig: {
        temperature: 0.3, // Balanced creativity and consistency
        topP: 0.8,
        topK: 40,
      }
    });
  }

  /**
   * Main method for generating intelligent responses
   */
  async generateIntelligentResponse(
    conversation: SavedConversation, 
    userQuestion: string
  ): Promise<ChatResponse> {
    try {
      console.log('🤖 Intelligent AI processing question:', userQuestion);
      
      // Step 1: Analyze user intent
      const intent = await this.analyzeUserIntent(userQuestion, conversation);
      console.log('🎯 Detected intent:', intent);

      // Step 2: Gather relevant context
      const context = this.gatherIntelligentContext(conversation, intent);

      // Step 3: Generate contextual response
      const response = await this.generateContextualResponse(userQuestion, intent, context);
      
      console.log('✅ Intelligent response generated');
      return response;

    } catch (error) {
      console.error('❌ Intelligent AI generation failed:', error);
      return {
        content: "I apologize, but I encountered an error processing your request. Could you please rephrase your question or try again?",
        type: 'text',
        confidence: 0.1,
        intent: 'error'
      };
    }
  }

  /**
   * Analyze user intent using AI
   */
  private async analyzeUserIntent(userQuestion: string, conversation: SavedConversation): Promise<UserIntent> {
    const intentPrompt = `${this.INTENT_ANALYSIS_PROMPT}

USER QUESTION: "${userQuestion}"

CONVERSATION CONTEXT:
- Project: "${conversation.prompt}"
- Database Type: ${conversation.dbType}
- Previous Tasks: ${conversation.tasks.map(t => t.title).join(', ')}
- Recent Activity: ${conversation.insights.slice(-3).map(i => i.message).join(' | ')}

Analyze the intent:`;

    try {
      const response = await this.model.generateContent(intentPrompt);
      const responseText = await response.response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const intentData = JSON.parse(jsonMatch[0]);
        return {
          primary: intentData.primary || 'general',
          secondary: intentData.secondary || [],
          entities: intentData.entities || {},
          confidence: intentData.confidence || 0.7,
          complexity: intentData.complexity || 'moderate'
        };
      }
    } catch (error) {
      console.error('Intent analysis failed:', error);
    }

    // Fallback to basic pattern matching
    return this.fallbackIntentAnalysis(userQuestion);
  }

  /**
   * Fallback intent analysis using patterns
   */
  private fallbackIntentAnalysis(question: string): UserIntent {
    const lowerQuestion = question.toLowerCase();
    
    // Intent patterns
    const intentPatterns = {
      schema_design: ['create table', 'design schema', 'database structure', 'add column', 'modify table'],
      query_help: ['write query', 'sql select', 'how to query', 'find records', 'join tables'],
      performance: ['slow query', 'optimize', 'performance', 'index', 'speed up'],
      troubleshooting: ['error', 'not working', 'problem', 'issue', 'fix'],
      explanation: ['what is', 'how does', 'explain', 'understand', 'what does'],
      migration: ['migrate', 'move data', 'transfer', 'upgrade', 'convert'],
      security: ['secure', 'permissions', 'access control', 'encrypt', 'protect']
    };

    // Find matching intent
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => lowerQuestion.includes(pattern))) {
        return {
          primary: intent,
          secondary: [],
          entities: this.extractEntities(question),
          confidence: 0.8,
          complexity: 'moderate'
        };
      }
    }

    return {
      primary: 'general',
      secondary: [],
      entities: this.extractEntities(question),
      confidence: 0.6,
      complexity: 'simple'
    };
  }

  /**
   * Extract entities from question
   */
  private extractEntities(question: string): UserIntent['entities'] {
    const entities: UserIntent['entities'] = {
      tables: [],
      columns: [],
      operations: [],
      technologies: []
    };

    // Common table words
    const tableKeywords = ['users', 'orders', 'products', 'customers', 'items', 'categories', 'payments'];
    const columnKeywords = ['id', 'name', 'email', 'created_at', 'updated_at', 'status', 'price', 'quantity'];
    const operationKeywords = ['select', 'insert', 'update', 'delete', 'join', 'where', 'group by', 'order by'];
    const techKeywords = ['postgresql', 'mysql', 'mongodb', 'redis', 'sqlite'];

    const lowerQuestion = question.toLowerCase();

    entities.tables = tableKeywords.filter(keyword => lowerQuestion.includes(keyword));
    entities.columns = columnKeywords.filter(keyword => lowerQuestion.includes(keyword));
    entities.operations = operationKeywords.filter(keyword => lowerQuestion.includes(keyword));
    entities.technologies = techKeywords.filter(keyword => lowerQuestion.includes(keyword));

    return entities;
  }

  /**
   * Gather intelligent context based on intent
   */
  private gatherIntelligentContext(conversation: SavedConversation, intent: UserIntent) {
    const context = {
      conversation,
      intent,
      relevantContent: {},
      recentInsights: conversation.insights.slice(-5),
      databaseInfo: {
        type: conversation.dbType,
        prompt: conversation.prompt,
        status: conversation.status
      }
    };

    // Gather content relevant to the intent
    switch (intent.primary) {
      case 'schema_design':
      case 'explanation':
        context.relevantContent = {
          schema: conversation.generatedContent['schema_design'] || conversation.generatedContent['design'] || '',
          analysis: conversation.generatedContent['requirements_analysis'] || conversation.generatedContent['analysis'] || ''
        };
        break;
      
      case 'query_help':
      case 'performance':
        context.relevantContent = {
          schema: conversation.generatedContent['schema_design'] || '',
          implementation: conversation.generatedContent['implementation_package'] || conversation.generatedContent['implementation'] || '',
          validation: conversation.generatedContent['quality_assurance'] || conversation.generatedContent['validation'] || ''
        };
        break;
      
      case 'troubleshooting':
      case 'security':
        context.relevantContent = {
          all: conversation.generatedContent
        };
        break;
    }

    return context;
  }

  /**
   * Generate contextual response using AI
   */
  private async generateContextualResponse(
    userQuestion: string, 
    intent: UserIntent, 
    context: any
  ): Promise<ChatResponse> {
    
    const responsePrompt = `${this.INTELLIGENT_CHAT_PROMPT}

## CURRENT CONTEXT
**User Intent**: ${intent.primary} (confidence: ${Math.round(intent.confidence * 100)}%)
**Complexity**: ${intent.complexity}
**Entities Mentioned**: ${JSON.stringify(intent.entities)}

**Project Context**:
- Database Type: ${context.databaseInfo.type}
- Original Request: "${context.databaseInfo.prompt}"
- Status: ${context.databaseInfo.status}

**Relevant Generated Content**:
${JSON.stringify(context.relevantContent, null, 2)}

**Recent AI Insights**:
${context.recentInsights.map((insight: any) => `- ${insight.agent}: ${insight.message}`).join('\n')}

## USER QUESTION
"${userQuestion}"

## INSTRUCTIONS
Based on the user's intent (${intent.primary}) and the conversation context, provide a helpful, specific response that:

1. **Acknowledges their intent**: Show you understand what they're trying to accomplish
2. **Provides specific solutions**: Give actionable advice, code examples, or explanations
3. **Uses the context**: Reference relevant parts of their database design/conversation
4. **Explains the reasoning**: Help them understand why your solution works
5. **Suggests next steps**: Offer helpful follow-up actions or questions

If the intent is:
- **schema_design**: Provide SQL DDL, design recommendations, best practices
- **query_help**: Write optimized SQL queries with explanations
- **performance**: Analyze performance issues and suggest optimizations
- **troubleshooting**: Diagnose problems and provide solutions
- **explanation**: Clearly explain concepts with examples from their context
- **migration**: Provide step-by-step migration guidance
- **security**: Recommend security measures and implementations

Format your response in clear sections with appropriate code blocks and explanations.`;

    try {
      const response = await this.model.generateContent(responsePrompt);
      const responseText = await response.response.text();

      // Determine response type based on content
      let responseType: 'text' | 'code' | 'sql' = 'text';
      if (responseText.includes('```sql')) {
        responseType = 'sql';
      } else if (responseText.includes('```')) {
        responseType = 'code';
      }

      // Generate follow-up questions
      const followUpQuestions = this.generateFollowUpQuestions(intent, context);

      return {
        content: responseText,
        type: responseType,
        confidence: intent.confidence,
        intent: intent.primary,
        actions: this.suggestActions(intent),
        followUpQuestions
      };

    } catch (error) {
      console.error('Response generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate relevant follow-up questions
   */
  private generateFollowUpQuestions(intent: UserIntent, context: any): string[] {
    const baseQuestions = {
      schema_design: [
        "Would you like me to add indexes for better performance?",
        "Should I include sample data for testing?",
        "Do you need migration scripts for deployment?"
      ],
      query_help: [
        "Would you like me to optimize this query further?",
        "Do you need help with indexing for better performance?",
        "Should I show you alternative query approaches?"
      ],
      performance: [
        "Would you like me to analyze other queries for optimization?",
        "Should I suggest indexing strategies for your tables?",
        "Do you need help with query execution plan analysis?"
      ],
      explanation: [
        "Would you like me to explain related database concepts?",
        "Do you need examples of how to implement this?",
        "Should I show you best practices for this scenario?"
      ],
      troubleshooting: [
        "Would you like me to help prevent similar issues?",
        "Do you need help with error monitoring setup?",
        "Should I suggest testing strategies?"
      ]
    };

    return baseQuestions[intent.primary as keyof typeof baseQuestions] || [
      "Is there anything else about your database I can help you with?",
      "Would you like me to explain any part in more detail?",
      "Do you have other database questions?"
    ];
  }

  /**
   * Suggest possible actions based on intent
   */
  private suggestActions(intent: UserIntent): string[] {
    const actionMap = {
      schema_design: ['Create Tables', 'Add Indexes', 'Generate Migration', 'Validate Schema'],
      query_help: ['Optimize Query', 'Add Indexes', 'Test Performance', 'Explain Plan'],
      performance: ['Analyze Queries', 'Suggest Indexes', 'Review Schema', 'Monitor Performance'],
      troubleshooting: ['Debug Issue', 'Check Logs', 'Validate Data', 'Test Connection'],
      explanation: ['Show Examples', 'Provide Documentation', 'Create Tutorial', 'Demo Implementation'],
      migration: ['Plan Migration', 'Create Scripts', 'Test Migration', 'Backup Data'],
      security: ['Audit Security', 'Set Permissions', 'Enable Encryption', 'Configure Access']
    };

    return actionMap[intent.primary as keyof typeof actionMap] || ['Ask Question', 'Get Help', 'Explore Options'];
  }

  /**
   * Test the intelligent chat service
   */
  async testIntelligentChat(): Promise<boolean> {
    try {
      const testConversation: SavedConversation = {
        id: 'test',
        prompt: 'Create an e-commerce database with products and orders',
        dbType: 'PostgreSQL',
        title: 'Test E-commerce Database',
        generatedContent: {
          schema_design: 'CREATE TABLE products (id SERIAL PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2));'
        },
        insights: [
          { agent: 'Schema Architect', message: 'Created products table with proper data types', timestamp: new Date().toISOString() }
        ],
        tasks: [
          { id: '1', title: 'Schema Design', agent: 'Schema Architect', status: 'completed', progress: 100 }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed'
      };

      const response = await this.generateIntelligentResponse(
        testConversation,
        "How do I add an orders table that relates to products?"
      );

      console.log('🧪 Test Response:', response);
      return response.confidence > 0.7 && response.content.length > 50;
    } catch (error) {
      console.error('❌ Intelligent chat test failed:', error);
      return false;
    }
  }
}

export const intelligentAIChatService = new IntelligentAIChatService();