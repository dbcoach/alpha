import { GoogleGenerativeAI } from '@google/generative-ai';
import { SavedConversation } from './conversationStorage';

export interface DatabaseTask {
  id: string;
  type: 'schema_design' | 'query_generation' | 'optimization' | 'migration' | 'validation';
  description: string;
  requirements: string[];
  constraints: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  dependencies: string[];
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  result: {
    sql?: string;
    explanation: string;
    reasoning: string;
    bestPractices: string[];
    warnings: string[];
    nextSteps: string[];
  };
  confidence: number;
  executionTime: number;
}

export interface AgentCapability {
  name: string;
  description: string;
  canHandle: string[];
  systemPrompt: string;
  examples: Array<{
    input: string;
    output: string;
    explanation: string;
  }>;
}

/**
 * Intent-Driven Database Agent that understands user needs and executes database tasks
 */
export class IntentDrivenDatabaseAgent {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private capabilities: Map<string, AgentCapability> = new Map();

  // Master agent prompt for database tasks
  private readonly MASTER_DATABASE_AGENT_PROMPT = `You are a highly skilled Database Agent with the ability to understand user intent and execute precise database design and implementation tasks.

## CORE CAPABILITIES
🎯 **Intent Understanding**: Accurately interpret what users want to accomplish with their database
🏗️ **Schema Design**: Create optimal, normalized database schemas
⚡ **Query Generation**: Write efficient, optimized SQL queries
🔧 **Optimization**: Improve database performance and structure
🛡️ **Validation**: Ensure data integrity and security
📊 **Analysis**: Understand existing database structures and requirements

## EXECUTION PRINCIPLES
1. **Understand Before Acting**: Analyze the complete context before making recommendations
2. **Design for Scale**: Consider performance, maintainability, and future growth
3. **Follow Best Practices**: Apply industry standards and proven patterns
4. **Explain Decisions**: Provide clear reasoning for all design choices
5. **Consider Constraints**: Work within specified technical and business limitations
6. **Prioritize Safety**: Ensure data integrity and security in all designs

## RESPONSE FORMAT
For every task, provide:
1. **Analysis**: What you understand about the requirements
2. **Solution**: Specific implementation (SQL, design, etc.)
3. **Reasoning**: Why this approach is optimal
4. **Best Practices**: How this follows database design principles
5. **Warnings**: Potential issues or considerations
6. **Next Steps**: Suggested follow-up actions

## DATABASE DESIGN PATTERNS
- **Normalization**: Properly normalize to 3NF unless performance requires denormalization
- **Indexing**: Index foreign keys, frequently queried columns, and unique constraints
- **Constraints**: Use appropriate PRIMARY KEY, FOREIGN KEY, CHECK, and NOT NULL constraints
- **Data Types**: Choose optimal data types for storage efficiency and performance
- **Security**: Consider data sensitivity and access control requirements
- **Audit**: Include created_at, updated_at, and audit fields where appropriate`;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite-preview-06-17',
      generationConfig: {
        temperature: 0.2, // Low temperature for consistent, accurate results
        topP: 0.8,
        topK: 40,
      }
    });

    this.initializeCapabilities();
  }

  /**
   * Initialize agent capabilities
   */
  private initializeCapabilities(): void {
    // Schema Design Capability
    this.capabilities.set('schema_design', {
      name: 'Schema Design Expert',
      description: 'Creates optimal database schemas based on requirements',
      canHandle: ['create tables', 'design schema', 'database structure', 'entity relationships'],
      systemPrompt: `${this.MASTER_DATABASE_AGENT_PROMPT}

## SCHEMA DESIGN SPECIALIST
You excel at creating optimal database schemas. When designing schemas:

1. **Analyze Requirements**: Extract entities, attributes, and relationships
2. **Apply Normalization**: Use 3NF as default, justify any denormalization  
3. **Design Relationships**: Implement proper foreign key relationships
4. **Choose Data Types**: Select optimal types for storage and performance
5. **Add Constraints**: Ensure data integrity with appropriate constraints
6. **Plan Indexes**: Include indexes for performance optimization
7. **Consider Security**: Add audit fields and security considerations

## SCHEMA DESIGN TEMPLATE
For each table, provide:
- Table purpose and business logic
- Column definitions with justification
- Relationship explanations
- Index recommendations
- Constraint reasoning
- Security considerations`,
      examples: [
        {
          input: "Create a table for storing user information including authentication",
          output: `CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);`,
          explanation: "Secure user table with UUID primary key, hashed passwords, email verification, and audit fields"
        }
      ]
    });

    // Query Generation Capability
    this.capabilities.set('query_generation', {
      name: 'SQL Query Expert',
      description: 'Generates optimized SQL queries for specific needs',
      canHandle: ['write query', 'sql select', 'find data', 'join tables', 'aggregate data'],
      systemPrompt: `${this.MASTER_DATABASE_AGENT_PROMPT}

## SQL QUERY SPECIALIST  
You excel at writing efficient, optimized SQL queries. When generating queries:

1. **Understand Data Needs**: Clarify exactly what data is required
2. **Optimize Performance**: Use appropriate JOIN types and WHERE clauses
3. **Leverage Indexes**: Structure queries to use existing indexes effectively
4. **Handle Edge Cases**: Consider NULL values, duplicates, and data consistency
5. **Format Clearly**: Write readable, well-formatted SQL
6. **Explain Strategy**: Justify query structure and optimization choices

## QUERY OPTIMIZATION CHECKLIST
- Use appropriate JOIN types (INNER, LEFT, etc.)
- Place selective conditions in WHERE clause first
- Use EXISTS instead of IN for subqueries when appropriate
- Avoid SELECT * in production queries
- Consider query execution plan and index usage`,
      examples: [
        {
          input: "Find all orders for a specific user with their order items and product details",
          output: `SELECT 
    o.id AS order_id,
    o.order_date,
    o.total_amount,
    oi.quantity,
    oi.unit_price,
    p.name AS product_name,
    p.sku
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.user_id = $1
ORDER BY o.order_date DESC, oi.id;`,
          explanation: "Optimized query using INNER JOINs with parameterized user ID and logical ordering"
        }
      ]
    });

    // Performance Optimization Capability  
    this.capabilities.set('optimization', {
      name: 'Performance Optimization Expert',
      description: 'Analyzes and improves database performance',
      canHandle: ['slow query', 'optimize performance', 'add indexes', 'improve speed'],
      systemPrompt: `${this.MASTER_DATABASE_AGENT_PROMPT}

## PERFORMANCE OPTIMIZATION SPECIALIST
You excel at identifying and resolving performance bottlenecks. When optimizing:

1. **Analyze Query Plans**: Examine execution plans for inefficiencies
2. **Identify Bottlenecks**: Find slow operations, missing indexes, inefficient JOINs
3. **Recommend Indexes**: Suggest optimal indexing strategies
4. **Optimize Queries**: Rewrite queries for better performance
5. **Consider Trade-offs**: Balance query speed with storage and maintenance costs
6. **Monitor Impact**: Explain expected performance improvements

## OPTIMIZATION STRATEGIES
- Index frequently queried columns
- Optimize JOIN order and conditions
- Use LIMIT for large result sets
- Consider materialized views for complex aggregations
- Partition large tables when appropriate`,
      examples: [
        {
          input: "This query is slow: SELECT * FROM orders WHERE customer_id = 123 AND order_date > '2024-01-01'",
          output: `-- Optimized query:
SELECT 
    id, customer_id, order_date, total_amount, status
FROM orders 
WHERE customer_id = $1 
    AND order_date > $2
ORDER BY order_date DESC;

-- Recommended indexes:
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);
CREATE INDEX idx_orders_status ON orders(status) WHERE status IN ('pending', 'processing');`,
          explanation: "Removed SELECT *, added composite index on customer_id and order_date, parameterized query"
        }
      ]
    });
  }

  /**
   * Main method to execute database tasks based on user intent
   */
  async executeDatabaseTask(
    userRequest: string,
    conversation: SavedConversation,
    taskType?: string
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Executing database task:', userRequest);

      // Step 1: Analyze the task and determine capability needed
      const task = await this.analyzeTask(userRequest, conversation, taskType);
      console.log('📋 Task analysis:', task);

      // Step 2: Select appropriate capability
      const capability = this.selectCapability(task);
      console.log('🛠️ Selected capability:', capability.name);

      // Step 3: Execute the task using the selected capability
      const result = await this.executeWithCapability(userRequest, task, capability, conversation);
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Task completed in ${executionTime}ms`);

      return {
        taskId: task.id,
        success: true,
        result,
        confidence: 0.9,
        executionTime
      };

    } catch (error) {
      console.error('❌ Database task execution failed:', error);
      const executionTime = Date.now() - startTime;
      
      return {
        taskId: 'unknown',
        success: false,
        result: {
          explanation: 'Task execution failed',
          reasoning: error instanceof Error ? error.message : 'Unknown error',
          bestPractices: [],
          warnings: ['Task could not be completed'],
          nextSteps: ['Please rephrase your request or try a different approach']
        },
        confidence: 0.1,
        executionTime
      };
    }
  }

  /**
   * Analyze the user request and create a structured task
   */
  private async analyzeTask(
    userRequest: string, 
    conversation: SavedConversation,
    taskType?: string
  ): Promise<DatabaseTask> {
    
    const analysisPrompt = `${this.MASTER_DATABASE_AGENT_PROMPT}

## TASK ANALYSIS
Analyze the following user request and create a structured database task.

**User Request**: "${userRequest}"

**Context**:
- Project: "${conversation.prompt}"
- Database Type: ${conversation.dbType}
- Previous Work: ${Object.keys(conversation.generatedContent).join(', ')}
- Task Type Hint: ${taskType || 'auto-detect'}

## ANALYSIS REQUIREMENTS
1. **Identify Task Type**: schema_design, query_generation, optimization, migration, or validation
2. **Extract Requirements**: What specifically needs to be accomplished?
3. **Identify Constraints**: What limitations or requirements exist?
4. **Assess Complexity**: How complex is this task?
5. **Find Dependencies**: What existing work does this depend on?

Return a JSON analysis:
{
  "id": "task_unique_id",
  "type": "schema_design|query_generation|optimization|migration|validation",
  "description": "Clear description of what needs to be done",
  "requirements": ["requirement 1", "requirement 2"],
  "constraints": ["constraint 1", "constraint 2"],
  "priority": "low|medium|high|critical", 
  "estimatedComplexity": "simple|moderate|complex",
  "dependencies": ["dependency 1", "dependency 2"]
}`;

    try {
      const response = await this.model.generateContent(analysisPrompt);
      const responseText = await response.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const taskData = JSON.parse(jsonMatch[0]);
        return {
          id: taskData.id || `task_${Date.now()}`,
          type: taskData.type || 'schema_design',
          description: taskData.description || userRequest,
          requirements: taskData.requirements || [],
          constraints: taskData.constraints || [],
          priority: taskData.priority || 'medium',
          estimatedComplexity: taskData.estimatedComplexity || 'moderate',
          dependencies: taskData.dependencies || []
        };
      }
    } catch (error) {
      console.error('Task analysis failed, using fallback:', error);
    }

    // Fallback task analysis
    return this.fallbackTaskAnalysis(userRequest, taskType);
  }

  /**
   * Fallback task analysis using patterns
   */
  private fallbackTaskAnalysis(userRequest: string, taskType?: string): DatabaseTask {
    const lowerRequest = userRequest.toLowerCase();
    
    // Determine task type from request content
    let detectedType: DatabaseTask['type'] = 'schema_design';
    
    if (lowerRequest.includes('query') || lowerRequest.includes('select') || lowerRequest.includes('find')) {
      detectedType = 'query_generation';
    } else if (lowerRequest.includes('optimize') || lowerRequest.includes('performance') || lowerRequest.includes('slow')) {
      detectedType = 'optimization';
    } else if (lowerRequest.includes('migrate') || lowerRequest.includes('move') || lowerRequest.includes('transfer')) {
      detectedType = 'migration';
    } else if (lowerRequest.includes('validate') || lowerRequest.includes('check') || lowerRequest.includes('verify')) {
      detectedType = 'validation';
    }

    if (taskType) {
      detectedType = taskType as DatabaseTask['type'];
    }

    return {
      id: `task_${Date.now()}`,
      type: detectedType,
      description: userRequest,
      requirements: [userRequest],
      constraints: [],
      priority: 'medium',
      estimatedComplexity: 'moderate',
      dependencies: []
    };
  }

  /**
   * Select the appropriate capability for the task
   */
  private selectCapability(task: DatabaseTask): AgentCapability {
    const capability = this.capabilities.get(task.type);
    if (capability) {
      return capability;
    }

    // Default to schema design if no specific capability found
    return this.capabilities.get('schema_design')!;
  }

  /**
   * Execute the task using the selected capability
   */
  private async executeWithCapability(
    userRequest: string,
    task: DatabaseTask,
    capability: AgentCapability,
    conversation: SavedConversation
  ): Promise<TaskExecutionResult['result']> {

    const executionPrompt = `${capability.systemPrompt}

## TASK EXECUTION
Execute the following database task with expertise and precision.

**Task Details**:
- Type: ${task.type}
- Description: ${task.description}
- Requirements: ${task.requirements.join(', ')}
- Constraints: ${task.constraints.join(', ')}
- Complexity: ${task.estimatedComplexity}

**User Request**: "${userRequest}"

**Project Context**:
- Database Type: ${conversation.dbType}
- Original Project: "${conversation.prompt}"
- Existing Schema: ${conversation.generatedContent['schema_design'] || conversation.generatedContent['design'] || 'None'}
- Previous Work: ${Object.keys(conversation.generatedContent).join(', ')}

**Recent Context**: ${conversation.insights.slice(-3).map(insight => `${insight.agent}: ${insight.message}`).join(' | ')}

## EXECUTION REQUIREMENTS
1. **Provide Specific Solution**: Give concrete, implementable results (SQL, design, etc.)
2. **Explain Reasoning**: Justify your approach and design decisions
3. **Follow Best Practices**: Apply database design principles and standards
4. **Identify Warnings**: Note potential issues or important considerations
5. **Suggest Next Steps**: Recommend follow-up actions or improvements

## RESPONSE FORMAT
Structure your response as:

### 🎯 Analysis
[What you understand about the requirements]

### 💡 Solution
[Specific implementation - SQL code, design, etc.]

### 🧠 Reasoning
[Why this approach is optimal]

### ✅ Best Practices Applied
[How this follows database design principles]

### ⚠️ Important Considerations
[Potential issues, warnings, or limitations]

### 🔄 Next Steps
[Suggested follow-up actions]

Provide a complete, production-ready solution that the user can implement immediately.`;

    try {
      const response = await this.model.generateContent(executionPrompt);
      const responseText = await response.response.text();

      // Extract SQL code if present
      const sqlMatches = responseText.match(/```sql\n?([\s\S]*?)\n?```/gi);
      const sql = sqlMatches ? sqlMatches.map(match => 
        match.replace(/```sql\n?/gi, '').replace(/\n?```/g, '')
      ).join('\n\n') : undefined;

      // Extract sections
      const sections = this.parseResponseSections(responseText);

      return {
        sql,
        explanation: sections.analysis || responseText,
        reasoning: sections.reasoning || 'AI-generated solution based on best practices',
        bestPractices: sections.bestPractices || ['Applied database design best practices'],
        warnings: sections.warnings || [],
        nextSteps: sections.nextSteps || ['Test the implementation', 'Consider additional optimizations']
      };

    } catch (error) {
      console.error('Task execution failed:', error);
      throw error;
    }
  }

  /**
   * Parse response sections from formatted text
   */
  private parseResponseSections(responseText: string): {
    analysis?: string;
    reasoning?: string;
    bestPractices?: string[];
    warnings?: string[];
    nextSteps?: string[];
  } {
    const sections: any = {};

    // Extract analysis
    const analysisMatch = responseText.match(/### 🎯 Analysis\s*([\s\S]*?)(?=###|$)/);
    if (analysisMatch) {
      sections.analysis = analysisMatch[1].trim();
    }

    // Extract reasoning
    const reasoningMatch = responseText.match(/### 🧠 Reasoning\s*([\s\S]*?)(?=###|$)/);
    if (reasoningMatch) {
      sections.reasoning = reasoningMatch[1].trim();
    }

    // Extract best practices
    const practicesMatch = responseText.match(/### ✅ Best Practices Applied\s*([\s\S]*?)(?=###|$)/);
    if (practicesMatch) {
      sections.bestPractices = practicesMatch[1].trim().split('\n').filter(line => line.trim());
    }

    // Extract warnings
    const warningsMatch = responseText.match(/### ⚠️ Important Considerations\s*([\s\S]*?)(?=###|$)/);
    if (warningsMatch) {
      sections.warnings = warningsMatch[1].trim().split('\n').filter(line => line.trim());
    }

    // Extract next steps
    const nextStepsMatch = responseText.match(/### 🔄 Next Steps\s*([\s\S]*?)(?=###|$)/);
    if (nextStepsMatch) {
      sections.nextSteps = nextStepsMatch[1].trim().split('\n').filter(line => line.trim());
    }

    return sections;
  }

  /**
   * Test the database agent
   */
  async testDatabaseAgent(): Promise<boolean> {
    try {
      const testConversation: SavedConversation = {
        id: 'test',
        prompt: 'Create an e-commerce platform database',
        dbType: 'PostgreSQL',
        title: 'Test E-commerce Database',
        generatedContent: {},
        insights: [],
        tasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed'
      };

      const result = await this.executeDatabaseTask(
        "Create a products table with name, price, and inventory tracking",
        testConversation,
        'schema_design'
      );

      console.log('🧪 Agent Test Result:', result);
      return result.success && result.confidence > 0.8;
    } catch (error) {
      console.error('❌ Database agent test failed:', error);
      return false;
    }
  }
}

export const intentDrivenDatabaseAgent = new IntentDrivenDatabaseAgent();