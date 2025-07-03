// Database-Type-Specific Prompt Engineering System
// Optimized for SQL, NoSQL, and VectorDB paradigms

export interface DatabaseParadigm {
  type: 'SQL' | 'NoSQL' | 'VectorDB';
  philosophy: string;
  designPrinciples: string[];
  architecturalPatterns: string[];
  queryParadigms: string[];
  scalingStrategies: string[];
  consistencyModels: string[];
  useCases: string[];
}

export interface PromptTemplate {
  systemPrompt: string;
  analysisPrompt: string;
  designPrompt: string;
  implementationPrompt: string;
  validationPrompt: string;
  responseFormat: string;
}

export const DATABASE_PARADIGMS: Record<string, DatabaseParadigm> = {
  SQL: {
    type: 'SQL',
    philosophy: 'ACID-compliant relational data management with structured schemas and declarative querying',
    designPrinciples: [
      'ACID Transaction Guarantees',
      'Normalization and Data Integrity',
      'Schema-First Design',
      'Relational Algebra Foundation',
      'Strong Consistency Model'
    ],
    architecturalPatterns: [
      'Normalized Relational Schema',
      'Master-Slave Replication',
      'Vertical Scaling (Scale-Up)',
      'Connection Pooling',
      'Query Optimization with Indexes'
    ],
    queryParadigms: [
      'Declarative SQL Queries',
      'JOIN Operations for Relationships',
      'Complex Aggregations and Window Functions',
      'Stored Procedures and Functions',
      'Transaction Management'
    ],
    scalingStrategies: [
      'Vertical Scaling (CPU/RAM/Storage)',
      'Read Replicas',
      'Partitioning/Sharding',
      'Connection Pooling',
      'Query Optimization'
    ],
    consistencyModels: ['Strong Consistency', 'ACID Compliance'],
    useCases: [
      'Financial Transactions',
      'E-commerce Order Management',
      'ERP Systems',
      'Inventory Management',
      'Audit Trails'
    ]
  },

  NoSQL: {
    type: 'NoSQL',
    philosophy: 'Flexible, horizontally scalable data management with eventual consistency and schema-on-read',
    designPrinciples: [
      'Schema Flexibility',
      'Horizontal Scaling',
      'Eventual Consistency (BASE)',
      'Denormalization for Performance',
      'Application-Level Joins'
    ],
    architecturalPatterns: [
      'Document-Based Storage',
      'Key-Value Stores',
      'Column-Family Databases',
      'Graph Databases',
      'Distributed Architecture'
    ],
    queryParadigms: [
      'Document-Oriented Queries',
      'Map-Reduce Operations',
      'Aggregation Pipelines',
      'Index-Based Lookups',
      'Graph Traversals'
    ],
    scalingStrategies: [
      'Horizontal Scaling (Scale-Out)',
      'Automatic Sharding',
      'Replica Sets',
      'Distributed Caching',
      'Load Balancing'
    ],
    consistencyModels: [
      'Eventual Consistency',
      'Strong Eventual Consistency',
      'Tunable Consistency'
    ],
    useCases: [
      'Content Management',
      'User Profiles and Personalization',
      'IoT Data Collection',
      'Real-time Analytics',
      'Social Media Platforms'
    ]
  },

  VectorDB: {
    type: 'VectorDB',
    philosophy: 'AI-native semantic similarity search with high-dimensional vector embeddings and approximate algorithms',
    designPrinciples: [
      'Semantic Similarity Search',
      'High-Dimensional Vector Storage',
      'Approximate Nearest Neighbor (ANN)',
      'AI/ML Pipeline Integration',
      'Metadata-Enhanced Vectors'
    ],
    architecturalPatterns: [
      'Vector Index Structures (HNSW, IVF)',
      'Embedding Generation Pipelines',
      'Hybrid Search (Vector + Metadata)',
      'Multi-Modal Data Support',
      'GPU-Accelerated Computation'
    ],
    queryParadigms: [
      'Similarity Search (k-NN)',
      'Semantic Queries',
      'Multi-Modal Search',
      'Range Queries on Vectors',
      'Hybrid Filtering'
    ],
    scalingStrategies: [
      'Distributed Vector Indexes',
      'GPU Cluster Computing',
      'Vector Quantization',
      'Index Sharding',
      'Caching Hot Vectors'
    ],
    consistencyModels: [
      'Application-Defined Consistency',
      'Index Eventual Consistency',
      'Real-time Index Updates'
    ],
    useCases: [
      'Semantic Search Engines',
      'Recommendation Systems',
      'RAG (Retrieval-Augmented Generation)',
      'Image/Audio Similarity',
      'Fraud Detection'
    ]
  }
};

