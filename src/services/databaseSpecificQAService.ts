// Database-Specific Quality Assurance Service
// Specialized QA agents for SQL, NoSQL, and Vector DB with different validation criteria

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface QAValidationResult {
  passed: boolean;
  score: number; // 0-100
  issues: QAIssue[];
  recommendations: string[];
  agent: string;
  validationType: 'SQL' | 'NoSQL' | 'VectorDB';
}

export interface QAIssue {
  severity: 'critical' | 'major' | 'minor' | 'warning';
  category: string;
  description: string;
  solution: string;
  location?: string;
}

class DatabaseSpecificQAService {
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
        temperature: 0.3, // Lower temperature for more consistent validation
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
      }
    });
  }

  async validateSQLDesign(
    schema: string,
    requirements: string
  ): Promise<QAValidationResult> {
    const sqlQAPrompt = `
You are a Senior SQL Database Quality Assurance Specialist with 15+ years of enterprise database experience.

VALIDATION REQUIREMENTS:
Analyze this SQL database schema for production readiness using strict enterprise standards.

SCHEMA TO VALIDATE:
${schema}

ORIGINAL REQUIREMENTS:
${requirements}

SQL-SPECIFIC VALIDATION CRITERIA:

1. ACID COMPLIANCE VALIDATION:
   - All tables must have proper PRIMARY KEY constraints
   - Foreign key relationships must be properly defined
   - Transaction boundaries must be clearly defined
   - Referential integrity must be enforced

2. NORMALIZATION ASSESSMENT:
   - Check for 1NF, 2NF, 3NF compliance
   - Identify any denormalization and validate its necessity
   - Ensure no redundant data storage
   - Validate proper entity separation

3. PERFORMANCE OPTIMIZATION:
   - All foreign keys must have corresponding indexes
   - Query patterns must be supported by appropriate indexes
   - Large tables should have partitioning strategy
   - Proper data types chosen for storage efficiency

4. DATA INTEGRITY VALIDATION:
   - Check constraints for business rules
   - NOT NULL constraints where appropriate
   - UNIQUE constraints for business keys
   - Proper cascade rules for deletions

5. SCHEMA DESIGN STANDARDS:
   - Consistent naming conventions
   - Audit fields (created_at, updated_at) present
   - Proper VARCHAR sizes specified
   - Decimal precision for monetary fields

6. SCALABILITY ASSESSMENT:
   - Index strategy supports expected query patterns
   - Potential bottlenecks identified
   - Scaling strategy documented
   - Connection pooling considerations

CRITICAL VALIDATION RULES:
- CRITICAL: Missing primary keys, invalid SQL syntax, security vulnerabilities
- MAJOR: Performance issues, missing indexes, normalization violations
- MINOR: Naming conventions, missing constraints, optimization opportunities
- WARNING: Best practice recommendations, future considerations

OUTPUT FORMAT:
Provide a JSON response with this exact structure:
{
  "passed": boolean,
  "score": number (0-100),
  "issues": [
    {
      "severity": "critical|major|minor|warning",
      "category": "ACID Compliance|Normalization|Performance|Data Integrity|Schema Design|Scalability",
      "description": "Specific issue description",
      "solution": "Recommended fix",
      "location": "Table/field reference if applicable"
    }
  ],
  "recommendations": ["List of specific recommendations for improvement"],
  "agent": "SQL Quality Assurance Specialist",
  "validationType": "SQL"
}

VALIDATION SCORING:
- Start with 100 points
- Deduct 25 points per CRITICAL issue
- Deduct 10 points per MAJOR issue  
- Deduct 3 points per MINOR issue
- Deduct 1 point per WARNING
- Minimum score is 0

Be thorough and uncompromising in your quality standards.
`;

    try {
      const response = await this.model.generateContent(sqlQAPrompt);
      const result = await response.response.text();
      return JSON.parse(this.cleanJsonResponse(result));
    } catch (error) {
      console.error('SQL QA validation failed:', error);
      return this.createErrorResult('SQL', 'SQL Quality Assurance Specialist');
    }
  }

  async validateNoSQLDesign(
    schema: string,
    requirements: string
  ): Promise<QAValidationResult> {
    const nosqlQAPrompt = `
You are a Senior NoSQL Database Quality Assurance Architect specializing in document databases and distributed systems.

VALIDATION REQUIREMENTS:
Analyze this NoSQL database design for production readiness using NoSQL best practices.

SCHEMA TO VALIDATE:
${schema}

ORIGINAL REQUIREMENTS:
${requirements}

NOSQL-SPECIFIC VALIDATION CRITERIA:

1. DOCUMENT STRUCTURE OPTIMIZATION:
   - Documents should be designed for primary access patterns
   - Appropriate embedding vs. referencing decisions
   - Document size within optimal limits (< 16MB for MongoDB)
   - Proper use of arrays and nested objects

2. ACCESS PATTERN ALIGNMENT:
   - Schema supports identified query patterns efficiently
   - Indexes align with query requirements
   - Read/write patterns are optimized
   - Aggregation pipelines are efficient

3. SCALING AND DISTRIBUTION:
   - Shard key selection enables even distribution
   - No hot-spotting in shard key design
   - Replica set configuration appropriate
   - Geographic distribution considerations

4. INDEX STRATEGY VALIDATION:
   - Compound indexes support query patterns
   - Index cardinality is appropriate
   - Text search indexes where needed
   - Partial indexes for filtered queries

5. CONSISTENCY MODEL ASSESSMENT:
   - Consistency requirements met
   - Conflict resolution strategy defined
   - Read/write concern levels appropriate
   - CAP theorem trade-offs documented

6. PERFORMANCE OPTIMIZATION:
   - Document design minimizes seeks
   - Proper use of embedded documents
   - Array operations optimized
   - Connection pooling configured

CRITICAL VALIDATION RULES:
- CRITICAL: Invalid JSON structure, missing _id fields, shard key issues
- MAJOR: Poor access pattern alignment, inefficient indexes, scaling bottlenecks
- MINOR: Document size optimization, naming conventions, index optimization
- WARNING: Best practices, future scalability considerations

OUTPUT FORMAT:
Provide a JSON response with this exact structure:
{
  "passed": boolean,
  "score": number (0-100),
  "issues": [
    {
      "severity": "critical|major|minor|warning",
      "category": "Document Structure|Access Patterns|Scaling|Indexing|Consistency|Performance",
      "description": "Specific issue description",
      "solution": "Recommended fix",
      "location": "Collection/field reference if applicable"
    }
  ],
  "recommendations": ["List of specific recommendations for improvement"],
  "agent": "NoSQL Quality Assurance Architect",
  "validationType": "NoSQL"
}

VALIDATION SCORING:
- Start with 100 points
- Deduct 25 points per CRITICAL issue
- Deduct 10 points per MAJOR issue
- Deduct 3 points per MINOR issue  
- Deduct 1 point per WARNING
- Minimum score is 0

Focus on NoSQL-specific concerns like document design, sharding, and eventual consistency.
`;

    try {
      const response = await this.model.generateContent(nosqlQAPrompt);
      const result = await response.response.text();
      return JSON.parse(this.cleanJsonResponse(result));
    } catch (error) {
      console.error('NoSQL QA validation failed:', error);
      return this.createErrorResult('NoSQL', 'NoSQL Quality Assurance Architect');
    }
  }

  async validateVectorDBDesign(
    schema: string,
    requirements: string
  ): Promise<QAValidationResult> {
    const vectordbQAPrompt = `
You are a Senior Vector Database Quality Assurance Engineer specializing in AI/ML systems and semantic search.

VALIDATION REQUIREMENTS:
Analyze this Vector database design for production AI/ML deployment readiness.

SCHEMA TO VALIDATE:
${schema}

ORIGINAL REQUIREMENTS:
${requirements}

VECTOR DB-SPECIFIC VALIDATION CRITERIA:

1. EMBEDDING STRATEGY VALIDATION:
   - Embedding model appropriateness for data type
   - Dimensionality efficiency and memory implications
   - Model versioning and update strategy
   - Embedding quality and consistency

2. INDEX PERFORMANCE OPTIMIZATION:
   - ANN algorithm selection (HNSW/IVF/LSH) justified
   - Index parameters optimized for use case
   - Distance metric selection appropriate
   - Memory vs. accuracy trade-offs documented

3. HYBRID SEARCH CAPABILITY:
   - Metadata filtering efficiency
   - Vector + keyword search integration
   - Multi-modal search support if required
   - Filter selectivity optimization

4. PRODUCTION READINESS:
   - Batch ingestion pipeline design
   - Real-time update capabilities
   - Backup and recovery procedures
   - Monitoring and alerting setup

5. SCALABILITY AND PERFORMANCE:
   - Horizontal scaling strategy
   - GPU acceleration utilization
   - Vector quantization implementation
   - Cache strategy for hot vectors

6. AI PIPELINE INTEGRATION:
   - Model serving architecture
   - Embedding generation pipeline
   - Error handling for model failures
   - A/B testing capabilities for model updates

CRITICAL VALIDATION RULES:
- CRITICAL: Missing vector fields, inappropriate index algorithm, security vulnerabilities
- MAJOR: Poor embedding strategy, performance bottlenecks, scaling limitations
- MINOR: Metadata structure optimization, parameter tuning opportunities
- WARNING: Best practices, monitoring improvements, future considerations

OUTPUT FORMAT:
Provide a JSON response with this exact structure:
{
  "passed": boolean,
  "score": number (0-100),
  "issues": [
    {
      "severity": "critical|major|minor|warning",
      "category": "Embedding Strategy|Index Performance|Hybrid Search|Production Readiness|Scalability|AI Pipeline",
      "description": "Specific issue description",
      "solution": "Recommended fix",
      "location": "Collection/field reference if applicable"
    }
  ],
  "recommendations": ["List of specific recommendations for improvement"],
  "agent": "Vector DB Quality Assurance Engineer",
  "validationType": "VectorDB"
}

VALIDATION SCORING:
- Start with 100 points
- Deduct 25 points per CRITICAL issue
- Deduct 10 points per MAJOR issue
- Deduct 3 points per MINOR issue
- Deduct 1 point per WARNING
- Minimum score is 0

Focus on AI/ML-specific concerns like embedding quality, semantic search accuracy, and production ML deployment.
`;

    try {
      const response = await this.model.generateContent(vectordbQAPrompt);
      const result = await response.response.text();
      return JSON.parse(this.cleanJsonResponse(result));
    } catch (error) {
      console.error('Vector DB QA validation failed:', error);
      return this.createErrorResult('VectorDB', 'Vector DB Quality Assurance Engineer');
    }
  }

  async validateDatabaseDesign(
    schema: string,
    requirements: string,
    dbType: 'SQL' | 'NoSQL' | 'VectorDB'
  ): Promise<QAValidationResult> {
    switch (dbType) {
      case 'SQL':
        return this.validateSQLDesign(schema, requirements);
      case 'NoSQL':
        return this.validateNoSQLDesign(schema, requirements);
      case 'VectorDB':
        return this.validateVectorDBDesign(schema, requirements);
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks and clean up response
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Find the JSON object boundaries
    const startIndex = cleaned.indexOf('{');
    const lastIndex = cleaned.lastIndexOf('}');
    
    if (startIndex !== -1 && lastIndex !== -1) {
      cleaned = cleaned.substring(startIndex, lastIndex + 1);
    }
    
    return cleaned;
  }

  private createErrorResult(
    validationType: 'SQL' | 'NoSQL' | 'VectorDB',
    agent: string
  ): QAValidationResult {
    return {
      passed: false,
      score: 0,
      issues: [{
        severity: 'critical',
        category: 'System Error',
        description: 'Quality assurance validation failed due to system error',
        solution: 'Please retry the validation or contact support',
        location: 'System'
      }] as QAIssue[],
      recommendations: ['Retry validation after checking system connectivity'],
      agent,
      validationType
    };
  }

  // Batch validation for comprehensive quality assessment
  async validateAllAspects(
    schema: string,
    requirements: string,
    dbType: 'SQL' | 'NoSQL' | 'VectorDB'
  ): Promise<{
    overallResult: QAValidationResult;
    detailedResults: QAValidationResult[];
    summary: {
      totalIssues: number;
      criticalIssues: number;
      overallScore: number;
      recommendation: 'APPROVED' | 'APPROVED_WITH_CHANGES' | 'REJECTED';
    };
  }> {
    const validationResults: QAValidationResult[] = [];
    
    // Primary validation
    const primaryResult = await this.validateDatabaseDesign(schema, requirements, dbType);
    validationResults.push(primaryResult);
    
    // Calculate overall metrics
    const totalIssues = validationResults.reduce((sum, result) => sum + result.issues.length, 0);
    const criticalIssues = validationResults.reduce(
      (sum, result) => sum + result.issues.filter(issue => issue.severity === 'critical').length, 
      0
    );
    
    const overallScore = Math.round(
      validationResults.reduce((sum, result) => sum + result.score, 0) / validationResults.length
    );
    
    let recommendation: 'APPROVED' | 'APPROVED_WITH_CHANGES' | 'REJECTED';
    if (criticalIssues > 0 || overallScore < 60) {
      recommendation = 'REJECTED';
    } else if (overallScore < 85 || totalIssues > 5) {
      recommendation = 'APPROVED_WITH_CHANGES';
    } else {
      recommendation = 'APPROVED';
    }
    
    return {
      overallResult: primaryResult,
      detailedResults: validationResults,
      summary: {
        totalIssues,
        criticalIssues,
        overallScore,
        recommendation
      }
    };
  }
}

export const databaseSpecificQAService = new DatabaseSpecificQAService();
export default databaseSpecificQAService;