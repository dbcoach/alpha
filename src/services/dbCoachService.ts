import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DBCoachAnalysis {
  domain: string;
  scale: 'small' | 'medium' | 'large' | 'enterprise';
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise';
  requirements: {
    explicit: string[];
    implicit: string[];
    technical_constraints: string[];
  };
  assumptions: Array<{ assumption: string; justification: string; confidence: number }>;
  clarification_needed: string[];
}

export interface DBCoachDesign {
  database_type: string;
  reasoning: string;
  architecture_pattern: string;
  scaling_strategy: string;
  quick_start_schema: string;
  complete_schema: string;
  performance_optimizations: string;
  security_measures: string[];
  migration_scripts: string;
  monitoring_queries: string;
}

export interface ValidationResult {
  overall_score: number;
  category_scores: {
    syntax: number;
    logic: number;
    performance: number;
    security: number;
    completeness: number;
  };
  critical_issues: string[];
  major_issues: string[];
  minor_issues: string[];
  approved: boolean;
}

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

class DBCoachService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  // Agent System Prompts
  private readonly SYSTEM_PROMPTS = {
    MASTER_ORCHESTRATOR: `You are DBCoach, a master database architect with 15+ years of Fortune 500 experience, operating as the orchestrator of a specialized multi-agent team focused on delivering 95%+ accurate database solutions through systematic analysis and validation.

## OPERATIONAL FRAMEWORK
Every interaction follows this mandatory 4-phase pipeline:

### PHASE 1: ANALYSIS (Requirements extraction and validation)
### PHASE 2: DESIGN (Schema creation and optimization) 
### PHASE 3: VALIDATION (Multi-layer quality assurance)
### PHASE 4: IMPLEMENTATION (Complete delivery package)

You coordinate 8 specialized agents:
- Requirements_Extractor: Achieves 95%+ requirement interpretation accuracy
- Domain_Classifier: Identifies business domain with intelligent enhancement
- Schema_Architect: Designs optimal schemas with performance built-in
- Performance_Optimizer: Ensures production-ready performance
- Security_Validator: Implements zero-tolerance security standards
- Technical_Reviewer: Validates against enterprise best practices
- Quality_Assurance: Enforces 98%+ technical correctness
- Documentation_Generator: Creates comprehensive implementation guides`,

    REQUIREMENTS_EXTRACTOR: `You are the Requirements Extraction specialist. Your mission is 95%+ accuracy in interpreting user needs.

ANALYSIS_PIPELINE:
1. DOMAIN_DETECTION: Scan for [e-commerce, saas, social, blog, financial, healthcare, iot] keywords
2. SCALE_ASSESSMENT: Extract [user_count, transaction_volume, data_size, concurrency] indicators
3. TECHNICAL_CONSTRAINTS: Identify [database_preferences, existing_stack, compliance_needs]
4. FEATURE_EXTRACTION: List all explicit and implicit functionality requirements

SCALE_ESTIMATION:
- Small: <10K users, <100K transactions/day, <100GB data
- Medium: 10K-1M users, 100K-10M transactions/day, 100GB-10TB data  
- Large: 1M+ users, 10M+ transactions/day, >10TB data
- Enterprise: >10M users, >100M transactions/day, distributed systems

OUTPUT_FORMAT: Return structured JSON with domain, scale, requirements (explicit/implicit), assumptions, clarifications needed.`,

    DOMAIN_CLASSIFIER: `You are the Domain Classification expert. Identify business domain with 100% accuracy and apply intelligent enhancements.

CLASSIFICATION_RULES:
- E-commerce: Keywords [shop, store, product, cart, order, payment, inventory]
- SaaS: Keywords [tenant, subscription, billing, feature, plan, usage, multi-tenant]
- Social: Keywords [user, post, comment, like, follow, feed, message, friend]
- Blog/CMS: Keywords [article, post, author, category, tag, content, publish]
- Financial: Keywords [transaction, account, balance, payment, audit, compliance]
- Healthcare: Keywords [patient, appointment, medical, treatment, doctor, clinic]
- IoT: Keywords [device, sensor, telemetry, measurement, real-time, data]

AUTO_ENHANCEMENT_RULES:
E-commerce → Add: inventory tracking, multi-currency, tax calculation, order workflows
SaaS → Add: multi-tenancy, usage tracking, feature flags, billing cycles  
Social → Add: friendship tables, activity feeds, content moderation
Financial → Add: audit trails, decimal precision, regulatory compliance`,

    SCHEMA_ARCHITECT: `You are the Schema Architecture specialist. Design optimal database schemas with technical precision.

DATABASE_SELECTION_LOGIC:
- Complex relationships + ACID needed → PostgreSQL
- Flexible schema + document-oriented → MongoDB
- Graph relationships critical → Neo4j  
- Key-value + high performance → Redis/DynamoDB
- Time-series data → InfluxDB
- Default safe choice → PostgreSQL

DESIGN_REQUIREMENTS:
1. Extract core business entities and relationships
2. Apply normalization (2NF-3NF default, justify deviations)
3. Add audit fields (created_at, updated_at, created_by)
4. Include soft delete capabilities where appropriate
5. Define proper constraints and cascade rules

MANDATORY_ELEMENTS:
- Primary keys (UUID for distributed, SERIAL for single-server)
- Foreign key constraints with proper CASCADE rules
- Check constraints for business rules
- Appropriate data types (DECIMAL for money, VARCHAR with limits)
- Security considerations (password_hash, PII encryption notes)`,

    PERFORMANCE_OPTIMIZER: `You are the Performance Optimization specialist. Ensure production-ready performance.

OPTIMIZATION_STRATEGY:
1. INDEX_DESIGN:
   - Index ALL foreign keys automatically
   - Create composite indexes for complex query patterns
   - Add unique indexes for natural keys
   - Consider partial indexes for filtered queries

2. QUERY_OPTIMIZATION:
   - Analyze expected query patterns
   - Identify potential N+1 query problems
   - Suggest eager loading strategies
   - Recommend denormalization where beneficial

3. SCALABILITY_PLANNING:
   - Table partitioning for large datasets (>10M rows)
   - Sharding strategies for horizontal scaling
   - Read replica recommendations
   - Caching layer suggestions

PERFORMANCE_TARGETS:
- Simple queries: <100ms response time
- Complex queries: <1s response time
- Index coverage: 95%+ of WHERE clauses
- Storage overhead: <30% of data size`,

    TECHNICAL_REVIEWER: `You are the Technical Review specialist. Validate against enterprise best practices with zero tolerance for critical issues.

VALIDATION_CHECKLIST:
Critical (Block delivery):
- SQL syntax 100% valid
- Primary keys present on all tables
- Foreign key indexes exist
- No security vulnerabilities
- No data loss risks

Major (Require fixes):
- Performance optimizations present
- Proper constraint definitions
- Appropriate data types
- Maintainability considerations

Minor (Recommendations):
- Documentation completeness
- Optimization opportunities
- Best practice adherence

SCORING: Critical issues = 0 points, Major issues = -10 points each, Minor issues = -2 points each
PASS_CRITERIA: Zero critical issues, <3 major issues, >90% overall score`
  };

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite-preview-06-17',
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent, technical outputs
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
      // Phase 1: Analysis
      onProgress?.({ 
        step: 'analysis', 
        agent: 'Requirements Extractor',
        reasoning: 'Analyzing your requirements and extracting key information...', 
        isComplete: false,
        currentStep: 1,
        totalSteps: 8
      });

      const analysisStep = await this.executeAnalysisPhase(prompt, dbType);
      steps.push(analysisStep);

      // Phase 2: Design  
      onProgress?.({ 
        step: 'design', 
        agent: 'Schema Architect',
        reasoning: 'Designing optimal database schema with performance considerations...', 
        isComplete: false,
        currentStep: 3,
        totalSteps: 8
      });

      const designStep = await this.executeDesignPhase(prompt, dbType, analysisStep);
      steps.push(designStep);

      // Phase 3: Validation
      onProgress?.({ 
        step: 'validation', 
        agent: 'Technical Reviewer',
        reasoning: 'Validating design against enterprise best practices...', 
        isComplete: false,
        currentStep: 6,
        totalSteps: 8
      });

      const validationStep = await this.executeValidationPhase(designStep);
      steps.push(validationStep);

      // Phase 4: Implementation Package
      onProgress?.({ 
        step: 'implementation', 
        agent: 'Documentation Generator',
        reasoning: 'Generating complete implementation package...', 
        isComplete: false,
        currentStep: 8,
        totalSteps: 8
      });

      const implementationStep = await this.generateImplementationPackage(prompt, dbType, designStep);
      steps.push(implementationStep);

      onProgress?.({ 
        step: 'implementation', 
        agent: 'DBCoach Master',
        reasoning: 'Database design complete! Production-ready solution delivered.', 
        isComplete: true,
        currentStep: 8,
        totalSteps: 8
      });

      return steps;
    } catch (error) {
      console.error('DBCoach generation failed:', error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeAnalysisPhase(prompt: string, dbType: string): Promise<GenerationStep> {
    const analysisPrompt = `${this.SYSTEM_PROMPTS.REQUIREMENTS_EXTRACTOR}

ANALYZE THIS REQUEST:
"${prompt}"

Target Database Type: ${dbType}

Provide a comprehensive analysis in this JSON format:
{
  "domain": "detected_domain",
  "scale": "small|medium|large|enterprise", 
  "complexity": "simple|medium|complex|enterprise",
  "requirements": {
    "explicit": ["list of stated requirements"],
    "implicit": ["list of inferred requirements with confidence scores"],
    "technical_constraints": ["identified technical constraints"]
  },
  "assumptions": [
    {"assumption": "text", "justification": "reasoning", "confidence": 0.85}
  ],
  "clarification_needed": ["critical missing information"]
}`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(analysisPrompt);
      return await result.response.text();
    });

    return {
      type: 'analysis',
      title: 'Requirements Analysis', 
      content: this.extractJSONFromResponse(response),
      reasoning: 'Comprehensive requirement analysis with domain detection and scale assessment',
      agent: 'Requirements Extractor',
      status: 'completed'
    };
  }

  private async executeDesignPhase(prompt: string, dbType: string, analysisStep: GenerationStep): Promise<GenerationStep> {
    const analysis = JSON.parse(analysisStep.content);
    
    const designPrompt = `${this.SYSTEM_PROMPTS.SCHEMA_ARCHITECT}

DESIGN DATABASE FOR:
Original Request: "${prompt}"
Analysis Results: ${JSON.stringify(analysis, null, 2)}
Target Database: ${dbType}

Generate a comprehensive database design following this structure:

# 🗄️ Database Design for ${analysis.domain} Application

## 🎯 Requirements Analysis
**Domain**: ${analysis.domain} | **Scale**: ${analysis.scale} | **Complexity**: ${analysis.complexity}

### 📋 Understanding Your Requirements
**Explicit requirements**: ${analysis.requirements.explicit.join(', ')}
**Implicit requirements**: ${analysis.requirements.implicit.join(', ')}
**Assumptions**: ${analysis.assumptions.map(a => a.assumption).join(', ')}

## 🏗️ Recommended Database Solution
**Primary Database**: [SELECTED_DATABASE] 
**Reasoning**: [TECHNICAL_JUSTIFICATION]
**Architecture Pattern**: [MONOLITHIC|MICROSERVICES|DISTRIBUTED]

## ⚡ Quick Start Schema
\`\`\`sql
-- CORE FUNCTIONALITY (3-5 tables)
[MINIMAL_VIABLE_SCHEMA]
\`\`\`

## 🔧 Complete Implementation
\`\`\`sql
-- FULL FEATURE SET WITH CONSTRAINTS AND INDEXES
[COMPREHENSIVE_SCHEMA]
\`\`\`

## 🚀 Performance & Security
\`\`\`sql
-- PERFORMANCE INDEXES
[ALL_INDEXES_WITH_REASONING]

-- SECURITY MEASURES  
[SECURITY_IMPLEMENTATIONS]
\`\`\`

## 📊 Sample Queries
\`\`\`sql
-- COMMON QUERY PATTERNS
[OPTIMIZED_SAMPLE_QUERIES]
\`\`\`

IMPORTANT: Ensure 100% SQL syntax validity, include all foreign key indexes, use DECIMAL for money, add audit fields.`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(designPrompt);
      return await result.response.text();
    });

    return {
      type: 'design',
      title: `${dbType} Database Design`,
      content: response,
      reasoning: 'Production-ready database schema with performance optimizations and security measures',
      agent: 'Schema Architect',
      status: 'completed'
    };
  }

  private async executeValidationPhase(designStep: GenerationStep): Promise<GenerationStep> {
    const validationPrompt = `${this.SYSTEM_PROMPTS.TECHNICAL_REVIEWER}

VALIDATE THIS DATABASE DESIGN:
${designStep.content}

Perform comprehensive technical review and return results in this JSON format:
{
  "overall_score": 95,
  "category_scores": {
    "syntax": 100,
    "logic": 95, 
    "performance": 90,
    "security": 100,
    "completeness": 85
  },
  "critical_issues": [],
  "major_issues": [],
  "minor_issues": ["suggestion 1", "suggestion 2"],
  "approved": true,
  "recommendations": ["improvement 1", "improvement 2"]
}

VALIDATION CRITERIA:
- SQL syntax must be 100% valid
- All foreign keys must have indexes
- Security measures must be present
- Performance considerations included
- Documentation must be complete`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(validationPrompt);
      return await result.response.text();
    });

    return {
      type: 'validation',
      title: 'Quality Validation',
      content: this.extractJSONFromResponse(response),
      reasoning: 'Comprehensive technical review with enterprise-grade validation',
      agent: 'Technical Reviewer', 
      status: 'completed'
    };
  }

  private async generateImplementationPackage(prompt: string, dbType: string, designStep: GenerationStep): Promise<GenerationStep> {
    const implementationPrompt = `Generate a complete implementation package for this database design:

${designStep.content}

Provide:
1. Migration scripts with version control
2. Rollback procedures
3. Sample application integration code
4. Monitoring and health check queries
5. Performance optimization guide
6. Security implementation checklist
7. Deployment instructions

Format as a comprehensive implementation guide that a developer can follow step-by-step.`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(implementationPrompt);
      return await result.response.text();
    });

    return {
      type: 'implementation',
      title: 'Implementation Package',
      content: response,
      reasoning: 'Complete deployment package with migrations, monitoring, and best practices',
      agent: 'Documentation Generator',
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
      const result = await this.model.generateContent('Test connection. Respond with "DBCoach Ready".');
      const response = await result.response;
      return response.text().includes('DBCoach Ready');
    } catch (error) {
      console.error('DBCoach connection test failed:', error);
      return false;
    }
  }
}

export const dbCoachService = new DBCoachService();
export default dbCoachService;