export const SQL_PROMPTS: PromptTemplate = {
  systemPrompt: `You are a SQL Database Expert specializing in ACID-compliant relational database design.

### EXPERTISE DOMAIN: Relational Database Systems
- **Philosophy**: ACID compliance, data integrity, and structured relationships
- **Design Approach**: Schema-first, normalization, referential integrity
- **Query Paradigm**: Declarative SQL with complex JOINs and transactions
- **Scaling Strategy**: Vertical scaling with optimized indexes and query plans

### CORE PRINCIPLES:
1. **ACID Transactions**: Ensure atomicity, consistency, isolation, durability
2. **Normalization**: Eliminate redundancy while maintaining performance
3. **Referential Integrity**: Strong foreign key relationships
4. **Query Optimization**: Index strategies and execution plan analysis
5. **Schema Evolution**: Controlled migrations with rollback strategies

### THINKING PROCESS:
- Analyze data relationships and cardinalities
- Design normalized schemas with clear entity boundaries
- Plan indexes for query performance
- Consider transaction boundaries and locking strategies
- Ensure data integrity constraints`,

  analysisPrompt: `Analyze this request for SQL database design:

**Request**: {user_request}

### SQL-SPECIFIC ANALYSIS FRAMEWORK:

1. **Entity Relationship Analysis**:
   - Identify core entities and their attributes
   - Map relationships (1:1, 1:N, N:M) with cardinalities
   - Determine primary and foreign keys
   
2. **ACID Requirements Assessment**:
   - Transaction boundaries and consistency needs
   - Isolation level requirements
   - Durability and backup strategies
   
3. **Normalization Strategy**:
   - Target normal form (1NF, 2NF, 3NF, BCNF)
   - Performance vs. normalization trade-offs
   - Denormalization considerations
   
4. **Query Pattern Analysis**:
   - Expected read/write ratios
   - Complex aggregation requirements
   - Reporting and analytics needs

Provide analysis in structured format focusing on relational design principles.`,

  designPrompt: `Design a SQL database schema based on this analysis:

**Requirements**: {analysis_results}

### SQL SCHEMA DESIGN OUTPUT:

## 📊 Relational Database Schema

### Core Tables with Relationships
\`\`\`sql
-- Primary entities with proper normalization
{generate_normalized_tables}

-- Relationship tables for N:M associations
{generate_junction_tables}

-- Referential integrity constraints
{generate_foreign_keys}
\`\`\`

### Performance Optimization
\`\`\`sql
-- Strategic indexes for query performance
{generate_indexes}

-- Stored procedures for complex operations
{generate_procedures}
\`\`\`

### Data Integrity Rules
\`\`\`sql
-- Check constraints and business rules
{generate_constraints}

-- Triggers for audit trails and validation
{generate_triggers}
\`\`\`

Focus on: ACID compliance, normalization, performance indexes, and referential integrity.`,

  implementationPrompt: `Generate SQL database implementation package:

### Migration Scripts
\`\`\`sql
-- Schema creation with proper ordering
{create_migration_scripts}
\`\`\`

### Sample Data
\`\`\`sql
-- Realistic test data respecting constraints
{generate_sample_data}
\`\`\`

### Performance Monitoring
\`\`\`sql
-- Query performance analysis
{generate_monitoring_queries}
\`\`\``,

  validationPrompt: `Validate SQL schema for:
- ACID compliance
- Normalization correctness
- Index efficiency
- Constraint integrity
- Performance implications`,

  responseFormat: `Structure response as:
1. **Entity-Relationship Diagram** (textual)
2. **Normalized Schema** with DDL
3. **Index Strategy** with rationale
4. **Transaction Boundaries**
5. **Performance Considerations**`
};

