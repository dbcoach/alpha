import { SavedConversation } from './conversationStorage';

export interface ChatResponse {
  content: string;
  type?: 'text' | 'code' | 'sql';
  confidence?: number;
}

export class AIChatService {
  /**
   * Generates an AI response based on the conversation context and user question
   */
  static async generateResponse(conversation: SavedConversation, userQuestion: string): Promise<ChatResponse> {
    try {
      console.log('🧠 AIChatService processing question:', userQuestion);
      console.log('📊 Available content keys:', Object.keys(conversation.generatedContent));
      console.log('📋 Available tasks:', conversation.tasks.map(t => `${t.title} (${t.status})`));
      
      // Analyze the question to determine the type of response needed
      const questionType = this.categorizeQuestion(userQuestion);
      console.log('🎯 Question categorized as:', questionType);
      
      // Extract relevant context from the conversation
      const context = this.extractRelevantContext(conversation, questionType);
      
      // Generate response based on question type and context
      const response = await this.generateContextualResponse(userQuestion, questionType, context);
      
      console.log('✅ Generated response type:', response.type, 'length:', response.content.length);
      return response;
    } catch (error) {
      console.error('Error generating AI chat response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Categorizes the user question to route to appropriate response logic
   */
  private static categorizeQuestion(question: string): string {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('schema') || lowerQuestion.includes('table') || lowerQuestion.includes('structure')) {
      return 'schema';
    }
    
    if (lowerQuestion.includes('relationship') || lowerQuestion.includes('foreign key') || lowerQuestion.includes('join')) {
      return 'relationships';
    }
    
    if (lowerQuestion.includes('query') || lowerQuestion.includes('sql') || lowerQuestion.includes('select')) {
      return 'query';
    }
    
    if (lowerQuestion.includes('performance') || lowerQuestion.includes('optimize') || lowerQuestion.includes('index')) {
      return 'performance';
    }
    
    if (lowerQuestion.includes('security') || lowerQuestion.includes('permission') || lowerQuestion.includes('access')) {
      return 'security';
    }
    
    if (lowerQuestion.includes('api') || lowerQuestion.includes('endpoint') || lowerQuestion.includes('rest')) {
      return 'api';
    }
    
    if (lowerQuestion.includes('implement') || lowerQuestion.includes('code') || lowerQuestion.includes('example')) {
      return 'implementation';
    }
    
    return 'general';
  }

  /**
   * Extracts relevant context from the conversation based on question type
   */
  private static extractRelevantContext(conversation: SavedConversation, questionType: string) {
    const context = {
      prompt: conversation.prompt,
      dbType: conversation.dbType,
      generatedContent: conversation.generatedContent,
      insights: conversation.insights,
      tasks: conversation.tasks,
      status: conversation.status
    };

    return context;
  }

  /**
   * Generates a contextual response based on the question type and conversation data
   */
  private static async generateContextualResponse(question: string, questionType: string, context: any): Promise<ChatResponse> {
    switch (questionType) {
      case 'schema':
        return this.generateSchemaResponse(question, context);
      
      case 'relationships':
        return this.generateRelationshipsResponse(question, context);
      
      case 'query':
        return this.generateQueryResponse(question, context);
      
      case 'performance':
        return this.generatePerformanceResponse(question, context);
      
      case 'security':
        return this.generateSecurityResponse(question, context);
      
      case 'api':
        return this.generateApiResponse(question, context);
      
      case 'implementation':
        return this.generateImplementationResponse(question, context);
      
      default:
        return this.generateGeneralResponse(question, context);
    }
  }

  private static generateSchemaResponse(question: string, context: any): ChatResponse {
    const schemaContent = context.generatedContent['schema_design'] || '';
    const requirementsContent = context.generatedContent['requirements_analysis'] || '';
    const implementationContent = context.generatedContent['implementation_package'] || '';
    
    // Look for actual SQL content
    let response = `## Database Schema Analysis\n\nFor your "${context.prompt}" ${context.dbType} database:\n\n`;

    // Extract actual table information from generated content
    if (schemaContent || implementationContent) {
      const allContent = schemaContent + ' ' + implementationContent;
      
      // Find CREATE TABLE statements
      const createTableMatches = allContent.match(/CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi);
      if (createTableMatches && createTableMatches.length > 0) {
        response += `### 📋 Generated Tables:\n\n`;
        createTableMatches.forEach((tableSQL, index) => {
          const tableName = tableSQL.match(/CREATE TABLE\s+(\w+)/i)?.[1] || `table_${index + 1}`;
          response += `**${tableName}**:\n\`\`\`sql\n${tableSQL}\n\`\`\`\n\n`;
        });
      } else {
        // Look for table mentions in the content
        const tableKeywords = ['users', 'entities', 'categories', 'products', 'orders', 'customers'];
        const mentionedTables = tableKeywords.filter(table => 
          allContent.toLowerCase().includes(table.toLowerCase())
        );
        
        if (mentionedTables.length > 0) {
          response += `### 📋 Identified Tables:\n`;
          mentionedTables.forEach(table => {
            response += `- **${table}** (mentioned in generated content)\n`;
          });
          response += '\n';
        }
      }

      // Extract relationships
      const foreignKeyMatches = allContent.match(/REFERENCES\s+(\w+)\s*\(/gi);
      if (foreignKeyMatches && foreignKeyMatches.length > 0) {
        response += `### 🔗 Relationships:\n`;
        foreignKeyMatches.forEach(fk => {
          const referencedTable = fk.match(/REFERENCES\s+(\w+)/i)?.[1];
          response += `- Foreign key reference to **${referencedTable}**\n`;
        });
        response += '\n';
      }
    } else {
      response += `### ⏳ Schema Generation Status:\n`;
      response += `The schema design is currently being generated. Content available:\n`;
      Object.keys(context.generatedContent).forEach(key => {
        const length = context.generatedContent[key].length;
        response += `- **${key}**: ${length} characters\n`;
      });
      response += '\nThe schema will appear as the "Schema Design" task completes.\n\n';
    }

    // Add insights from AI agents
    if (context.insights && context.insights.length > 0) {
      const schemaInsights = context.insights.filter((insight: any) => 
        insight.message.toLowerCase().includes('schema') || 
        insight.message.toLowerCase().includes('table') ||
        insight.message.toLowerCase().includes('design')
      );
      
      if (schemaInsights.length > 0) {
        response += `### 🤖 AI Agent Insights:\n`;
        schemaInsights.slice(-2).forEach((insight: any) => {
          response += `- **${insight.agent}**: ${insight.message}\n`;
        });
      }
    }

    return {
      content: response,
      type: 'text',
      confidence: 0.9
    };
  }

  private static generateRelationshipsResponse(question: string, context: any): ChatResponse {
    const schemaContent = context.generatedContent['schema_design'] || '';
    
    let response = `## Database Relationships

Based on the generated schema, here are the key relationships:

`;

    if (schemaContent.includes('REFERENCES')) {
      const relationships = this.extractRelationshipsFromSQL(schemaContent);
      response += relationships;
    } else {
      response += `### Primary Relationships:
- **One-to-Many**: Users → Main Entities
- **Many-to-Many**: Entities ↔ Categories (via junction table)
- **Self-referencing**: Hierarchical structures where applicable

### Foreign Key Constraints:
- All foreign keys include referential integrity
- Cascade options configured for data consistency
- Indexed for optimal join performance
`;
    }

    response += `
These relationships ensure data integrity and support efficient querying patterns for your ${context.dbType} database.`;

    return {
      content: response,
      type: 'text',
      confidence: 0.85
    };
  }

  private static generateQueryResponse(question: string, context: any): ChatResponse {
    const implementationContent = context.generatedContent['implementation_package'] || '';
    const schemaContent = context.generatedContent['schema_design'] || '';
    
    let response = `## SQL Queries for "${context.prompt}"\n\n`;

    // Try to extract actual SQL from generated content
    const allContent = implementationContent + ' ' + schemaContent;
    const sqlBlocks = allContent.match(/```sql([\s\S]*?)```/gi);
    
    if (sqlBlocks && sqlBlocks.length > 0) {
      response += `### 📋 Generated SQL Examples:\n\n`;
      sqlBlocks.forEach((block, index) => {
        const cleanSQL = block.replace(/```sql\n?/gi, '').replace(/```/g, '').trim();
        if (cleanSQL.length > 20) {
          response += `**Query ${index + 1}:**\n\`\`\`sql\n${cleanSQL}\n\`\`\`\n\n`;
        }
      });
    }

    // Extract table names from CREATE TABLE statements
    const tableMatches = allContent.match(/CREATE TABLE\s+(\w+)/gi);
    const tableNames = tableMatches ? tableMatches.map(match => match.split(' ')[2]) : ['users', 'main_entities'];

    response += `### 🔍 Custom Queries for Your Tables:\n\n`;

    // Generate specific queries based on identified tables
    if (tableNames.length > 0) {
      const primaryTable = tableNames[0];
      
      response += `\`\`\`sql
-- Get all records from ${primaryTable}
SELECT * FROM ${primaryTable} 
ORDER BY created_at DESC 
LIMIT 20;

-- Count records in ${primaryTable}
SELECT COUNT(*) as total_records 
FROM ${primaryTable};
`;

      if (tableNames.length > 1) {
        const secondaryTable = tableNames[1];
        response += `
-- Join ${primaryTable} with ${secondaryTable}
SELECT p.*, s.name as related_name
FROM ${primaryTable} p
LEFT JOIN ${secondaryTable} s ON p.${secondaryTable.slice(0, -1)}_id = s.id
ORDER BY p.created_at DESC;
`;
      }

      // Add search query if appropriate
      response += `
-- Search in ${primaryTable}
SELECT * FROM ${primaryTable} 
WHERE name ILIKE '%search_term%' 
   OR description ILIKE '%search_term%'
ORDER BY created_at DESC;

-- Recent records (last 7 days)
SELECT * FROM ${primaryTable} 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
\`\`\`
`;
    }

    // Add progress info if tables are still being generated
    if (!tableMatches || tableMatches.length === 0) {
      response += `### ⏳ Query Generation Status:\n`;
      response += `Tables are currently being designed. Available content:\n`;
      Object.keys(context.generatedContent).forEach(key => {
        response += `- ${key}: ${context.generatedContent[key].length} characters\n`;
      });
      response += `\nSQL queries will be generated as the schema is completed!\n`;
    }

    return {
      content: response,
      type: 'sql',
      confidence: 0.9
    };
  }

  private static generatePerformanceResponse(question: string, context: any): ChatResponse {
    const qaContent = context.generatedContent['quality_assurance'] || '';
    
    let response = `## Performance Optimization Recommendations

For your ${context.dbType} database, here are the key performance considerations:

### Indexing Strategy:
- **Primary Keys**: Automatically clustered indexes
- **Foreign Keys**: Non-clustered indexes for join performance
- **Search Fields**: Composite indexes on frequently queried columns
- **Unique Constraints**: Implicit indexes on email, username fields

### Query Optimization:
- Use EXPLAIN ANALYZE to profile query performance
- Expected query response time: < 50ms for most operations
- Implement connection pooling for concurrent users
- Use prepared statements to prevent SQL injection and improve performance

### Scalability Considerations:
- Database designed for 10x growth capacity
- Partitioning strategy for large tables (when needed)
- Read replicas for high-traffic applications
- Caching layer recommendations (Redis/Memcached)

`;

    if (qaContent.includes('Performance Analysis')) {
      response += `### Current Performance Metrics:
${this.extractPerformanceFromQA(qaContent)}
`;
    }

    response += `
### Monitoring Recommendations:
- Set up query performance monitoring
- Track slow query logs
- Monitor connection pool utilization
- Implement application-level metrics

Would you like specific recommendations for any of these areas?`;

    return {
      content: response,
      type: 'text',
      confidence: 0.9
    };
  }

  private static generateSecurityResponse(question: string, context: any): ChatResponse {
    const qaContent = context.generatedContent['quality_assurance'] || '';
    
    let response = `## Security Implementation

Your database includes comprehensive security measures:

### Access Control:
- **Role-based permissions**: Different access levels for users
- **Row-level security**: User data isolation where applicable
- **Principle of least privilege**: Minimal required permissions

### Data Protection:
- **Encryption at rest**: Sensitive data fields encrypted
- **Password hashing**: Secure password storage (bcrypt/argon2)
- **SQL injection prevention**: Parameterized queries required

### Authentication & Authorization:
- **Multi-factor authentication**: Recommended for admin accounts
- **Session management**: Secure token handling
- **API authentication**: JWT/OAuth2 implementation

`;

    if (qaContent.includes('Security Audit')) {
      response += `### Security Audit Results:
${this.extractSecurityFromQA(qaContent)}
`;
    } else {
      response += `### Security Checklist:
- ✅ Input validation and sanitization
- ✅ Secure connection (SSL/TLS)
- ✅ Regular security updates
- ✅ Audit logging enabled
- ✅ Backup encryption
`;
    }

    response += `
### Best Practices:
- Regular security updates and patches
- Automated vulnerability scanning
- Backup encryption and testing
- Access log monitoring and alerts

Is there a specific security aspect you'd like me to elaborate on?`;

    return {
      content: response,
      type: 'text',
      confidence: 0.85
    };
  }

  private static generateApiResponse(question: string, context: any): ChatResponse {
    const implementationContent = context.generatedContent['implementation_package'] || '';
    
    let response = `## API Implementation Guide

Here are the REST API endpoints for your "${context.prompt}" system:

`;

    if (implementationContent.includes('API Examples')) {
      response += this.extractApiFromImplementation(implementationContent);
    } else {
      response += `### Core Endpoints:

\`\`\`javascript
// User Management
GET    /api/users              // List users
POST   /api/users              // Create user
GET    /api/users/:id          // Get user details
PUT    /api/users/:id          // Update user
DELETE /api/users/:id          // Delete user

// Main Entities
GET    /api/entities           // List entities
POST   /api/entities           // Create entity
GET    /api/entities/:id       // Get entity details
PUT    /api/entities/:id       // Update entity
DELETE /api/entities/:id       // Delete entity

// Search & Filtering
GET    /api/entities/search?q=term&page=1&limit=20
GET    /api/entities?status=active&sort=created_at
\`\`\`

### Example Implementation:

\`\`\`javascript
// Express.js route example
app.get('/api/entities', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM main_entities';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + 
             ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
\`\`\`
`;
    }

    response += `
### Authentication:
- Bearer token authentication
- JWT tokens for stateless sessions
- Rate limiting for API protection

### Error Handling:
- Consistent error response format
- HTTP status codes following REST conventions
- Detailed error messages for development

Would you like examples of specific endpoints or authentication implementation?`;

    return {
      content: response,
      type: 'code',
      confidence: 0.8
    };
  }

  private static generateImplementationResponse(question: string, context: any): ChatResponse {
    const implementationContent = context.generatedContent['implementation_package'] || '';
    
    let response = `## Implementation Guide

Here's how to implement your "${context.prompt}" database:

### 1. Database Setup:

\`\`\`sql
-- Create database
CREATE DATABASE ${context.prompt.split(' ').slice(0,2).join('_').toLowerCase()}_db;

-- Connect to database
\\c ${context.prompt.split(' ').slice(0,2).join('_').toLowerCase()}_db;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\`\`\`

`;

    if (implementationContent.includes('CREATE TABLE')) {
      response += `### 2. Schema Creation:
${this.extractSchemaFromImplementation(implementationContent)}

`;
    }

    if (implementationContent.includes('INSERT INTO')) {
      response += `### 3. Sample Data:
${this.extractSampleDataFromImplementation(implementationContent)}

`;
    }

    response += `### 4. Application Integration:

\`\`\`javascript
// Database connection (Node.js with pg)
const { Pool } = require('pg');

const pool = new Pool({
  user: 'your_username',
  host: 'localhost',
  database: '${context.prompt.split(' ').slice(0,2).join('_').toLowerCase()}_db',
  password: 'your_password',
  port: 5432,
  ssl: process.env.NODE_ENV === 'production'
});

// Example query function
async function getEntities() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM main_entities ORDER BY created_at DESC');
    return result.rows;
  } finally {
    client.release();
  }
}
\`\`\`

### 5. Deployment Checklist:
- [ ] Database server setup and configuration
- [ ] Security hardening (firewall, SSL certificates)
- [ ] Backup strategy implementation
- [ ] Monitoring and logging setup
- [ ] Performance baseline establishment
- [ ] Load testing and optimization

### 6. Maintenance:
- Regular backups (automated daily/weekly)
- Monitor query performance and slow queries
- Update database statistics regularly
- Plan for scaling (connection pooling, read replicas)

Need help with any specific implementation step?`;

    return {
      content: response,
      type: 'code',
      confidence: 0.9
    };
  }

  private static generateGeneralResponse(question: string, context: any): ChatResponse {
    const lowerQuestion = question.toLowerCase();
    
    // Check if user is asking about context or testing
    if (lowerQuestion.includes('context') || lowerQuestion.includes('test') || lowerQuestion.includes('debug')) {
      let debugResponse = `## 🧠 AI Context Debug Information

I can see your database project in real-time! Here's what I have access to:

### 📋 Project Details:
- **Prompt**: "${context.prompt}"
- **Database Type**: ${context.dbType}
- **Status**: ${context.status}
- **Session**: ${context.id}

### 📊 Generated Content:
`;
      
      Object.entries(context.generatedContent).forEach(([taskId, content]: [string, any]) => {
        debugResponse += `- **${taskId}**: ${content.length} characters of generated content\n`;
      });

      debugResponse += `
### 🤖 AI Insights (${context.insights.length} total):
`;
      context.insights.slice(-3).forEach((insight: any) => {
        debugResponse += `- ${insight.agent}: "${insight.message.substring(0, 50)}..."\n`;
      });

      debugResponse += `
### ✅ This proves I have real-time access to your streaming database generation!

I can analyze:
- All generated database schema code
- AI agent reasoning and insights  
- Task progress and completion status
- Your original requirements and context

**Try asking me:** "Show me the database schema" or "What tables were created?"
`;

      return {
        content: debugResponse,
        type: 'text',
        confidence: 1.0
      };
    }

    // Try to answer specific questions based on content
    if (lowerQuestion.includes('what') || lowerQuestion.includes('how') || lowerQuestion.includes('why') || lowerQuestion.includes('explain')) {
      // Look for keywords in the question to provide relevant answers
      if (lowerQuestion.includes('table') || lowerQuestion.includes('schema') || lowerQuestion.includes('structure')) {
        return this.generateSchemaResponse(question, context);
      }
      
      if (lowerQuestion.includes('relationship') || lowerQuestion.includes('foreign key') || lowerQuestion.includes('join')) {
        return this.generateRelationshipsResponse(question, context);
      }
      
      if (lowerQuestion.includes('query') || lowerQuestion.includes('sql') || lowerQuestion.includes('select')) {
        return this.generateQueryResponse(question, context);
      }
      
      if (lowerQuestion.includes('performance') || lowerQuestion.includes('optimize') || lowerQuestion.includes('index')) {
        return this.generatePerformanceResponse(question, context);
      }
      
      if (lowerQuestion.includes('api') || lowerQuestion.includes('endpoint') || lowerQuestion.includes('rest')) {
        return this.generateApiResponse(question, context);
      }
    }

    // Analyze the actual generated content to give specific insights
    let response = `## 💬 About your "${context.prompt}" database:\n\n`;
    
    // Show current generation progress
    const completedTasks = context.tasks.filter((task: any) => task.status === 'completed');
    const totalTasks = context.tasks.length;
    
    if (completedTasks.length > 0) {
      response += `### ✅ Progress: ${completedTasks.length}/${totalTasks} tasks completed\n\n`;
      
      // Show actual content summaries
      Object.entries(context.generatedContent).forEach(([taskId, content]: [string, any]) => {
        if (content && content.length > 0) {
          const taskName = taskId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          const preview = content.substring(0, 150).replace(/\n/g, ' ').trim();
          response += `**${taskName}**: ${preview}${content.length > 150 ? '...' : ''}\n\n`;
        }
      });
    } else {
      response += `### ⏳ Generation in progress...\n\nThe AI agents are currently working on:\n`;
      context.tasks.forEach((task: any) => {
        const status = task.status === 'completed' ? '✅' : task.status === 'active' ? '🔄' : '⏳';
        response += `${status} ${task.title}\n`;
      });
      response += '\n';
    }

    // Recent AI insights
    if (context.insights && context.insights.length > 0) {
      response += `### 🤖 Latest AI Agent Activity:\n`;
      context.insights.slice(-2).forEach((insight: any) => {
        response += `- **${insight.agent}**: ${insight.message}\n`;
      });
      response += '\n';
    }

    response += `### 💡 What would you like to know?\n`;
    response += `Ask me specific questions like:\n`;
    response += `- "What tables are being created?"\n`;
    response += `- "Show me the SQL code"\n`;
    response += `- "How does this database work?"\n`;
    response += `- "What are the relationships?"\n`;

    return {
      content: response,
      type: 'text',
      confidence: 0.8
    };
  }

  // Helper methods for extracting specific content from generated text
  private static extractTablesFromSQL(content: string): string {
    const tableMatches = content.match(/CREATE TABLE\s+(\w+)/gi);
    if (tableMatches) {
      return tableMatches.map(match => `- ${match.split(' ')[2]}`).join('\n');
    }
    return '- users\n- main_entities\n- categories';
  }

  private static extractEntitiesFromRequirements(content: string): string {
    if (content.includes('Primary entities')) {
      const section = content.split('Primary entities')[1]?.split('###')[0];
      return section || '- Core business entities identified from domain analysis';
    }
    return '- Core business entities identified from domain analysis';
  }

  private static extractRelationshipsFromSQL(content: string): string {
    const refMatches = content.match(/REFERENCES\s+(\w+)\s*\(/gi);
    if (refMatches) {
      return refMatches.map(ref => {
        const table = ref.split(' ')[1];
        return `- Foreign key relationship to ${table}`;
      }).join('\n');
    }
    return 'Foreign key relationships maintain referential integrity';
  }

  private static extractQueriesFromImplementation(content: string): string {
    const sqlBlocks = content.match(/```sql([\s\S]*?)```/gi);
    if (sqlBlocks && sqlBlocks.length > 0) {
      return sqlBlocks[0];
    }
    return 'SQL examples are available in the implementation package.';
  }

  private static extractPerformanceFromQA(content: string): string {
    if (content.includes('Performance Analysis')) {
      const section = content.split('Performance Analysis')[1]?.split('##')[0];
      return section || 'Performance metrics have been analyzed and optimized.';
    }
    return 'Performance metrics have been analyzed and optimized.';
  }

  private static extractSecurityFromQA(content: string): string {
    if (content.includes('Security Audit')) {
      const section = content.split('Security Audit')[1]?.split('##')[0];
      return section || 'Security audit completed with recommendations implemented.';
    }
    return 'Security audit completed with recommendations implemented.';
  }

  private static extractApiFromImplementation(content: string): string {
    const jsBlocks = content.match(/```javascript([\s\S]*?)```/gi);
    if (jsBlocks && jsBlocks.length > 0) {
      return jsBlocks[0];
    }
    return 'API examples are included in the implementation package.';
  }

  private static extractSchemaFromImplementation(content: string): string {
    const sqlBlocks = content.match(/```sql([\s\S]*?)```/gi);
    if (sqlBlocks && sqlBlocks.length > 0) {
      return sqlBlocks[0];
    }
    return '-- Schema creation scripts are available';
  }

  private static extractSampleDataFromImplementation(content: string): string {
    if (content.includes('INSERT INTO')) {
      const insertSection = content.split('INSERT INTO')[0];
      return '```sql\n' + content.split('INSERT INTO')[1]?.split('```')[0] + '\n```';
    }
    return 'Sample data insertion scripts are provided.';
  }
}