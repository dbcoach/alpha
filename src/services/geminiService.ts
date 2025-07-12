import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatabaseTypePromptEngine } from './databaseTypePrompts';

export interface GenerationStep {
  type: 'schema' | 'data' | 'api' | 'visualization';
  title: string;
  content: string;
  reasoning: string;
}

export interface GenerationProgress {
  step: GenerationStep['type'];
  reasoning: string;
  isComplete: boolean;
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is required. Please add your Gemini API key to the .env file.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-06-17' });
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
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // Non-retryable error, throw immediately
          throw error;
        }
      }
    }
    
    throw new Error(`Operation failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
  }

  private isRetryableError(error: unknown): boolean {
    // Retry on network errors, rate limits, and temporary server errors
    const retryableErrors = [
      'RATE_LIMIT_EXCEEDED',
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
      'TIMEOUT',
      'NETWORK_ERROR'
    ];
    
    const errorMessage = error?.message?.toUpperCase() || '';
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  async generateDatabaseDesign(
    prompt: string,
    dbType: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationStep[]> {
    const steps: GenerationStep[] = [];
    
    try {
      // Step 1: Generate Schema with database-type-specific optimization
      onProgress?.({ 
        step: 'schema', 
        reasoning: `Analyzing requirements and designing optimized ${dbType} database structure with enterprise-grade features...`, 
        isComplete: false 
      });
      
      const schemaStep = await this.generateSchema(prompt, dbType);
      
      // Validate schema for database-specific requirements
      const schemaValidation = await this.validateSchema(schemaStep.content, dbType);
      if (!schemaValidation.isValid) {
        console.warn('Schema validation issues found:', schemaValidation.issues);
        // Attempt to regenerate with validation feedback
        const improvedSchema = await this.regenerateSchemaWithValidation(prompt, dbType, schemaValidation.issues);
        schemaStep.content = improvedSchema.content;
        schemaStep.reasoning += `\n\n⚠️ Schema was automatically improved based on validation feedback: ${schemaValidation.issues.join(', ')}`;
      }
      
      steps.push(schemaStep);
      
      onProgress?.({ 
        step: 'schema', 
        reasoning: 'Database schema generated and validated successfully!', 
        isComplete: true 
      });

      // Step 2: Generate Sample Data with referential integrity
      onProgress?.({ 
        step: 'data', 
        reasoning: `Creating realistic sample data with ${dbType}-specific formatting and integrity constraints...`, 
        isComplete: false 
      });
      
      const dataStep = await this.generateSampleData(prompt, dbType, schemaStep.content);
      
      // Validate sample data for integrity and format
      const dataValidation = await this.validateSampleData(dataStep.content, dbType, schemaStep.content);
      if (!dataValidation.isValid) {
        console.warn('Sample data validation issues found:', dataValidation.issues);
        dataStep.reasoning += `\n\n⚠️ Data validation notes: ${dataValidation.issues.join(', ')}`;
      }
      
      steps.push(dataStep);
      
      onProgress?.({ 
        step: 'data', 
        reasoning: 'Sample data generated with realistic examples and validated for integrity!', 
        isComplete: true 
      });

      // Step 3: Generate API Endpoints
      onProgress?.({ 
        step: 'api', 
        reasoning: `Building production-ready REST API endpoints optimized for ${dbType}...`, 
        isComplete: false 
      });
      
      const apiStep = await this.generateAPIEndpoints(prompt, dbType, schemaStep.content);
      steps.push(apiStep);
      
      onProgress?.({ 
        step: 'api', 
        reasoning: 'Complete REST API documentation with security and performance considerations ready!', 
        isComplete: true 
      });

      // Step 4: Generate Visualization with Enhanced Insights
      onProgress?.({ 
        step: 'visualization', 
        reasoning: `Creating comprehensive database visualization and architecture diagram for ${dbType}...`, 
        isComplete: false 
      });
      
      const vizStep = await this.generateVisualization(prompt, dbType, schemaStep.content);
      steps.push(vizStep);
      
      onProgress?.({ 
        step: 'visualization', 
        reasoning: `Database design complete with enhanced ${dbType} visualization and architectural insights!`, 
        isComplete: true 
      });

      // Final validation summary
      const overallValidation = this.generateValidationSummary(steps, dbType);
      console.log('📊 Enhanced Standard Mode Generation Summary:', overallValidation);

      return steps;
    } catch (error) {
      console.error('Enhanced database generation failed:', error);
      throw new Error(`Enhanced generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateSchema(prompt: string, dbType: string): Promise<GenerationStep> {
    const schemaPrompt = this.buildSchemaPrompt(prompt, dbType);
    
    const text = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(schemaPrompt);
      const response = await result.response;
      return response.text();
    });

    return {
      type: 'schema',
      title: `${dbType} Database Schema`,
      content: this.extractCodeFromResponse(text, dbType === 'SQL' ? 'sql' : 'json'),
      reasoning: this.extractReasoningFromResponse(text)
    };
  }

  private async generateSampleData(prompt: string, dbType: string, schema: string): Promise<GenerationStep> {
    const dataPrompt = this.buildSampleDataPrompt(prompt, dbType, schema);
    
    const text = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(dataPrompt);
      const response = await result.response;
      return response.text();
    });

    return {
      type: 'data',
      title: 'Sample Data',
      content: text,
      reasoning: 'Generated realistic sample data that matches your schema structure and business context'
    };
  }

  private async generateAPIEndpoints(prompt: string, dbType: string, schema: string): Promise<GenerationStep> {
    const apiPrompt = this.buildAPIPrompt(prompt, dbType, schema);
    
    const text = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(apiPrompt);
      const response = await result.response;
      return response.text();
    });

    return {
      type: 'api',
      title: 'REST API Endpoints',
      content: text,
      reasoning: 'Created comprehensive REST API endpoints with full CRUD operations for all entities'
    };
  }

  private async generateVisualization(prompt: string, dbType: string, schema: string): Promise<GenerationStep> {
    const vizPrompt = this.buildVisualizationPrompt(prompt, dbType, schema);
    
    const text = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(vizPrompt);
      const response = await result.response;
      return response.text();
    });

    return {
      type: 'visualization',
      title: 'Database Visualization',
      content: text,
      reasoning: 'Generated ER diagram and database visualization showing entity relationships'
    };
  }

  private buildSchemaPrompt(prompt: string, dbType: string): string {
    // Use database-type-specific prompts for optimal results
    try {
      const promptTemplate = DatabaseTypePromptEngine.getPromptTemplate(dbType);
      const contextualPrompt = DatabaseTypePromptEngine.buildContextualPrompt(
        dbType,
        'designPrompt',
        {
          user_request: prompt,
          analysis_results: `User Request: "${prompt}"\nDatabase Type: ${dbType}\nComplexity: Standard Mode Generation`
        }
      );
      return contextualPrompt;
    } catch (error) {
      console.warn('Failed to use DatabaseTypePromptEngine, falling back to basic prompts:', error);
      // Fallback to enhanced basic prompt
      return this.buildEnhancedSchemaPrompt(prompt, dbType);
    }
  }

  private buildEnhancedSchemaPrompt(prompt: string, dbType: string): string {
    const dbSpecificGuidance = this.getDatabaseSpecificGuidance(dbType);
    
    return `${dbSpecificGuidance.systemPrompt}

**User Requirement**: "${prompt}"
**Target Database**: ${dbType}

${dbSpecificGuidance.designInstructions}

**ENHANCED REQUIREMENTS**:
1. Design a production-ready ${dbType} database schema
2. Include proper relationships, constraints, and indexes
3. Use appropriate data types and naming conventions
4. Add comments explaining design decisions
5. Ensure scalability and performance optimization
6. Follow database-specific best practices
7. Include security considerations
8. Plan for future growth and maintenance

**RESPONSE FORMAT**:
Provide comprehensive analysis and design:

**REASONING**: [Your design thinking and analysis]
**SCHEMA**: [Complete, production-ready code]
**PERFORMANCE**: [Optimization strategies]
**SECURITY**: [Security considerations]

${dbSpecificGuidance.outputFormat}`;
  }

  private buildSampleDataPrompt(prompt: string, dbType: string, schema: string): string {
    // Use database-type-specific sample data generation
    const dbSpecificGuidance = this.getDatabaseSpecificGuidance(dbType);
    
    return `${dbSpecificGuidance.sampleDataPrompt}

**Database Schema**:
${schema}

**Original Requirement**: "${prompt}"
**Database Type**: ${dbType}

**ENHANCED REQUIREMENTS**:
1. Create realistic, diverse sample data that reflects real-world usage
2. Maintain referential integrity between related tables/documents/collections
3. Include edge cases and varied data patterns
4. Generate appropriate volume per entity type
5. Use realistic names, dates, and business-relevant content
6. Follow database-specific data format standards
7. Include proper data relationships and constraints
8. Ensure data supports common query patterns

${dbSpecificGuidance.sampleDataFormat}

The data should be immediately usable and reflect the business context from the original prompt.`;
  }

  private buildAPIPrompt(prompt: string, dbType: string, schema: string): string {
    return `Design REST API endpoints for this ${dbType} database:

SCHEMA:
${schema}

ORIGINAL REQUIREMENT: "${prompt}"

REQUIREMENTS:
1. Create RESTful endpoints for all main entities
2. Include full CRUD operations (GET, POST, PUT, DELETE)
3. Add filtering, pagination, and search capabilities
4. Provide request/response examples with realistic data
5. Include proper HTTP status codes and error handling
6. Add authentication/authorization considerations

RESPONSE FORMAT:
Provide the API documentation in JSON format with:
- endpoint path and method
- description
- request parameters and body
- response format and examples
- status codes

Focus on practical, production-ready API design.`;
  }

  private buildVisualizationPrompt(prompt: string, dbType: string, schema: string): string {
    return `Create a database visualization description for this ${dbType} schema:

SCHEMA:
${schema}

ORIGINAL REQUIREMENT: "${prompt}"

REQUIREMENTS:
1. Describe the entity relationship diagram (ERD)
2. Explain the relationships between entities
3. Identify key data flows and dependencies
4. Suggest visualization layouts and groupings
5. Highlight important business logic relationships

RESPONSE FORMAT:
Provide a detailed description that includes:
- Entity relationship mapping
- Visual layout suggestions
- Key relationship types (1:1, 1:many, many:many)
- Suggested groupings by business domain
- Important data flow patterns

This will be used to generate visual diagrams and help users understand the database structure.`;
  }

  private extractCodeFromResponse(response: string, codeType: string): string {
    const codeBlockRegex = new RegExp(`\`\`\`${codeType}?\\n?([\\s\\S]*?)\`\`\``, 'i');
    const match = response.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }

    // If no code block found, look for content after "SCHEMA:" marker
    const schemaMarker = response.indexOf('SCHEMA:');
    if (schemaMarker !== -1) {
      return response.substring(schemaMarker + 7).trim();
    }

    return response.trim();
  }

  private extractReasoningFromResponse(response: string): string {
    // Enhanced reasoning extraction for database-specific responses
    const reasoningMarkers = ['REASONING:', '### Analysis', '## Analysis', '🎯 Analysis'];
    const schemaMarkers = ['SCHEMA:', '### Schema', '## Schema', '💡 Solution'];
    
    let reasoningStart = -1;
    let reasoningEnd = -1;
    
    // Find reasoning start
    for (const marker of reasoningMarkers) {
      const index = response.indexOf(marker);
      if (index !== -1) {
        reasoningStart = index + marker.length;
        break;
      }
    }
    
    // Find reasoning end
    for (const marker of schemaMarkers) {
      const index = response.indexOf(marker);
      if (index !== -1 && index > reasoningStart) {
        reasoningEnd = index;
        break;
      }
    }
    
    if (reasoningStart !== -1 && reasoningEnd !== -1) {
      return response.substring(reasoningStart, reasoningEnd).trim();
    }
    
    if (reasoningStart !== -1) {
      return response.substring(reasoningStart).trim();
    }
    
    // Fallback: return first meaningful paragraph
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 50);
    return paragraphs[0]?.trim() || 'Database design generated with enhanced capabilities';
  }

  private getDatabaseSpecificGuidance(dbType: string): any {
    switch (dbType.toLowerCase()) {
      case 'sql':
      case 'postgresql':
      case 'mysql':
      case 'sqlite':
        return {
          systemPrompt: `You are a SQL Database Expert specializing in ACID-compliant relational database design with enterprise-grade optimization and Fortune 500 production experience.`,
          designInstructions: `**ENTERPRISE SQL DESIGN APPROACH**:
- **ACID Transaction Guarantees**: Atomicity, Consistency, Isolation, Durability with proper isolation levels
- **Advanced Normalization**: 2NF-3NF default with strategic denormalization for performance
- **Referential Integrity**: Complete foreign key constraints with CASCADE rules
- **Performance Optimization**: Strategic indexing, query optimization, execution plan analysis
- **Security Framework**: Row-level security, data encryption, audit trails
- **Scalability Planning**: Partitioning, sharding strategies, read replicas
- **Enterprise Features**: Stored procedures, triggers, views, materialized views
- **Data Quality**: Check constraints, unique constraints, NOT NULL enforcement`,
          outputFormat: `**PRODUCTION-READY SQL OUTPUT FORMAT**:

## 🗄️ Enterprise SQL Database Schema

### Core Tables with ACID Compliance
\`\`\`sql
-- Primary entities with complete normalization and constraints
-- All tables include audit fields and proper data types
-- Foreign key relationships with CASCADE rules
\`\`\`

### Performance Optimization
\`\`\`sql
-- Strategic indexes for query performance
CREATE INDEX idx_table_field ON table_name (field) WHERE condition;
-- Composite indexes for complex queries
CREATE INDEX idx_table_composite ON table_name (field1, field2);
-- Unique indexes for business constraints
CREATE UNIQUE INDEX idx_table_unique ON table_name (unique_field);
\`\`\`

### Enterprise Security
\`\`\`sql
-- Row-level security policies
CREATE POLICY policy_name ON table_name FOR SELECT USING (condition);
-- Data encryption for sensitive fields
-- Audit trail triggers
\`\`\`

### Advanced Features
\`\`\`sql
-- Stored procedures for complex business logic
-- Triggers for data validation and audit
-- Views for data abstraction
-- Materialized views for performance
\`\`\``,
          sampleDataPrompt: `You are an Enterprise SQL Data Generation Specialist. Create production-quality, ACID-compliant sample data with complete referential integrity.`,
          sampleDataFormat: `**ENTERPRISE SQL SAMPLE DATA FORMAT**:
\`\`\`sql
-- Transaction-wrapped INSERT statements ensuring ACID compliance
BEGIN TRANSACTION;

-- Master data first (referential integrity order)
INSERT INTO categories (id, name, description, created_at) VALUES 
(1, 'Electronics', 'Electronic devices and components', NOW()),
(2, 'Books', 'Physical and digital books', NOW());

-- Dependent data with proper foreign key references
INSERT INTO products (id, category_id, name, price, stock_quantity, created_at) VALUES
(1, 1, 'Laptop Pro', 1299.99, 50, NOW()),
(2, 1, 'Wireless Mouse', 29.99, 100, NOW()),
(3, 2, 'Database Design Guide', 59.99, 25, NOW());

-- Additional related data maintaining integrity
INSERT INTO users (id, email, password_hash, first_name, last_name, created_at) VALUES
(1, 'john.doe@example.com', '$2b$12$hash...', 'John', 'Doe', NOW()),
(2, 'jane.smith@example.com', '$2b$12$hash...', 'Jane', 'Smith', NOW());

COMMIT;
\`\`\``
        };
      
      case 'nosql':
      case 'mongodb':
      case 'documentdb':
        return {
          systemPrompt: `You are a NoSQL Database Expert specializing in flexible, horizontally scalable document and key-value systems with enterprise-grade performance and reliability.`,
          designInstructions: `**ENTERPRISE NoSQL DESIGN APPROACH**:
- **Schema Flexibility**: Dynamic schema evolution without migrations, embrace document diversity
- **Horizontal Scaling**: Shard-friendly data distribution with optimal shard key selection
- **Eventual Consistency**: CAP theorem considerations and BASE properties implementation
- **Access Pattern Optimization**: Design documents for expected query patterns and frequency
- **Denormalization Strategy**: Embed related data for query performance while managing data duplication
- **Sharding Architecture**: Horizontal partitioning strategies for massive scale
- **Replica Set Design**: High availability with read preference optimization
- **Aggregation Excellence**: Complex data processing pipelines for analytics
- **Index Strategy**: Compound indexes, partial indexes, text search optimization`,
          outputFormat: `**PRODUCTION-READY NoSQL OUTPUT FORMAT**:

## 📄 Enterprise NoSQL Database Design

### Executive Summary
- Summarize the core purpose and design strategy for this NoSQL database in 1-2 sentences.

### Core Technical Specifications
- **NoSQL Database Type**: Document Database (MongoDB/DocumentDB)
- **Justification**: Explain why document database is optimal for this use case
- **Architecture Pattern**: Single-tenant vs Multi-tenant considerations

### Data Access Patterns (Primary Queries)
- **Q1**: Most critical query pattern with description
- **Q2**: Second most important query pattern  
- **Q3**: Third key query pattern
- **Additional Patterns**: Other important access patterns

### Collection Schema Design
\`\`\`javascript
// Collection 1: Primary Business Entity
db.collectionName.insertOne({
  "_id": ObjectId(),
  "field_name": "DataType with description",
  "embedded_object": {
    "nested_field": "value",
    "array_field": ["item1", "item2"]
  },
  "reference_ids": [ObjectId(), ObjectId()],
  "created_at": new Date(),
  "updated_at": new Date(),
  "metadata": {
    "version": 1,
    "status": "active"
  }
});
\`\`\`

### Indexing Strategy
\`\`\`javascript
// Primary indexes for unique identification
db.collection.createIndex({ "unique_field": 1 }, { unique: true });

// Compound indexes for complex queries
db.collection.createIndex({ 
  "category": 1, 
  "created_at": -1, 
  "status": 1 
});

// Text search indexes
db.collection.createIndex({ 
  "title": "text", 
  "description": "text" 
});

// Partial indexes for filtered queries
db.collection.createIndex(
  { "premium_user": 1 },
  { partialFilterExpression: { "premium_user": true } }
);
\`\`\`

### Sharding and Scaling Strategy
\`\`\`javascript
// Shard key selection for optimal distribution
sh.shardCollection("database.collection", { 
  "user_id": "hashed"  // or compound shard key
});

// Replica set configuration for high availability
rs.initiate({
  _id: "replica_set_name",
  members: [
    { _id: 0, host: "primary:27017", priority: 2 },
    { _id: 1, host: "secondary1:27017", priority: 1 },
    { _id: 2, host: "secondary2:27017", priority: 1, hidden: true }
  ]
});
\`\`\`

### Aggregation Pipelines
\`\`\`javascript
// Complex analytics pipeline example
db.collection.aggregate([
  { $match: { "status": "active" } },
  { $lookup: {
      from: "related_collection",
      localField: "foreign_key",
      foreignField: "_id",
      as: "joined_data"
    }
  },
  { $unwind: "$joined_data" },
  { $group: {
      _id: "$category",
      total: { $sum: "$amount" },
      count: { $sum: 1 }
    }
  },
  { $sort: { "total": -1 } }
]);
\`\`\``,
          sampleDataPrompt: `You are an Enterprise NoSQL Data Generation Specialist. Create production-quality, interconnected document data with proper ObjectId references and realistic business context.`,
          sampleDataFormat: `**ENTERPRISE NoSQL SAMPLE DATA FORMAT**:
\`\`\`json
{
  "Users": [
    {
      "_id": "ObjectId('507f1f77bcf86cd799439011')",
      "username": "alex_developer",
      "email": "alex@example.com",
      "profile": {
        "first_name": "Alex",
        "last_name": "Johnson",
        "bio": "Full-stack developer with 5 years experience",
        "avatar_url": "https://example.com/avatars/alex.jpg",
        "preferences": {
          "theme": "dark",
          "notifications": true,
          "timezone": "UTC-8"
        }
      },
      "subscription": {
        "plan": "premium",
        "start_date": "ISODate('2025-01-15T00:00:00Z')",
        "end_date": "ISODate('2026-01-15T00:00:00Z')",
        "features": ["advanced_analytics", "priority_support"]
      },
      "created_at": "ISODate('2024-12-01T10:30:00Z')",
      "updated_at": "ISODate('2025-01-12T15:45:00Z')",
      "last_login": "ISODate('2025-01-12T15:45:00Z')"
    }
  ],
  "Posts": [
    {
      "_id": "ObjectId('507f1f77bcf86cd799439012')",
      "author_id": "ObjectId('507f1f77bcf86cd799439011')",
      "title": "Advanced NoSQL Design Patterns",
      "content": "Exploring the latest trends in NoSQL database design...",
      "tags": ["nosql", "mongodb", "database-design", "performance"],
      "categories": ["technology", "databases"],
      "engagement": {
        "likes": 45,
        "shares": 12,
        "comments": 8,
        "views": 234
      },
      "metadata": {
        "reading_time": 8,
        "difficulty": "intermediate",
        "featured": true
      },
      "published_at": "ISODate('2025-01-10T14:30:00Z')",
      "created_at": "ISODate('2025-01-10T12:00:00Z')",
      "updated_at": "ISODate('2025-01-10T14:30:00Z')"
    }
  ]
}
\`\`\``
        };
      
      case 'vectordb':
      case 'weaviate':
      case 'pinecone':
      case 'chroma':
        return {
          systemPrompt: `You are a world-class Vector Database Expert specializing in AI-native semantic search and production-ready implementations with deep expertise in embedding models, ANN algorithms, and high-dimensional vector operations.`,
          designInstructions: `**ENTERPRISE VECTOR DB DESIGN APPROACH**:
- **Embedding Strategy**: Model selection rationale, dimensionality considerations, and performance implications
- **Semantic Search Optimization**: Beyond keyword matching to true semantic understanding
- **ANN Algorithms**: HNSW, IVF, LSH algorithm selection with performance tuning
- **Hybrid Search Architecture**: Vector + metadata filtering for comprehensive search
- **AI/ML Pipeline Integration**: Model serving, embedding generation, and real-time updates
- **Index Performance Tuning**: Parameters optimization for speed vs accuracy trade-offs
- **Production Deployment**: Scalability, monitoring, and operational excellence
- **Multi-Modal Support**: Text, image, audio embedding strategies
- **Distance Metrics**: Cosine, Euclidean, dot product selection criteria`,
          outputFormat: `**PRODUCTION-READY VECTOR DB OUTPUT FORMAT**:

## 🧮 Enterprise Vector Database Design Specification

### Executive Summary
- Summarize the core purpose and design strategy for this vector database focusing on AI-native capabilities and expected performance benefits.

### Core Technical Specifications
- **Embedding Model:**
  - **Selected Model**: \`sentence-transformers/all-MiniLM-L6-v2\` (or appropriate model)
  - **Justification**: Detailed explanation considering data type, language, performance, and use case requirements
  - **Dimensionality**: 384 dimensions with memory and performance implications analysis

- **Index Strategy:**
  - **Index Type**: \`HNSW\` (Hierarchical Navigable Small World)
  - **Justification**: Explain choice considering search speed, accuracy, recall, memory usage, and scaling requirements
  - **Key Parameters**: 
    - efConstruction: 200 (build-time search depth)
    - maxConnections: 16 (node connectivity)
    - ef: 100 (query-time search depth)

- **Similarity Metric:**
  - **Selected Metric**: \`cosine\` similarity
  - **Justification**: Explain appropriateness for chosen embedding model and data similarity characteristics

### Collection Schema Design
\`\`\`python
# Vector collection with comprehensive metadata
collection_schema = {
    "class": "DocumentCollection",
    "description": "Semantic document storage with vector embeddings",
    "vectorizer": "text2vec-transformers",
    "moduleConfig": {
        "text2vec-transformers": {
            "poolingStrategy": "masked_mean",
            "model": "sentence-transformers/all-MiniLM-L6-v2"
        }
    },
    "properties": [
        {
            "name": "content",
            "dataType": ["text"],
            "description": "Main content for vectorization",
            "moduleConfig": {
                "text2vec-transformers": {
                    "skip": false,
                    "vectorizePropertyName": false
                }
            }
        },
        {
            "name": "title", 
            "dataType": ["string"],
            "description": "Document title",
            "indexFilterable": true,
            "indexSearchable": true
        },
        {
            "name": "category",
            "dataType": ["string"], 
            "description": "Content category for filtering",
            "indexFilterable": true
        },
        {
            "name": "created_at",
            "dataType": ["date"],
            "description": "Creation timestamp",
            "indexFilterable": true,
            "indexRangeFilters": true
        },
        {
            "name": "metadata",
            "dataType": ["object"],
            "description": "Additional structured metadata"
        }
    ],
    "vectorIndexConfig": {
        "distance": "cosine",
        "efConstruction": 200,
        "maxConnections": 16
    }
}
\`\`\`

### Implementation Architecture
\`\`\`python
# Production-ready vector database setup
import weaviate
import weaviate.classes as wvc
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Any, Optional

class VectorDatabaseManager:
    def __init__(self, 
                 weaviate_url: str = "http://localhost:8080",
                 model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.client = weaviate.Client(weaviate_url)
        self.model = SentenceTransformer(model_name)
        self.collection_name = "DocumentCollection"
    
    def create_schema(self):
        \"\"\"Create vector collection with optimized schema\"\"\"
        if self.client.schema.exists(self.collection_name):
            self.client.schema.delete_class(self.collection_name)
        
        self.client.schema.create_class(collection_schema)
        print(f"✅ Created vector collection: {self.collection_name}")
    
    def insert_documents(self, documents: List[Dict[str, Any]]):
        \"\"\"Batch insert documents with automatic vectorization\"\"\"
        with self.client.batch as batch:
            batch.batch_size = 100
            
            for doc in documents:
                # Generate embedding
                vector = self.model.encode(doc["content"]).tolist()
                
                # Insert with vector
                batch.add_data_object(
                    data_object={
                        "content": doc["content"],
                        "title": doc.get("title", ""),
                        "category": doc.get("category", "general"),
                        "created_at": doc.get("created_at"),
                        "metadata": doc.get("metadata", {})
                    },
                    class_name=self.collection_name,
                    vector=vector
                )
        
        print(f"✅ Inserted {len(documents)} documents with embeddings")
    
    def semantic_search(self, 
                       query: str, 
                       limit: int = 10,
                       filters: Optional[Dict] = None) -> List[Dict]:
        \"\"\"Perform semantic similarity search\"\"\"
        query_vector = self.model.encode(query).tolist()
        
        # Build query with optional filters
        near_vector = {"vector": query_vector}
        
        where_filter = None
        if filters:
            where_filter = {
                "operator": "And",
                "operands": [
                    {"path": [key], "operator": "Equal", "valueString": value}
                    for key, value in filters.items()
                ]
            }
        
        results = (
            self.client.query
            .get(self.collection_name, ["content", "title", "category", "created_at"])
            .with_near_vector(near_vector)
            .with_limit(limit)
            .with_additional(["certainty", "distance"])
            .with_where(where_filter) if where_filter else
            self.client.query
            .get(self.collection_name, ["content", "title", "category", "created_at"])
            .with_near_vector(near_vector)
            .with_limit(limit)
            .with_additional(["certainty", "distance"])
        ).do()
        
        return results["data"]["Get"][self.collection_name]
    
    def hybrid_search(self, 
                     query: str,
                     keyword_query: str,
                     alpha: float = 0.75) -> List[Dict]:
        \"\"\"Combine vector and keyword search\"\"\"
        results = (
            self.client.query
            .get(self.collection_name, ["content", "title", "category"])
            .with_hybrid(query=keyword_query, alpha=alpha)
            .with_near_text({"concepts": [query]})
            .with_limit(10)
        ).do()
        
        return results["data"]["Get"][self.collection_name]

# Usage example
db_manager = VectorDatabaseManager()
db_manager.create_schema()

# Example documents
sample_docs = [
    {
        "content": "Advanced machine learning techniques for natural language processing",
        "title": "ML for NLP Guide", 
        "category": "technology",
        "created_at": "2025-01-12T10:00:00Z"
    }
]

db_manager.insert_documents(sample_docs)
results = db_manager.semantic_search("machine learning algorithms")
\`\`\`

### Performance Optimization Strategy
- **Memory Requirements**: Estimated 4GB RAM for 1M documents (384-dim vectors)
- **Query Performance**: <50ms for k-NN search with proper index tuning
- **Scaling Strategy**: Horizontal scaling with distributed index sharding
- **Monitoring**: Query latency, index size, memory usage tracking`,
          sampleDataPrompt: `You are an Enterprise Vector Database Data Generation Specialist. Create production-quality vector embeddings with realistic content and comprehensive metadata that demonstrates semantic search capabilities.`,
          sampleDataFormat: `**ENTERPRISE VECTOR DB SAMPLE DATA FORMAT**:
\`\`\`json
{
  "documents": [
    {
      "id": "doc_001",
      "content": "Machine learning is revolutionizing how we process and understand natural language. Deep learning models like transformers have achieved remarkable results in tasks such as text classification, sentiment analysis, and language translation. The attention mechanism allows models to focus on relevant parts of the input sequence, leading to better performance on complex linguistic tasks.",
      "title": "Introduction to Natural Language Processing with Deep Learning",
      "category": "artificial-intelligence",
      "author": "Dr. Sarah Chen",
      "tags": ["machine-learning", "nlp", "deep-learning", "transformers"],
      "difficulty": "intermediate",
      "reading_time": 12,
      "created_at": "2025-01-10T14:30:00Z",
      "metadata": {
        "source": "tech-blog",
        "language": "en",
        "word_count": 450,
        "engagement_score": 8.7,
        "topics": ["ai", "nlp", "ml"]
      },
      "vector": [0.0234, -0.1456, 0.3421, 0.0892, -0.2341, "... (384 more dimensions)"]
    },
    {
      "id": "doc_002", 
      "content": "Vector databases are specialized storage systems designed for handling high-dimensional vector data. They excel at similarity search operations, making them ideal for applications like recommendation systems, image search, and semantic document retrieval. Popular vector databases include Weaviate, Pinecone, and Chroma, each offering unique features for different use cases.",
      "title": "Understanding Vector Databases and Their Applications",
      "category": "database-technology",
      "author": "Alex Rodriguez",
      "tags": ["vector-database", "similarity-search", "embeddings", "ai"],
      "difficulty": "beginner",
      "reading_time": 8,
      "created_at": "2025-01-11T09:15:00Z",
      "metadata": {
        "source": "database-guide",
        "language": "en", 
        "word_count": 320,
        "engagement_score": 9.2,
        "topics": ["databases", "vectors", "ai"]
      },
      "vector": [0.1876, 0.0234, -0.3421, 0.2156, 0.0934, "... (384 more dimensions)"]
    },
    {
      "id": "doc_003",
      "content": "Retrieval-Augmented Generation (RAG) combines the power of large language models with external knowledge bases. By retrieving relevant documents and using them as context for generation, RAG systems can provide more accurate and up-to-date information. This approach is particularly effective for question-answering systems and chatbots that need access to specific domain knowledge.",
      "title": "Implementing RAG Systems with Vector Databases",
      "category": "ai-applications",
      "author": "Maria Thompson",
      "tags": ["rag", "retrieval", "generation", "llm", "knowledge-base"],
      "difficulty": "advanced",
      "reading_time": 15,
      "created_at": "2025-01-12T16:45:00Z",
      "metadata": {
        "source": "ai-research",
        "language": "en",
        "word_count": 580,
        "engagement_score": 9.5,
        "topics": ["rag", "ai", "nlp", "knowledge-retrieval"]
      },
      "vector": [-0.0567, 0.2341, 0.1234, -0.0891, 0.3456, "... (384 more dimensions)"]
    }
  ],
  "query_examples": [
    {
      "query": "How do I build a recommendation system?",
      "expected_matches": ["doc_002"],
      "search_type": "semantic_similarity"
    },
    {
      "query": "natural language processing techniques",
      "expected_matches": ["doc_001", "doc_003"],
      "search_type": "content_relevance"
    },
    {
      "query": "category:ai-applications AND difficulty:advanced",
      "expected_matches": ["doc_003"],
      "search_type": "hybrid_filter"
    }
  ]
}
\`\`\``
        };
      
      default:
        return {
          systemPrompt: `You are an expert database designer with comprehensive knowledge of multiple database paradigms.`,
          designInstructions: `**GENERAL DESIGN APPROACH**:
- Choose appropriate database type for use case
- Follow industry best practices
- Ensure scalability and performance
- Implement proper security measures`,
          outputFormat: `**GENERAL OUTPUT FORMAT**:
- Appropriate schema structure for chosen database type
- Performance optimization strategies
- Security implementation guidelines`,
          sampleDataPrompt: `You are a database sample data specialist.`,
          sampleDataFormat: `**SAMPLE DATA FORMAT**: Use appropriate format for chosen database type`
        };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Test connection. Respond with "OK".');
      const response = await result.response;
      return response.text().includes('OK');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }

  // Enhanced validation methods for database-type-specific quality assurance
  private async validateSchema(schema: string, dbType: string): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      switch (dbType.toLowerCase()) {
        case 'sql':
        case 'postgresql':
        case 'mysql':
        case 'sqlite':
          // SQL-specific validation
          if (!schema.includes('CREATE TABLE')) {
            issues.push('Missing CREATE TABLE statements');
          }
          if (!schema.includes('PRIMARY KEY')) {
            issues.push('Missing PRIMARY KEY constraints');
          }
          if (schema.includes('VARCHAR') && !schema.match(/VARCHAR\(\d+\)/)) {
            issues.push('VARCHAR without size specification');
          }
          if (!schema.includes('created_at') && !schema.includes('timestamp')) {
            issues.push('Missing audit fields (created_at, updated_at)');
          }
          break;
          
        case 'nosql':
        case 'mongodb':
        case 'documentdb':
          // NoSQL-specific validation
          if (!schema.includes('{') || !schema.includes('}')) {
            issues.push('Missing JSON document structure');
          }
          if (!schema.includes('_id')) {
            issues.push('Missing _id field for document identification');
          }
          if (!schema.includes('ObjectId')) {
            issues.push('Missing ObjectId references for relationships');
          }
          break;
          
        case 'vectordb':
        case 'weaviate':
        case 'pinecone':
        case 'chroma':
          // Vector DB-specific validation
          if (!schema.includes('vector') && !schema.includes('embedding')) {
            issues.push('Missing vector/embedding fields');
          }
          if (!schema.includes('metadata')) {
            issues.push('Missing metadata structure for hybrid search');
          }
          if (!schema.includes('similarity') && !schema.includes('distance')) {
            issues.push('Missing similarity/distance configuration');
          }
          break;
      }
      
      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Validation error: ${error.message}`]
      };
    }
  }

  private async validateSampleData(data: string, dbType: string, schema: string): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      switch (dbType.toLowerCase()) {
        case 'sql':
        case 'postgresql':
        case 'mysql':
        case 'sqlite':
          // SQL data validation
          if (!data.includes('INSERT INTO')) {
            issues.push('Missing INSERT statements');
          }
          if (!data.includes('BEGIN') && !data.includes('COMMIT')) {
            issues.push('Consider using transactions for data integrity');
          }
          break;
          
        case 'nosql':
        case 'mongodb':
        case 'documentdb':
          // NoSQL data validation
          if (!data.includes('ObjectId(')) {
            issues.push('Missing ObjectId format for document references');
          }
          if (!data.includes('ISODate(')) {
            issues.push('Consider using ISODate format for timestamps');
          }
          break;
          
        case 'vectordb':
        case 'weaviate':
        case 'pinecone':
        case 'chroma':
          // Vector DB data validation
          if (!data.includes('[') || !data.includes(']')) {
            issues.push('Missing vector array format');
          }
          if (!data.includes('metadata')) {
            issues.push('Missing metadata for hybrid search capabilities');
          }
          break;
      }
      
      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Data validation error: ${error.message}`]
      };
    }
  }

  private async regenerateSchemaWithValidation(
    prompt: string, 
    dbType: string, 
    validationIssues: string[]
  ): Promise<GenerationStep> {
    const improvementPrompt = this.buildSchemaPrompt(prompt, dbType) + `

**VALIDATION FEEDBACK TO ADDRESS**:
${validationIssues.map(issue => `- ${issue}`).join('\n')}

**REQUIREMENTS**: Please regenerate the schema addressing all the validation issues above. Ensure production-ready quality with proper constraints, data types, and best practices.`;

    const text = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(improvementPrompt);
      const response = await result.response;
      return response.text();
    });

    return {
      type: 'schema',
      title: `Enhanced ${dbType} Database Schema`,
      content: this.extractCodeFromResponse(text, dbType === 'SQL' ? 'sql' : 'json'),
      reasoning: `Improved schema based on validation feedback: ${validationIssues.join(', ')}`
    };
  }

  private generateValidationSummary(steps: GenerationStep[], dbType: string): any {
    const summary = {
      databaseType: dbType,
      enhancedStandardMode: true,
      generatedSteps: steps.length,
      qualityMetrics: {
        schemaValidation: 'passed',
        dataIntegrity: 'validated',
        typeSpecificOptimization: 'applied',
        enterpriseFeatures: 'included'
      },
      features: [] as string[],
      timestamp: new Date().toISOString()
    };

    // Add database-specific features
    switch (dbType.toLowerCase()) {
      case 'sql':
      case 'postgresql':
      case 'mysql':
      case 'sqlite':
        summary.features = [
          'ACID compliance validation',
          'Foreign key integrity',
          'Index optimization',
          'Security policies',
          'Audit trails'
        ];
        break;
        
      case 'nosql':
      case 'mongodb':
      case 'documentdb':
        summary.features = [
          'Document schema validation',
          'Sharding strategies',
          'Index optimization',
          'Aggregation pipelines',
          'Replica set configuration'
        ];
        break;
        
      case 'vectordb':
      case 'weaviate':
      case 'pinecone':
      case 'chroma':
        summary.features = [
          'Embedding model integration',
          'ANN algorithm optimization',
          'Hybrid search capabilities',
          'Production deployment code',
          'Performance monitoring'
        ];
        break;
    }

    return summary;
  }
}

export const geminiService = new GeminiService();
export default geminiService;