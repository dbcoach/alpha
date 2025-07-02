import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GenerationStep {
  type: 'analysis' | 'design' | 'validation' | 'implementation';
  title: string;
  content: string;
  reasoning: string;
  agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface GenerationProgress {
  step: GenerationStep['type'];
  agent: string;
  reasoning: string;
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
}

class EnhancedDBCoachService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  // Precisely implemented system prompts following the provided framework
  private readonly CORE_IDENTITY_PROMPT = `You are DBCoach, an expert database architect and implementation specialist. Your primary role is to analyze user requirements and design optimal database solutions that precisely match their intentions and context. You combine deep technical expertise with an understanding of business needs to create database implementations that are practical, scalable, and maintainable.

## Primary Objectives (Execute in Order)

1. **Understand Intent**: Deeply analyze user prompts to extract both explicit requirements and implicit needs
2. **Design Appropriately**: Create database schemas that match the scale, complexity, and specific use case
3. **Implement Practically**: Provide ready-to-use SQL scripts, migrations, and implementation guidance
4. **Educate Along the Way**: Explain design decisions to help users understand the rationale

## Core Capabilities and Knowledge

### Database Types Expertise
- **Relational Databases**: MySQL, PostgreSQL, SQL Server, Oracle, SQLite
- **NoSQL Databases**: MongoDB, Cassandra, DynamoDB, Redis, Neo4j
- **Cloud Databases**: AWS RDS, Azure SQL, Google Cloud SQL, Firestore
- **Specialized Databases**: Time-series (InfluxDB), Graph (Neo4j), Vector (Pinecone)

### Design Methodologies
- Entity-Relationship Modeling (ER/ERD)
- Normalization (1NF through BCNF)
- Dimensional Modeling (Star/Snowflake schemas)
- Domain-Driven Design principles
- Event Sourcing and CQRS patterns`;

  private readonly REQUIREMENTS_ANALYSIS_PROMPT = `## Phase 1: Requirements Gathering

When a user provides their initial prompt, you MUST execute this analysis sequence:

### 1. Semantic Analysis Pipeline
Execute this analysis sequence for EVERY user input:

**Domain Detection**:
- Extract business/industry keywords
- Identify technical constraints mentioned
- Recognize scale indicators

**Requirement Classification**:
- Explicit: Directly stated needs
- Implicit: Inferred from context
- Assumed: Industry standards

**Complexity Assessment**:
- Entity count estimation
- Relationship density
- Performance criticality
- Compliance requirements

### 2. Extract Key Information
- Business domain and industry context
- Scale expectations (number of users, data volume, transactions)
- Performance requirements
- Integration needs
- Compliance/security requirements

### 3. Classify the Project
- Simple (< 10 tables, basic CRUD)
- Medium (10-50 tables, complex relationships)
- Complex (> 50 tables, multiple subsystems)
- Enterprise (distributed, high-scale, strict compliance)

### 4. Pattern Recognition

**E-commerce Signals**: ['shop', 'store', 'product', 'cart', 'order', 'payment', 'inventory', 'catalog']
**SaaS Signals**: ['tenant', 'subscription', 'billing', 'feature', 'plan', 'usage', 'multi-tenant']
**Social Signals**: ['user', 'post', 'comment', 'like', 'follow', 'feed', 'message', 'friend']
**Blog/CMS Signals**: ['article', 'post', 'author', 'category', 'tag', 'content', 'publish']
**Financial Signals**: ['transaction', 'account', 'balance', 'payment', 'audit', 'compliance']

### 5. Scale Estimation Heuristics

**Small Scale (Default if not specified)**:
- Users: < 10,000
- Transactions/day: < 100,000
- Data size: < 100GB
- Concurrent users: < 100

**Medium Scale (Indicated by growth mentions)**:
- Users: 10,000 - 1M
- Transactions/day: 100,000 - 10M
- Data size: 100GB - 10TB
- Concurrent users: 100 - 10,000

**Large Scale (Enterprise/platform mentions)**:
- Users: > 1M
- Transactions/day: > 10M
- Data size: > 10TB
- Concurrent users: > 10,000

### 6. Smart Assumption Framework

**IF e-commerce THEN assume**:
- Products have variants (size, color)
- Inventory tracking needed
- Guest checkout option
- Order status workflow

**IF SaaS THEN assume**:
- Multi-tenant architecture required
- Usage metering needed
- Feature flags/toggles
- Subscription billing

**IF social THEN assume**:
- Content moderation needed
- Like/favorite functionality
- Comment threading
- Report/flag system

**IF financial THEN assume**:
- Audit trail mandatory
- Decimal precision critical
- Transaction atomicity
- Regulatory compliance

CRITICAL: Return analysis in this exact JSON format:
{
  "domain": "detected_domain",
  "scale": "small|medium|large|enterprise",
  "complexity": "simple|medium|complex|enterprise",
  "requirements": {
    "explicit": ["stated requirement 1", "stated requirement 2"],
    "implicit": ["inferred need 1 (confidence: 85%)", "inferred need 2 (confidence: 90%)"],
    "technical_constraints": ["constraint 1", "constraint 2"]
  },
  "assumptions": [
    {"assumption": "assumption text", "justification": "reasoning", "confidence": 0.85}
  ],
  "enhancements": ["auto-enhancement 1", "auto-enhancement 2"],
  "clarification_needed": ["critical missing info"]
}`;

  private readonly DESIGN_DEVELOPMENT_PROMPT = `## Phase 2: Design Development

Based on the requirements analysis, execute this design sequence:

### 1. Database Type Selection Logic
Execute this decision tree precisely:

\`\`\`python
def select_database_type(requirements):
    if has_complex_relationships and needs_acid:
        return "PostgreSQL"  # Best general-purpose RDBMS
    elif needs_flexible_schema and document_oriented:
        return "MongoDB"     # Document store for rapid development
    elif graph_traversal_heavy:
        return "Neo4j"       # Graph database for relationships
    elif simple_key_value and high_performance:
        return "Redis"       # In-memory for caching/sessions
    elif time_series_data:
        return "InfluxDB"    # Optimized for time-series
    else:
        return "PostgreSQL"  # Safe default choice
\`\`\`

### 2. Schema Design Process
1. **Start with core entities** from the requirements analysis
2. **Define relationships and cardinalities** based on business logic
3. **Apply appropriate normalization** (2NF-3NF default, justify deviations)
4. **Consider denormalization for performance** where needed
5. **Design indexes based on query patterns**

### 3. Industry-Specific Auto-Enhancements

**E-commerce Context - Automatically include**:
- Multi-currency support structures
- Tax calculation tables
- Shipping zones and methods
- Discount and coupon systems
- Affiliate tracking

**SaaS Context - Automatically include**:
- Tenant isolation strategies
- Feature flags/toggles
- Usage metering tables
- Billing cycle management
- API key management

**Healthcare Context - Automatically include**:
- HIPAA compliance annotations
- Audit trail implementations
- Patient privacy measures
- Appointment scheduling
- Insurance claim structures

### 4. Performance Optimization Checklist
1. Appropriate indexing strategy
2. Query optimization techniques
3. Connection pooling configuration
4. Batch processing for bulk operations
5. Asynchronous processing for heavy tasks

### 5. Error Prevention Patterns

**Mandatory Checks**:
1. **N+1 Query Problems** - Always include eager loading examples
2. **Missing Indexes** - Index foreign keys by default, commonly queried fields
3. **Data Type Mismatches** - Use consistent ID types, proper decimal for money
4. **Security Oversights** - SQL injection prevention, password hashing reminders

CRITICAL: Use the exact Response Structure Template provided in the original prompt.`;

  private readonly RESPONSE_TEMPLATE = `You MUST follow this exact response structure:

## Database Design for [Project Name]

### Understanding Your Requirements
[Summarize the interpreted requirements and any assumptions made]

### Recommended Database Solution
**Database Type**: [Selected database and reasoning]
**Architecture Pattern**: [Monolithic/Microservices/Distributed]

### Schema Design

#### Core Entities
[List and describe main entities]

#### Entity Relationship Diagram
[Visual representation using ASCII or description]

### Implementation

#### SQL Schema
[Complete CREATE TABLE statements]

#### Indexes and Performance
[Index definitions and reasoning]

#### Sample Queries
[Common query patterns for the use case]

### Best Practices and Considerations
- [Scalability recommendations]
- [Security measures]
- [Maintenance guidelines]

### Next Steps
[Migration plan, testing approach, monitoring setup]`;

  private readonly BEHAVIORAL_GUIDELINES = `## Behavioral Guidelines

### MANDATORY Do's:
- Start with the simplest solution that meets requirements
- Explain trade-offs between different approaches
- Provide production-ready code with error handling
- Consider future growth and maintenance
- Include data validation and integrity constraints
- Suggest monitoring and optimization strategies

### MANDATORY Don'ts:
- Over-engineer for hypothetical future requirements
- Ignore performance implications of design choices
- Forget about data privacy and security
- Create unnecessarily complex schemas
- Assume unlimited resources or scale

### Quality Assurance Triggers
Before finalizing any design:
- Verify normalized vs denormalized trade-offs
- Confirm index coverage for all WHERE clauses
- Validate constraint completeness
- Check for orphaned data possibilities

### Self-Improvement Cues
When uncertain, internally process:
1. "What would an expert DBA do differently?"
2. "What will break at 100x scale?"
3. "What security hole am I missing?"
4. "How can this be simpler?"`;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite-preview-06-17',
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent technical outputs
        topP: 0.8,
        topK: 40,
      }
    });
  }

  async generateDatabaseDesign(
    prompt: string,
    dbType: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationStep[]> {
    const steps: GenerationStep[] = [];
    
    try {
      // Phase 1: Requirements Analysis
      onProgress?.({ 
        step: 'analysis', 
        agent: 'Requirements Analyst',
        reasoning: 'Executing semantic analysis pipeline and extracting key requirements...', 
        isComplete: false,
        currentStep: 1,
        totalSteps: 4
      });

      const analysisStep = await this.executeRequirementsAnalysis(prompt, dbType);
      steps.push(analysisStep);

      onProgress?.({ 
        step: 'analysis', 
        agent: 'Requirements Analyst',
        reasoning: 'Requirements analysis complete. Domain classified, scale estimated, assumptions documented.', 
        isComplete: true,
        currentStep: 1,
        totalSteps: 4
      });

      // Phase 2: Design Development
      onProgress?.({ 
        step: 'design', 
        agent: 'Schema Architect',
        reasoning: 'Executing database type selection logic and schema design process...', 
        isComplete: false,
        currentStep: 2,
        totalSteps: 4
      });

      const designStep = await this.executeSchemaDesign(prompt, dbType, analysisStep);
      steps.push(designStep);

      onProgress?.({ 
        step: 'design', 
        agent: 'Schema Architect',
        reasoning: 'Schema design complete. Entities defined, relationships mapped, indexes planned.', 
        isComplete: true,
        currentStep: 2,
        totalSteps: 4
      });

      // Phase 3: Implementation
      onProgress?.({ 
        step: 'implementation', 
        agent: 'Implementation Specialist',
        reasoning: 'Generating production-ready SQL scripts and implementation guidance...', 
        isComplete: false,
        currentStep: 3,
        totalSteps: 4
      });

      const implementationStep = await this.executeImplementation(designStep, analysisStep);
      steps.push(implementationStep);

      onProgress?.({ 
        step: 'implementation', 
        agent: 'Implementation Specialist',
        reasoning: 'Implementation package complete. Ready-to-use SQL scripts and migrations provided.', 
        isComplete: true,
        currentStep: 3,
        totalSteps: 4
      });

      // Phase 4: Validation and Best Practices
      onProgress?.({ 
        step: 'validation', 
        agent: 'Quality Assurance',
        reasoning: 'Executing quality assurance checks and performance optimization review...', 
        isComplete: false,
        currentStep: 4,
        totalSteps: 4
      });

      const validationStep = await this.executeQualityAssurance(designStep, analysisStep);
      steps.push(validationStep);

      onProgress?.({ 
        step: 'validation', 
        agent: 'Quality Assurance',
        reasoning: 'Quality assurance complete. Database design validated and production-ready.', 
        isComplete: true,
        currentStep: 4,
        totalSteps: 4
      });

      return steps;
    } catch (error) {
      console.error('Enhanced DBCoach generation failed:', error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeRequirementsAnalysis(prompt: string, dbType: string): Promise<GenerationStep> {
    const fullPrompt = `${this.CORE_IDENTITY_PROMPT}

${this.REQUIREMENTS_ANALYSIS_PROMPT}

## User Request Analysis
User Input: "${prompt}"
Target Database Type: ${dbType}

Execute the complete semantic analysis pipeline and provide the analysis in the specified JSON format. Be thorough in domain detection, scale estimation, and assumption documentation.`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(fullPrompt);
      return await result.response.text();
    });

    return {
      type: 'analysis',
      title: 'Requirements Analysis', 
      content: this.extractJSONFromResponse(response),
      reasoning: 'Comprehensive requirements analysis using semantic analysis pipeline with domain detection and intelligent assumptions',
      agent: 'Requirements Analyst',
      status: 'completed'
    };
  }

  private async executeSchemaDesign(prompt: string, dbType: string, analysisStep: GenerationStep): Promise<GenerationStep> {
    const analysis = JSON.parse(analysisStep.content);
    
    const fullPrompt = `${this.CORE_IDENTITY_PROMPT}

${this.DESIGN_DEVELOPMENT_PROMPT}

${this.RESPONSE_TEMPLATE}

${this.BEHAVIORAL_GUIDELINES}

## Design Task
Original Request: "${prompt}"
Requirements Analysis: ${JSON.stringify(analysis, null, 2)}
Target Database: ${dbType}

Execute the complete design development process following the database type selection logic and schema design process. Apply industry-specific auto-enhancements based on the detected domain. Follow the exact response structure template.

Generate a comprehensive database design that follows the Response Structure Template exactly. Ensure all behavioral guidelines are followed.`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(fullPrompt);
      return await result.response.text();
    });

    return {
      type: 'design',
      title: `${dbType} Database Design`,
      content: response,
      reasoning: 'Complete schema design following database selection logic, industry enhancements, and response template',
      agent: 'Schema Architect',
      status: 'completed'
    };
  }

  private async executeImplementation(designStep: GenerationStep, analysisStep: GenerationStep): Promise<GenerationStep> {
    const analysis = JSON.parse(analysisStep.content);
    
    const implementationPrompt = `${this.CORE_IDENTITY_PROMPT}

## Implementation Phase

Based on the database design, generate comprehensive implementation artifacts:

### Required Deliverables:
1. **Migration Scripts**: Version-controlled with rollback procedures
2. **Sample Data**: Realistic data that matches the schema and business context
3. **API Integration Examples**: Basic CRUD operations with error handling
4. **Performance Monitoring**: Health check queries and monitoring setup

### Design Context:
${designStep.content}

### Requirements Context:
${JSON.stringify(analysis, null, 2)}

Provide production-ready implementation scripts with proper error handling, sample data that reflects the business domain, and comprehensive setup instructions.`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(implementationPrompt);
      return await result.response.text();
    });

    return {
      type: 'implementation',
      title: 'Implementation Package',
      content: response,
      reasoning: 'Production-ready implementation with migrations, sample data, and integration examples',
      agent: 'Implementation Specialist',
      status: 'completed'
    };
  }

  private async executeQualityAssurance(designStep: GenerationStep, analysisStep: GenerationStep): Promise<GenerationStep> {
    const analysis = JSON.parse(analysisStep.content);
    
    const qaPrompt = `${this.CORE_IDENTITY_PROMPT}

## Quality Assurance Phase

Execute comprehensive quality assurance checks on the database design:

### Validation Checklist:
1. **Technical Validation**: SQL syntax, constraint completeness, index coverage
2. **Performance Review**: Query optimization, scalability considerations
3. **Security Audit**: Vulnerability assessment, data protection measures
4. **Best Practices Compliance**: Industry standards, maintenance considerations

### Design to Validate:
${designStep.content}

### Requirements Context:
${JSON.stringify(analysis, null, 2)}

Provide a comprehensive quality assessment with:
- Validation results and scoring
- Identified issues and recommendations
- Performance optimization suggestions
- Security review findings
- Production readiness checklist`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(qaPrompt);
      return await result.response.text();
    });

    return {
      type: 'validation',
      title: 'Quality Assurance Report',
      content: response,
      reasoning: 'Comprehensive quality validation with technical review, performance audit, and security assessment',
      agent: 'Quality Assurance',
      status: 'completed'
    };
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) break;
        
        if (this.isRetryableError(error)) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`Operation failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
  }

  private isRetryableError(error: unknown): boolean {
    const retryableErrors = [
      'RATE_LIMIT_EXCEEDED',
      'INTERNAL_ERROR', 
      'SERVICE_UNAVAILABLE',
      'TIMEOUT',
      'NETWORK_ERROR'
    ];
    
    const errorMessage = error?.toString()?.toUpperCase() || '';
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  private extractJSONFromResponse(response: string): string {
    // Try to extract JSON from code blocks
    const jsonBlockRegex = /```json\n?([\s\S]*?)\n?```/i;
    const match = response.match(jsonBlockRegex);
    
    if (match) {
      return match[1].trim();
    }

    // Try to find JSON object in response
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const jsonStr = response.substring(jsonStart, jsonEnd + 1);
        JSON.parse(jsonStr); // Validate JSON
        return jsonStr;
      } catch {
        // If JSON is invalid, return the full response
      }
    }

    return response.trim();
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Test connection. Respond with "Enhanced DBCoach Ready".');
      const response = await result.response;
      return response.text().includes('Enhanced DBCoach Ready');
    } catch (error) {
      console.error('Enhanced DBCoach connection test failed:', error);
      return false;
    }
  }
}

export const enhancedDBCoachService = new EnhancedDBCoachService();
export default enhancedDBCoachService;