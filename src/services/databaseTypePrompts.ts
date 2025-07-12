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
  systemPrompt: `You are a world-class Vector Database Architect specializing in AI-native semantic search and production-ready implementations.

### CORE EXPERTISE:
- Vector embeddings and high-dimensional search optimization
- ANN algorithms: HNSW, IVF, LSH with performance tuning
- Hybrid vector + metadata filtering strategies
- AI/ML pipeline integration and model serving
- Production deployment and scaling considerations

### DESIGN APPROACH:
- Focus on embedding strategy, dimensionality, and model selection with clear justifications
- Optimize index structures for specific use case performance requirements
- Balance search accuracy vs. speed with quantified trade-offs
- Ensure production-ready implementation with comprehensive documentation
- Provide technical justifications for every architectural decision`,

  analysisPrompt: `Analyze this Vector database request with deep technical insight: {user_request}

### COMPREHENSIVE ANALYSIS FRAMEWORK:
1. **Embedding Strategy Analysis**: 
   - Data types for vectorization (text/image/audio/multimodal)
   - Model selection rationale (sentence-transformers, OpenAI, custom)
   - Dimensionality considerations and memory implications
   
2. **Search Pattern Evaluation**: 
   - Use case requirements (semantic search, QA, recommendation, RAG)
   - Accuracy vs. performance trade-offs with specific metrics
   - Expected query volume and latency requirements
   
3. **Index Architecture Design**: 
   - Algorithm selection (HNSW vs IVF vs LSH) with performance justifications
   - Distance metrics appropriateness (cosine, euclidean, dot product)
   - Key parameters impact (efConstruction, maxConnections, nprobe)
   
4. **Hybrid Search Requirements**: 
   - Metadata filtering complexity and performance impact
   - Multi-modal search capabilities needed
   - Integration with existing data infrastructure

Provide detailed technical analysis with quantified recommendations and clear justifications for each decision.`,

  designPrompt: `Based on the analysis: {user_request}

Create a comprehensive Vector Database design specification following this structured format:

## 🧮 Vector Database Design Specification

### 1. Executive Summary
- Summarize the core purpose and design strategy in 1-2 sentences that both technical and non-technical stakeholders can understand
- Highlight the key technical approach and expected benefits

### 2. Core Technical Specifications
- **Embedding Model:**
  - **Selected Model:** \`{specific model name with version}\`
  - **Justification:** {Detailed explanation considering data type, language, performance, and use case requirements}
  - **Dimensionality:** {dimension count with memory and performance implications}

- **Index Strategy:**
  - **Index Type:** \`{HNSW/IVF/LSH with specific variant}\`
  - **Justification:** {Explain choice considering search speed, accuracy, recall, memory usage, and scaling requirements}
  - **Key Parameters:** {efConstruction, maxConnections, etc. with performance impact analysis}

- **Similarity Metric:**
  - **Selected Metric:** \`{cosine/euclidean/dot product}\`
  - **Justification:** {Explain appropriateness for chosen embedding model and data similarity characteristics}

### 3. Schema Design
- **Collection Name:** \`{descriptive collection name}\`
- **Properties/Fields:**
  \`\`\`python
  # Vector schema with detailed field specifications
  {
    "field_name": {
      "dataType": "text/number/boolean",
      "description": "Detailed field purpose and usage",
      "vectorize": true/false,  # With reasoning for vectorization decision
      "index": true/false       # With indexing strategy rationale
    }
  }
  \`\`\`

### 4. Implementation Architecture
\`\`\`python
# Production-ready vector database setup
{generate_complete_implementation_with_error_handling}
\`\`\`

### 5. Performance Optimization Strategy
- Memory requirements and optimization techniques
- Query performance expectations and monitoring
- Scaling considerations and bottleneck prevention

Focus on production readiness, performance justifications, and comprehensive technical documentation.`,

  implementationPrompt: `Generate production-ready Vector database implementation for: {analysis_results}

Create a complete Python implementation with the following requirements:

\`\`\`python
# Prerequisites and Setup Instructions:
# 1. Vector database instance running (Docker/Cloud setup instructions)
# 2. Required libraries: pip install weaviate-client sentence-transformers
# 3. Environment variables for API keys and connection strings
# 4. Hardware requirements and optimization settings

import weaviate
import weaviate.classes as wvc
from sentence_transformers import SentenceTransformer
import json
import logging
from typing import List, Dict, Any, Optional

# Configuration and connection setup with error handling
{generate_robust_connection_setup}

# Schema creation with comprehensive field definitions
{generate_detailed_schema_with_validation}

# Data ingestion pipeline with batch processing
{generate_efficient_data_ingestion}

# Search operations with performance optimization
{generate_optimized_search_functions}

# Monitoring and maintenance utilities
{generate_monitoring_and_maintenance_tools}

# Example usage and testing
{generate_comprehensive_examples}
\`\`\`

Include comprehensive error handling, logging, performance monitoring, and production best practices.`,

  validationPrompt: `Perform comprehensive validation of the Vector DB design:

### Technical Validation Checklist:
- **Embedding Quality**: Model appropriateness for use case, dimensionality efficiency
- **Index Performance**: Algorithm selection optimization for query patterns
- **Schema Design**: Field structure efficiency, vectorization decisions
- **Production Readiness**: Error handling, monitoring, scaling capabilities
- **Performance Metrics**: Expected latency, throughput, accuracy benchmarks
- **Cost Optimization**: Resource utilization and operational efficiency

Provide specific recommendations for improvements and potential issues to address.`,

  responseFormat: `Structure response as:
1. **Executive Summary** (business-friendly overview)
2. **Technical Specifications** (detailed technical decisions with justifications)
3. **Schema Design** (comprehensive field definitions)
4. **Implementation Code** (production-ready with best practices)
5. **Performance Strategy** (optimization and monitoring approach)`
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
      const replacement = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      prompt = prompt.replace(new RegExp(placeholder, 'g'), replacement);
    });
    
    // Add paradigm-specific context
    prompt = prompt.replace('{database_paradigm}', JSON.stringify(paradigm, null, 2));
    
    return prompt;
  }
}

export default DatabaseTypePromptEngine;