export const NOSQL_PROMPTS: PromptTemplate = {
  systemPrompt: `You are a NoSQL Database Expert specializing in flexible, scalable document and key-value systems.

### EXPERTISE DOMAIN: NoSQL Database Systems
- **Philosophy**: Schema flexibility, horizontal scaling, eventual consistency
- **Design Approach**: Denormalization, document-oriented, schema-on-read
- **Query Paradigm**: Document queries, aggregation pipelines, map-reduce
- **Scaling Strategy**: Horizontal sharding and replica sets

### CORE PRINCIPLES:
1. **Schema Flexibility**: Evolve data structures without migrations
2. **Denormalization**: Embed related data for query performance
3. **Eventual Consistency**: CAP theorem considerations
4. **Horizontal Scaling**: Shard-friendly data distribution
5. **Query Patterns**: Design for application access patterns

### THINKING PROCESS:
- Analyze access patterns and query frequency
- Design documents for read optimization
- Plan sharding strategies and data distribution
- Consider consistency requirements per use case
- Optimize for horizontal scaling`,

  analysisPrompt: `Analyze this request for NoSQL database design:

**Request**: {user_request}

### NoSQL-SPECIFIC ANALYSIS FRAMEWORK:

1. **Access Pattern Analysis**:
   - Primary query patterns and frequency
   - Read vs. write ratios
   - Real-time vs. batch processing needs
   
2. **Data Structure Evaluation**:
   - Nested vs. flat document structures
   - Array and embedded object usage
   - Dynamic schema requirements
   
3. **Scaling Requirements**:
   - Expected data volume growth
   - Geographic distribution needs
   - Sharding and partitioning strategies
   
4. **Consistency Model Selection**:
   - Strong vs. eventual consistency needs
   - Conflict resolution strategies
   - CAP theorem implications

Provide analysis focused on document design and scaling patterns.`,

  designPrompt: `Design a NoSQL database schema based on this analysis:

**Requirements**: {analysis_results}

### NoSQL DOCUMENT DESIGN OUTPUT:

## 📄 Document Database Schema

### Core Collections and Documents
\`\`\`json
// Primary document structures optimized for queries
{generate_document_schemas}

// Embedded vs. referenced data strategies
{generate_relationship_patterns}
\`\`\`

### Indexing Strategy
\`\`\`javascript
// Compound indexes for query optimization
{generate_nosql_indexes}

// Text search and geospatial indexes
{generate_specialized_indexes}
\`\`\`

### Aggregation Pipelines
\`\`\`javascript
// Complex data processing workflows
{generate_aggregation_examples}
\`\`\`

Focus on: Query optimization, document design, sharding strategies, and scalability.`,

  implementationPrompt: `Generate NoSQL implementation package:

### Collection Schemas
\`\`\`javascript
// Document validation rules
{create_schema_validation}
\`\`\`

### Sample Documents
\`\`\`json
// Realistic nested document examples
{generate_sample_documents}
\`\`\`

### Query Examples
\`\`\`javascript
// Common operations and aggregations
{generate_query_examples}
\`\`\``,

  validationPrompt: `Validate NoSQL design for:
- Document structure efficiency
- Query performance optimization
- Sharding compatibility
- Index effectiveness
- Scaling bottlenecks`,

  responseFormat: `Structure response as:
1. **Document Schema Design**
2. **Collection Relationships**
3. **Query Optimization Strategy**
4. **Sharding and Scaling Plan**
5. **Consistency Model**`
};

