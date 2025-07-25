// Enhanced DB Coach Service with Database-Type-Specific Intelligence
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EnhancedGenerationStep {
  type: 'analysis' | 'design' | 'implementation' | 'validation';
  title: string;
  content: string;
  reasoning: string;
  agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  confidence: number;
  databaseType: string;
  paradigmAlignment: number;
}

export interface DatabaseTypeContext {
  type: 'SQL' | 'NoSQL' | 'VectorDB';
  specificTechnology?: string;
  version?: string;
  constraints?: string[];
}

class EnhancedDBCoachService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 16384, // Increased for VectorDB implementations
      }
    });
  }

  async generateDatabaseDesign(
    prompt: string,
    dbTypeContext: DatabaseTypeContext
  ): Promise<EnhancedGenerationStep[]> {
    const steps: EnhancedGenerationStep[] = [];
    
    try {
      const analysisStep = await this.executeAnalysisPhase(prompt, dbTypeContext);
      steps.push(analysisStep);

      const designStep = await this.executeDesignPhase(prompt, dbTypeContext, analysisStep);
      steps.push(designStep);

      return steps;
    } catch (error) {
      console.error('Enhanced generation failed:', error);
      throw error;
    }
  }

  private async executeAnalysisPhase(
    prompt: string,
    dbTypeContext: DatabaseTypeContext
  ): Promise<EnhancedGenerationStep> {
    
    const analysisPrompt = this.buildAnalysisPrompt(prompt, dbTypeContext);
    
    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(analysisPrompt);
      return await result.response.text();
    });

    return {
      type: 'analysis',
      title: `${dbTypeContext.type} Requirements Analysis`,
      content: response,
      reasoning: `Database-type-specific analysis using ${dbTypeContext.type} paradigm principles`,
      agent: `${dbTypeContext.type} Requirements Analyst`,
      status: 'completed',
      confidence: 0.9,
      databaseType: dbTypeContext.type,
      paradigmAlignment: 0.9
    };
  }

  private async executeDesignPhase(
    prompt: string,
    dbTypeContext: DatabaseTypeContext,
    analysisStep: EnhancedGenerationStep
  ): Promise<EnhancedGenerationStep> {
    
    const designPrompt = this.buildDesignPrompt(dbTypeContext, analysisStep.content);

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(designPrompt);
      return await result.response.text();
    });

    return {
      type: 'design',
      title: `${dbTypeContext.type} Database Design`,
      content: response,
      reasoning: `Paradigm-aligned schema design using ${dbTypeContext.type} architectural patterns`,
      agent: `${dbTypeContext.type} Schema Architect`,
      status: 'completed',
      confidence: 0.92,
      databaseType: dbTypeContext.type,
      paradigmAlignment: 0.95
    };
  }

  private buildAnalysisPrompt(prompt: string, dbTypeContext: DatabaseTypeContext): string {
    switch (dbTypeContext.type) {
      case 'SQL':
        return `You are a SQL Database Expert specializing in ACID-compliant relational systems.

**EXPERTISE DOMAIN**: Relational Database Systems
- Philosophy: ACID compliance, data integrity, structured relationships
- Design Approach: Schema-first, normalization, referential integrity
- Query Paradigm: Declarative SQL with complex JOINs and transactions
- Scaling Strategy: Vertical scaling with optimized indexes

**CORE PRINCIPLES**:
1. ACID Transactions (Atomicity, Consistency, Isolation, Durability)
2. Normalization to eliminate redundancy
3. Referential integrity with foreign keys
4. Query optimization through strategic indexing
5. Schema evolution with controlled migrations

**Request**: ${prompt}

**Analysis Framework**:
1. **Entity Relationship Analysis**: Identify core entities, attributes, and relationships
2. **ACID Requirements**: Transaction boundaries and consistency needs
3. **Normalization Strategy**: Target normal form and trade-offs
4. **Query Pattern Analysis**: Read/write ratios and performance requirements

Provide comprehensive analysis focusing on relational design principles, entity relationships, and performance considerations.`;

      case 'NoSQL':
        return `You are a NoSQL Database Expert specializing in flexible, scalable document systems.

**EXPERTISE DOMAIN**: NoSQL Database Systems
- Philosophy: Schema flexibility, horizontal scaling, eventual consistency
- Design Approach: Denormalization, document-oriented, schema-on-read
- Query Paradigm: Document queries, aggregation pipelines, map-reduce
- Scaling Strategy: Horizontal sharding and replica sets

**CORE PRINCIPLES**:
1. Schema flexibility for evolving data structures
2. Denormalization for query performance
3. Eventual consistency (CAP theorem considerations)
4. Horizontal scaling through sharding
5. Query pattern optimization

**Request**: ${prompt}

**Analysis Framework**:
1. **Access Pattern Analysis**: Primary query patterns and frequency
2. **Data Structure Evaluation**: Document design and nesting strategies
3. **Scaling Requirements**: Growth and distribution needs
4. **Consistency Model**: Strong vs. eventual consistency requirements

Provide comprehensive analysis focusing on document design, access patterns, and scalability requirements.`;

      case 'VectorDB':
        return `You are a Vector Database Expert specializing in AI-native semantic search systems.

**EXPERTISE DOMAIN**: Vector Database Systems
- Philosophy: Semantic similarity, AI/ML integration, high-dimensional search
- Design Approach: Vector embeddings, metadata enrichment, ANN algorithms
- Query Paradigm: k-NN search, semantic queries, similarity scoring
- Scaling Strategy: Distributed indexes, GPU acceleration, quantization

**CORE PRINCIPLES**:
1. Semantic search beyond keyword matching
2. High-dimensional vector embeddings
3. Approximate Nearest Neighbor (ANN) algorithms
4. Metadata integration for hybrid filtering
5. AI pipeline integration

**Request**: ${prompt}

**Analysis Framework**:
1. **Embedding Strategy**: Data types for vectorization and model selection
2. **Search Pattern Evaluation**: Similarity requirements and performance needs
3. **Index Architecture**: Algorithm selection (HNSW, IVF, LSH)
4. **Hybrid Search**: Vector + metadata filtering requirements

Provide comprehensive analysis focusing on embedding strategies, semantic search requirements, and AI integration needs.`;

      default:
        return prompt;
    }
  }

  private buildDesignPrompt(dbTypeContext: DatabaseTypeContext, analysisContent: string): string {
    switch (dbTypeContext.type) {
      case 'SQL':
        return `Design a comprehensive SQL database schema based on this analysis:

**Analysis Context**: ${analysisContent}

## 📊 SQL Database Design Requirements

Generate a complete relational database design including:

### 1. Normalized Schema Design
\`\`\`sql
-- Core entities with proper normalization
-- Primary and foreign key relationships
-- Appropriate data types and constraints
\`\`\`

### 2. Performance Optimization
\`\`\`sql
-- Strategic indexes for query performance
-- Composite indexes for complex queries
-- Unique constraints and check constraints
\`\`\`

### 3. Data Integrity & Business Rules
\`\`\`sql
-- Referential integrity constraints
-- Check constraints for business logic
-- Triggers for audit trails and validation
\`\`\`

### 4. Transaction Management
\`\`\`sql
-- Stored procedures for complex operations
-- Transaction boundaries and isolation levels
-- Deadlock prevention strategies
\`\`\`

Focus on: ACID compliance, normalization excellence, performance optimization, and referential integrity.`;

      case 'NoSQL':
        return `Design a comprehensive NoSQL database schema based on this analysis:

**Analysis Context**: ${analysisContent}

## 📄 NoSQL Database Design Requirements

Generate a complete document-oriented database design including:

### 1. Document Schema Design
\`\`\`javascript
// Core document structures optimized for access patterns
// Embedded vs. referenced data strategies
// Dynamic schema evolution capabilities
\`\`\`

### 2. Collection Relationships
\`\`\`javascript
// Document embedding strategies
// Reference patterns for large datasets
// Aggregation pipeline designs
\`\`\`

### 3. Indexing Strategy
\`\`\`javascript
// Compound indexes for query optimization
// Text search and geospatial indexes
// Partial and sparse indexes
\`\`\`

### 4. Scaling Architecture
\`\`\`javascript
// Sharding key selection
// Replica set configuration
// Load balancing strategies
\`\`\`

Focus on: Query pattern optimization, document design flexibility, horizontal scalability, and eventual consistency.`;

      case 'VectorDB':
        return `Design a comprehensive Vector database system based on this analysis:

**Analysis Context**: ${analysisContent}

## 🧮 Vector Database Design Requirements

Generate a complete AI-native vector database design including:

### 1. Vector Collection Schema
\`\`\`python
# Vector storage with embedding specifications
# Metadata schema for hybrid filtering
# Collection partitioning strategies
\`\`\`

### 2. Index Configuration
\`\`\`python
# HNSW/IVF index parameters
# Distance metrics (cosine, euclidean, dot product)
# Memory and performance tuning
\`\`\`

### 3. Search Operations
\`\`\`python
# Similarity search with k-NN
# Hybrid vector + metadata queries
# Multi-modal search capabilities
\`\`\`

### 4. AI Pipeline Integration
\`\`\`python
# Embedding generation workflows
# Model serving and vector updates
# Real-time vs. batch processing
\`\`\`

Focus on: Semantic search optimization, embedding quality, index performance, and AI workflow integration.`;

      default:
        return analysisContent;
    }
  }

  private async retryWithBackoff(operation: () => Promise<string>, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Validate response completeness for design phase (most likely to be truncated)
        if (result.length > 10000) { // Only check long responses
          const validation = this.validateResponseCompleteness(result);
          if (!validation.isComplete) {
            console.warn(`⚠️ Response validation issues detected (attempt ${attempt}):`, validation.issues);
            if (attempt < maxRetries) {
              throw new Error('Response appears truncated, retrying...');
            }
          }
        }
        
        return result;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private validateResponseCompleteness(content: string): { isComplete: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for incomplete code blocks
    const codeBlocks = (content.match(/```/g) || []).length;
    if (codeBlocks % 2 !== 0) {
      issues.push('Incomplete code block detected');
    }
    
    // Check for common truncation patterns
    const truncationPatterns = [
      /It seems there was a misunderstanding/i,
      /Let me provide/i,
      /I'll need to/i,
      /However,?$/i,
      /Unfortunately,?$/i
    ];
    
    for (const pattern of truncationPatterns) {
      if (pattern.test(content)) {
        issues.push('Response contains truncation indicator phrases');
        break;
      }
    }
    
    // Check if content ends abruptly (no proper conclusion)
    const lastSentence = content.trim().split('.').pop() || '';
    if (lastSentence.length < 10 && !content.includes('```') && content.length > 5000) {
      issues.push('Response may be cut off abruptly');
    }
    
    return {
      isComplete: issues.length === 0,
      issues
    };
  }
}

export const enhancedDBCoachService = new EnhancedDBCoachService();
export default enhancedDBCoachService;