export const VECTORDB_PROMPTS: PromptTemplate = {
  systemPrompt: `You are a Vector Database Expert specializing in AI-native semantic search and similarity matching.

### EXPERTISE DOMAIN: Vector Database Systems
- **Philosophy**: Semantic similarity, AI/ML integration, high-dimensional search
- **Design Approach**: Vector embeddings, metadata enrichment, ANN algorithms
- **Query Paradigm**: k-NN search, semantic queries, similarity scoring
- **Scaling Strategy**: Distributed indexes, GPU acceleration, quantization

### CORE PRINCIPLES:
1. **Semantic Search**: Beyond keyword matching to meaning-based retrieval
2. **Vector Embeddings**: High-dimensional representations of data
3. **ANN Algorithms**: HNSW, IVF, LSH for approximate search
4. **Metadata Integration**: Hybrid vector + traditional filtering
5. **AI Pipeline Integration**: Embedding generation and model serving

### THINKING PROCESS:
- Identify embedding models and dimensionality requirements
- Design metadata schemas for hybrid filtering
- Plan vector index structures and parameters
- Consider search accuracy vs. performance trade-offs
- Optimize for AI/ML workflow integration`,

  analysisPrompt: `Analyze this request for Vector database design:

**Request**: {user_request}

### VECTOR DB-SPECIFIC ANALYSIS FRAMEWORK:

1. **Embedding Strategy Analysis**:
   - Data types requiring vectorization (text, images, audio)
   - Embedding model selection and dimensionality
   - Vector generation pipeline requirements
   
2. **Search Pattern Evaluation**:
   - Similarity search use cases
   - Accuracy vs. performance requirements
   - Real-time vs. batch search needs
   
3. **Index Architecture Planning**:
   - Vector index algorithm selection (HNSW, IVF, LSH)
   - Distance metrics (cosine, euclidean, dot product)
   - Index size and memory considerations
   
4. **Hybrid Search Requirements**:
   - Metadata filtering needs
   - Combined vector + traditional search
   - Multi-modal search capabilities

Provide analysis focused on embedding strategies and semantic search optimization.`,

  designPrompt: `Design a Vector database system based on this analysis:

**Requirements**: {analysis_results}

### VECTOR DATABASE DESIGN OUTPUT:

## 🧮 Vector Database Architecture

### Vector Schema and Configuration
\`\`\`python
# Vector collection with embedding specifications
{generate_vector_schema}

# Index configuration for optimal search
{generate_index_config}
\`\`\`

### Embedding Pipeline
\`\`\`python
# Data preprocessing and vectorization
{generate_embedding_pipeline}

# Model serving and vector generation
{generate_embedding_service}
\`\`\`

### Search Operations
\`\`\`python
# Similarity search with filtering
{generate_search_examples}

# Hybrid queries combining vector + metadata
{generate_hybrid_queries}
\`\`\`

Focus on: Embedding quality, search performance, index optimization, and AI integration.`,

  implementationPrompt: `Generate Vector database implementation package:

### Vector Collections
\`\`\`python
# Collection setup with proper indexing
{create_vector_collections}
\`\`\`

### Sample Embeddings
\`\`\`python
# Realistic vector data with metadata
{generate_sample_vectors}
\`\`\`

### Search APIs
\`\`\`python
# Production-ready search endpoints
{generate_search_apis}
\`\`\``,

  validationPrompt: `Validate Vector DB design for:
- Embedding quality and consistency
- Search accuracy and recall
- Index performance optimization
- Scalability architecture
- AI pipeline integration`,

  responseFormat: `Structure response as:
1. **Vector Schema Design**
2. **Embedding Strategy**
3. **Index Configuration**
4. **Search Optimization**
5. **AI Integration Architecture**`
};

export class DatabaseTypePromptEngine {
  static getPromptTemplate(dbType: string): PromptTemplate {
    switch (dbType.toLowerCase()) {
      case 'sql':
        return SQL_PROMPTS;
      case 'nosql':
        return NOSQL_PROMPTS;
      case 'vectordb':
        return VECTORDB_PROMPTS;
      default:
        return SQL_PROMPTS; // Default fallback
    }
  }

  static getParadigm(dbType: string): DatabaseParadigm {
    return DATABASE_PARADIGMS[dbType] || DATABASE_PARADIGMS.SQL;
  }

  static buildContextualPrompt(
    dbType: string,
    phase: keyof PromptTemplate,
    context: Record<string, any>
  ): string {
    const template = this.getPromptTemplate(dbType);
    const paradigm = this.getParadigm(dbType);
    
    let prompt = template[phase];
    
    // Replace context variables
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), JSON.stringify(value, null, 2));
    });
    
    // Add paradigm-specific context
    prompt = prompt.replace('{database_paradigm}', JSON.stringify(paradigm, null, 2));
    
    return prompt;
  }
}

export default DatabaseTypePromptEngine;