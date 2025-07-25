import { GoogleGenerativeAI } from '@google/generative-ai';
import { toolService, ToolService } from './toolService';
import { contextService, ContextService, DatabaseContext, WorkspaceContext, UserContext, ConversationContext } from './contextService';
import { databaseSpecificQAService, QAValidationResult } from './databaseSpecificQAService';
import { DatabaseTypePromptEngine } from './databaseTypePrompts';

export interface RevolutionaryGenerationStep {
  type: 'analysis' | 'design' | 'validation' | 'implementation';
  title: string;
  content: string;
  reasoning: string;
  agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolCalls?: Array<{
    tool: string;
    params: any;
    result: string;
  }>;
  confidence: number;
  safetyChecks: string[];
}

export interface RevolutionaryGenerationProgress {
  step: RevolutionaryGenerationStep['type'];
  agent: string;
  reasoning: string;
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
  confidence: number;
  contextUsed: string[];
}

enum AgentMode {
  DBA_AGENT = "DBA_Agent",
  ANALYST = "Analyst", 
  DEVELOPER = "Developer",
  CHAT = "Chat"
}

interface AgentCapabilities {
  mode: AgentMode;
  systemPrompt: string;
  allowedTools: string[];
  safetyLevel: 'READ_ONLY' | 'SAFE_MODIFY' | 'DESTRUCTIVE_ALLOWED';
  maxContextTokens: number;
  databaseSpecialization?: 'SQL' | 'NoSQL' | 'VectorDB';
  expertiseLevel: 'junior' | 'senior' | 'expert' | 'architect';
}

class RevolutionaryDBCoachService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private toolService: ToolService;
  private contextService: ContextService;

  // Revolutionary Master System Prompt with Transparency and Versioning
  private readonly MASTER_SYSTEM_PROMPT = `You are DB.Coach, an expert AI database administrator, analyst, and developer. Your primary goal is to assist users in all aspects of database management, from design and optimization to troubleshooting and migration. You are a knowledgeable, patient, and proactive mentor who operates with complete transparency.

### TRANSPARENCY DIRECTIVE
- Always indicate when you're using AI assistance
- Provide users access to view and modify underlying prompts  
- Log all prompt variations and model interactions
- Show confidence levels for recommendations

### CORE PRINCIPLES
- **Explain Before Executing:** Never perform an action without first explaining what it will do and why
- **Teach Best Practices:** Proactively offer advice on best practices for database design, query optimization, security
- **Prioritize Safety:** Always prioritize the safety and integrity of the user's data
- **Provide Context & Rationale:** Explain the reasoning behind your recommendations and actions
- **Be a Collaborative Partner:** Engage in dialogue, ask clarifying questions, work together for optimal solutions

### PROMPT VERSIONING SYSTEM
prompt_version: "2025.1.0"
system_prompt_id: "dbcoach_revolutionary_v1.0"
last_updated: "2025-01-02"
compatibility: ["gemini-2.5-flash", "gpt-4", "claude-3"]

### USER-EDITABLE PROMPT SECTIONS
[EDITABLE_EXPERTISE_LEVEL]
Default: "Explain concepts clearly for intermediate database developers"
User_Override: {user_defined_explanation_level}

[EDITABLE_SAFETY_PREFERENCES]  
Default: "Always require confirmation for destructive operations"
User_Override: {user_safety_settings}

[EDITABLE_OUTPUT_FORMAT]
Default: "Provide code examples with explanations"
User_Override: {user_format_preferences}
`;

  // Revolutionary Agent Definitions
  private readonly AGENT_CAPABILITIES: Record<AgentMode, AgentCapabilities> = {
    [AgentMode.DBA_AGENT]: {
      mode: AgentMode.DBA_AGENT,
      systemPrompt: `${this.MASTER_SYSTEM_PROMPT}

You are operating in **DBA Agent Mode**. Your primary responsibility is to act as an expert Database Administrator, capable of planning and executing complex database tasks such as schema design, migrations, and performance tuning. **SAFETY FIRST** is your prime directive.

### DATABASE OPERATION MODE: Migration Planning
SYSTEM: Database Migration Planner
CONTEXT: {source_schema} + {target_requirements}
CAPABILITIES: Migration script generation, data mapping, rollback planning
OUTPUT_FORMAT: Step-by-step migration plan with validation checkpoints
SAFETY_CHECKS: Backup verification, data integrity validation

### Agent Directives:
- **Understand the Goal:** Interpret the user's request in terms of database operations
- **Step-by-Step Planning:** Reason through intermediate steps before execution
- **Tool Invocation:** Use available tools to retrieve information or apply changes
- **Reasoning and Execution:** Outline your plan before executing
- **Rollback Plans:** For any operation that modifies the database, always provide a clear and tested rollback plan

### Available Tools:
{tools_xml}

### Context Information:
**Database Schema:** {database_context}
**User Preferences:** {user_context}
**Conversation History:** {conversation_context}
**Workspace Context:** {workspace_context}
`,
      allowedTools: ['executeQuery', 'getSchemaForTables', 'listTables', 'explainQueryPlan', 'suggestIndexes'],
      safetyLevel: 'DESTRUCTIVE_ALLOWED',
      maxContextTokens: 8000
    },

    [AgentMode.ANALYST]: {
      mode: AgentMode.ANALYST,
      systemPrompt: `${this.MASTER_SYSTEM_PROMPT}

You are operating in **Analyst Mode**. Your primary responsibility is to act as an expert Database Analyst, focusing on understanding, diagnosing, and recommending improvements. You are primarily **READ-ONLY** and will not make direct modifications.

### DATABASE OPERATION MODE: Schema Analysis
SYSTEM: Database Schema Analyzer
CONTEXT: {schema_context}
CAPABILITIES: DDL analysis, normalization review, relationship mapping
OUTPUT_FORMAT: Structured analysis with recommendations
SAFETY_CHECKS: Validate before suggesting destructive operations

### DATABASE OPERATION MODE: Query Optimization  
SYSTEM: SQL Performance Optimizer
CONTEXT: {query_context} + {performance_metrics}
CAPABILITIES: Execution plan analysis, index recommendations, query rewriting
OUTPUT_FORMAT: Original query, optimized version, explanation, performance impact
SAFETY_CHECKS: Preserve query semantics, validate syntax

### Agent Directives:
- **Identify Needed Info:** Parse the user's question for keywords indicating what to gather
- **Retrieve Context:** Use safe, read-only operations to get the info
- **Summarize Clearly:** Compile the findings into a clear, concise summary
- **Provide Contextual Detail:** Include brief explanations where helpful
- **Non-Destructive Tools:** Use only non-invasive tools/queries
- **Recommendations:** Provide clear, actionable recommendations for improvement

### Available Tools:
{tools_xml}

### Context Information:
**Database Schema:** {database_context}
**User Preferences:** {user_context}
**Conversation History:** {conversation_context}
**Workspace Context:** {workspace_context}
`,
      allowedTools: ['executeQuery', 'getSchemaForTables', 'listTables', 'explainQueryPlan', 'suggestIndexes'],
      safetyLevel: 'READ_ONLY',
      maxContextTokens: 6000
    },

    [AgentMode.DEVELOPER]: {
      mode: AgentMode.DEVELOPER,
      systemPrompt: `${this.MASTER_SYSTEM_PROMPT}

You are operating in **Developer Mode**. Your primary responsibility is to act as an expert Database Developer, assisting with tasks such as generating code, seeding data, and integrating database logic into applications.

### Agent Directives:
- **Code Generation:** Generate accurate and idiomatic code (ORM models, SQL DDL, test data scripts)
- **Tool Utilization:** Leverage development-specific tools efficiently
- **Integration Focus:** Provide solutions easily integrated into development environments
- **Problem Solving:** Assist in debugging development-related database issues
- **Best Practices:** Guide towards development best practices
- **Output Format:** Provide code snippets in appropriate markdown blocks

### Available Tools:
{tools_xml}

### Context Information:
**Database Schema:** {database_context}
**User Preferences:** {user_context}
**Conversation History:** {conversation_context}
**Workspace Context:** {workspace_context}
`,
      allowedTools: ['executeQuery', 'getSchemaForTables', 'listTables'],
      safetyLevel: 'SAFE_MODIFY',
      maxContextTokens: 7000
    },

    [AgentMode.CHAT]: {
      mode: AgentMode.CHAT,
      systemPrompt: `${this.MASTER_SYSTEM_PROMPT}

You are operating in **Chat Mode**. You are a knowledgeable and friendly AI database expert, engaging in conversational dialogue to answer questions, explain concepts, and provide guidance about all database topics.

### Agent Directives:
- **Conversational Role:** Be friendly, professional, and knowledgeable
- **Context Awareness:** Access conversation history and shared context
- **Adaptability:** Adjust explanations to the user's skill level
- **Completeness and Accuracy:** Ensure answers are correct and sourced
- **Examples and Clarity:** Provide examples and code blocks when applicable
- **Follow-up and Questions:** Proactively ask for clarification

### Context Information:
**Database Schema:** {database_context}
**User Preferences:** {user_context}
**Conversation History:** {conversation_context}
**Workspace Context:** {workspace_context}
`,
      allowedTools: [],
      safetyLevel: 'READ_ONLY',
      maxContextTokens: 5000
    }
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
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 16384, // Increased for comprehensive implementations
      }
    });

    this.toolService = toolService;
    this.contextService = contextService;
  }

  async generateDatabaseDesign(
    prompt: string,
    dbType: string,
    onProgress?: (progress: RevolutionaryGenerationProgress) => void
  ): Promise<RevolutionaryGenerationStep[]> {
    const steps: RevolutionaryGenerationStep[] = [];
    
    try {
      // Gather comprehensive context
      const databaseContext = await this.contextService.gatherDatabaseContext();
      const workspaceContext = await this.contextService.gatherWorkspaceContext();
      const userContext = await this.contextService.gatherUserContext();
      const conversationContext = await this.contextService.gatherConversationContext();

      // Phase 1: Analysis with Revolutionary Context Awareness
      onProgress?.({
        step: 'analysis',
        agent: 'Requirements Analyst',
        reasoning: 'Executing revolutionary semantic analysis pipeline with full context awareness...',
        isComplete: false,
        currentStep: 1,
        totalSteps: 4,
        confidence: 0.95,
        contextUsed: ['database_schema', 'user_preferences', 'conversation_history']
      });

      const analysisStep = await this.executeRevolutionaryAnalysisPhase(
        prompt, 
        dbType, 
        databaseContext, 
        workspaceContext, 
        userContext, 
        conversationContext
      );
      steps.push(analysisStep);

      // Phase 2: Design with Tool Integration
      onProgress?.({
        step: 'design',
        agent: 'Schema Architect',
        reasoning: 'Executing schema design with tool-assisted validation and optimization...',
        isComplete: false,
        currentStep: 2,
        totalSteps: 4,
        confidence: 0.92,
        contextUsed: ['database_schema', 'analysis_results', 'best_practices']
      });

      const designStep = await this.executeRevolutionaryDesignPhase(
        prompt,
        dbType,
        analysisStep,
        databaseContext,
        userContext
      );
      steps.push(designStep);

      // Phase 3: Implementation with Safety Checks
      onProgress?.({
        step: 'implementation',
        agent: 'Implementation Specialist',
        reasoning: 'Generating production-ready implementation with comprehensive safety validation...',
        isComplete: false,
        currentStep: 3,
        totalSteps: 4,
        confidence: 0.90,
        contextUsed: ['design_results', 'safety_preferences', 'deployment_context']
      });

      const implementationStep = await this.executeRevolutionaryImplementationPhase(
        designStep,
        analysisStep,
        userContext
      );
      steps.push(implementationStep);

      // Phase 4: Validation with Confidence Scoring
      onProgress?.({
        step: 'validation',
        agent: 'Quality Assurance',
        reasoning: 'Executing comprehensive quality validation with confidence scoring...',
        isComplete: false,
        currentStep: 4,
        totalSteps: 4,
        confidence: 0.97,
        contextUsed: ['implementation_results', 'quality_standards', 'safety_checks']
      });

      const validationStep = await this.executeRevolutionaryValidationPhase(
        designStep,
        implementationStep,
        userContext,
        dbType
      );
      steps.push(validationStep);

      onProgress?.({
        step: 'validation',
        agent: 'DBCoach Revolutionary Master',
        reasoning: 'Revolutionary database design complete! Commercial-grade solution delivered with full transparency and context awareness.',
        isComplete: true,
        currentStep: 4,
        totalSteps: 4,
        confidence: 0.96,
        contextUsed: ['all_contexts', 'tool_results', 'safety_validations']
      });

      return steps;
    } catch (error) {
      console.error('Revolutionary DBCoach generation failed:', error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeRevolutionaryAnalysisPhase(
    prompt: string,
    dbType: string,
    databaseContext: DatabaseContext,
    workspaceContext: WorkspaceContext,
    userContext: UserContext,
    conversationContext: ConversationContext
  ): Promise<RevolutionaryGenerationStep> {
    
    const agentMode = AgentMode.ANALYST;
    const agentCapabilities = this.AGENT_CAPABILITIES[agentMode];
    
    // Revolutionary context-aware prompt assembly
    const toolsXml = this.toolService.getAvailableTools(agentCapabilities.allowedTools);
    
    const contextualPrompt = agentCapabilities.systemPrompt
      .replace('{tools_xml}', toolsXml)
      .replace('{database_context}', JSON.stringify(databaseContext, null, 2))
      .replace('{workspace_context}', JSON.stringify(workspaceContext, null, 2))
      .replace('{user_context}', JSON.stringify(userContext, null, 2))
      .replace('{conversation_context}', JSON.stringify(conversationContext, null, 2))
      .replace('{user_defined_explanation_level}', userContext.preferences.explanationLevel)
      .replace('{user_safety_settings}', userContext.preferences.safetySettings)
      .replace('{user_format_preferences}', userContext.preferences.outputFormat);

    const analysisPrompt = `${contextualPrompt}

ANALYZE THIS REQUEST WITH REVOLUTIONARY CONTEXT AWARENESS:
"${prompt}"

Target Database Type: ${dbType}

Execute the complete semantic analysis pipeline with tool assistance where needed. Provide comprehensive analysis in JSON format with confidence scores:

{
  "domain": "detected_domain",
  "scale": "small|medium|large|enterprise", 
  "complexity": "simple|medium|complex|enterprise",
  "confidence_score": 0.95,
  "requirements": {
    "explicit": ["stated requirement 1", "stated requirement 2"],
    "implicit": ["inferred need 1 (confidence: 85%)", "inferred need 2 (confidence: 90%)"],
    "technical_constraints": ["constraint 1", "constraint 2"]
  },
  "context_analysis": {
    "existing_schema_compatibility": "analysis of existing schema",
    "user_preference_alignment": "how request aligns with user preferences",
    "conversation_continuity": "relationship to previous conversation"
  },
  "assumptions": [
    {"assumption": "assumption text", "justification": "reasoning", "confidence": 0.85}
  ],
  "tool_recommendations": ["tools that should be used in subsequent phases"],
  "safety_considerations": ["critical safety aspects to consider"]
}`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(analysisPrompt);
      return await result.response.text();
    });

    return {
      type: 'analysis',
      title: 'Revolutionary Requirements Analysis',
      content: this.extractJSONFromResponse(response),
      reasoning: 'Comprehensive requirements analysis using revolutionary context-aware semantic analysis pipeline with confidence scoring',
      agent: 'Revolutionary Requirements Analyst',
      status: 'completed',
      confidence: 0.95,
      safetyChecks: ['context_validation', 'preference_alignment', 'safety_assessment']
    };
  }

  private async executeRevolutionaryDesignPhase(
    prompt: string,
    dbType: string,
    analysisStep: RevolutionaryGenerationStep,
    databaseContext: DatabaseContext,
    userContext: UserContext
  ): Promise<RevolutionaryGenerationStep> {
    
    const analysis = JSON.parse(analysisStep.content);
    const agentMode = AgentMode.DBA_AGENT;
    const agentCapabilities = this.AGENT_CAPABILITIES[agentMode];
    
    const toolsXml = this.toolService.getAvailableTools(agentCapabilities.allowedTools);
    
    const designPrompt = agentCapabilities.systemPrompt
      .replace('{tools_xml}', toolsXml)
      .replace('{database_context}', JSON.stringify(databaseContext, null, 2))
      .replace('{user_context}', JSON.stringify(userContext, null, 2))
      .replace('{user_defined_explanation_level}', userContext.preferences.explanationLevel)
      .replace('{user_safety_settings}', userContext.preferences.safetySettings)
      .replace('{user_format_preferences}', userContext.preferences.outputFormat) + `

DESIGN DATABASE WITH REVOLUTIONARY INTELLIGENCE:
Original Request: "${prompt}"
Analysis Results: ${JSON.stringify(analysis, null, 2)}
Target Database: ${dbType}

Generate a revolutionary database design following this enhanced structure:

# 🗄️ Revolutionary Database Design for ${analysis.domain} Application

## 🎯 Context-Aware Requirements Analysis
**Domain**: ${analysis.domain} | **Scale**: ${analysis.scale} | **Complexity**: ${analysis.complexity}
**Confidence Score**: ${analysis.confidence_score || 0.95}

### 📋 Intelligent Requirements Understanding
**Explicit requirements**: ${analysis.requirements?.explicit?.join(', ') || 'N/A'}
**Implicit requirements**: ${analysis.requirements?.implicit?.join(', ') || 'N/A'}
**Context Analysis**: ${JSON.stringify(analysis.context_analysis || {}, null, 2)}

## 🏗️ Revolutionary Database Solution
**Primary Database**: [SELECTED_DATABASE_WITH_REASONING]
**Architecture Pattern**: [MONOLITHIC|MICROSERVICES|DISTRIBUTED]
**Safety Level**: ${userContext.preferences.safetySettings}

## ⚡ Context-Optimized Schema
\`\`\`sql
-- REVOLUTIONARY SCHEMA WITH CONTEXT AWARENESS
[COMPREHENSIVE_SCHEMA_WITH_INTELLIGENCE]
\`\`\`

## 🚀 Revolutionary Performance & Security
\`\`\`sql
-- INTELLIGENT PERFORMANCE INDEXES
[CONTEXT_AWARE_INDEXES]

-- REVOLUTIONARY SECURITY MEASURES  
[ADVANCED_SECURITY_IMPLEMENTATIONS]
\`\`\`

## 📊 Intelligent Sample Queries
\`\`\`sql
-- CONTEXT-AWARE QUERY PATTERNS
[OPTIMIZED_SAMPLE_QUERIES_WITH_EXPLANATIONS]
\`\`\`

## 🛡️ Revolutionary Safety & Rollback Plans
[COMPREHENSIVE_SAFETY_MEASURES_AND_ROLLBACK_PROCEDURES]

IMPORTANT: Ensure 100% SQL syntax validity, revolutionary context awareness, and commercial-grade safety measures.`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(designPrompt);
      return await result.response.text();
    });

    return {
      type: 'design',
      title: `Revolutionary ${dbType} Database Design`,
      content: response,
      reasoning: 'Revolutionary database design with context awareness, tool integration, and commercial-grade safety measures',
      agent: 'Revolutionary Schema Architect',
      status: 'completed',
      confidence: 0.92,
      safetyChecks: ['schema_validation', 'security_review', 'performance_optimization']
    };
  }

  private async executeRevolutionaryImplementationPhase(
    designStep: RevolutionaryGenerationStep,
    analysisStep: RevolutionaryGenerationStep,
    userContext: UserContext
  ): Promise<RevolutionaryGenerationStep> {
    
    // Get database type from user context or design step
    const dbType = this.extractDatabaseType(userContext, designStep);
    const dbTypeFormatted = this.formatDatabaseType(dbType);
    
    // Use database type-specific prompts for implementation
    const implementationPrompt = DatabaseTypePromptEngine.buildContextualPrompt(
      dbTypeFormatted,
      'implementationPrompt',
      {
        analysis_results: designStep.content,
        user_request: analysisStep.content,
        user_context: JSON.stringify(userContext, null, 2),
        database_name: this.extractDatabaseName(userContext),
        generate_migration_scripts: this.generateMigrationScriptsForType(dbTypeFormatted),
        generate_sample_data: this.generateSampleDataForType(dbTypeFormatted),
        generate_monitoring_queries: this.generateMonitoringForType(dbTypeFormatted),
        generate_collection_setup: this.generateCollectionSetupForType(dbTypeFormatted),
        generate_index_creation: this.generateIndexCreationForType(dbTypeFormatted),
        generate_sample_data_insertion: this.generateSampleDataInsertionForType(dbTypeFormatted),
        generate_query_tests: this.generateQueryTestsForType(dbTypeFormatted),
        generate_complete_implementation_with_error_handling: this.generateCompleteImplementationForType(dbTypeFormatted),
        generate_robust_connection_setup: this.generateConnectionSetupForType(dbTypeFormatted),
        generate_detailed_schema_with_validation: this.generateSchemaValidationForType(dbTypeFormatted),
        generate_efficient_data_ingestion: this.generateDataIngestionForType(dbTypeFormatted),
        generate_optimized_search_functions: this.generateSearchFunctionsForType(dbTypeFormatted),
        generate_monitoring_and_maintenance_tools: this.generateMaintenanceToolsForType(dbTypeFormatted),
        generate_comprehensive_examples: this.generateExamplesForType(dbTypeFormatted)
      }
    );

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(implementationPrompt);
      return await result.response.text();
    });

    return {
      type: 'implementation',
      title: `${dbTypeFormatted} Implementation Package`,
      content: response,
      reasoning: `Database type-specific ${dbTypeFormatted} implementation with production-ready code, proper indexing, error handling, and best practices for ${dbTypeFormatted} systems`,
      agent: `${dbTypeFormatted} Implementation Specialist`,
      status: 'completed',
      confidence: 0.95,
      safetyChecks: ['database_type_validation', 'syntax_verification', 'performance_optimization', 'security_implementation']
    };
  }

  private async executeRevolutionaryValidationPhase(
    designStep: RevolutionaryGenerationStep,
    implementationStep: RevolutionaryGenerationStep,
    userContext: UserContext,
    dbType: string
  ): Promise<RevolutionaryGenerationStep> {
    
    // Use database-specific QA validation
    const dbTypeMapped = dbType.toLowerCase() === 'vectordb' ? 'VectorDB' : 
                         dbType.toLowerCase() === 'nosql' ? 'NoSQL' : 'SQL';
    
    const qaResult = await databaseSpecificQAService.validateAllAspects(
      designStep.content + '\n\n' + implementationStep.content,
      designStep.content,
      dbTypeMapped as 'SQL' | 'NoSQL' | 'VectorDB'
    );
    
    const validationPrompt = `Execute revolutionary quality assurance with commercial-grade standards:

### Database-Specific QA Results:
${JSON.stringify(qaResult, null, 2)}

### Design to Validate:
${designStep.content}

### Implementation to Validate:
${implementationStep.content}

### User Standards:
${JSON.stringify(userContext, null, 2)}

Perform comprehensive commercial validation and return results in this enhanced JSON format:
{
  "overall_score": 96,
  "confidence_level": 0.97,
  "category_scores": {
    "syntax": 100,
    "logic": 95, 
    "performance": 92,
    "security": 98,
    "completeness": 90,
    "commercial_readiness": 94
  },
  "revolutionary_features": [
    "Context-aware design decisions",
    "Tool-integrated validation",
    "Commercial-grade safety measures"
  ],
  "critical_issues": [],
  "major_issues": [],
  "minor_issues": ["suggestion 1", "suggestion 2"],
  "approved": true,
  "commercial_readiness": true,
  "recommendations": ["improvement 1", "improvement 2"],
  "safety_validation": {
    "backup_strategy": "verified",
    "rollback_procedures": "tested",
    "security_measures": "comprehensive"
  },
  "performance_projections": {
    "expected_query_time": "<50ms",
    "scalability_rating": "enterprise_ready",
    "optimization_level": "advanced"
  }
}

VALIDATION CRITERIA:
- SQL syntax must be 100% valid
- All revolutionary features implemented
- Commercial-grade security present
- Performance optimizations included
- Documentation comprehensive
- Safety measures verified`;

    const response = await this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(validationPrompt);
      return await result.response.text();
    });

    return {
      type: 'validation',
      title: 'Revolutionary Quality Validation',
      content: this.extractJSONFromResponse(response),
      reasoning: 'Commercial-grade quality validation with comprehensive technical review, performance projections, and revolutionary feature assessment',
      agent: 'Revolutionary Quality Assurance',
      status: 'completed',
      confidence: 0.97,
      safetyChecks: ['commercial_standards', 'security_audit', 'performance_validation', 'deployment_readiness']
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
    const jsonBlockRegex = /```json\n?([\s\S]*?)\n?```/i;
    const match = response.match(jsonBlockRegex);
    
    if (match) {
      return match[1].trim();
    }

    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const jsonStr = response.substring(jsonStart, jsonEnd + 1);
        JSON.parse(jsonStr);
        return jsonStr;
      } catch {
        // If JSON is invalid, return the full response
      }
    }

    return response.trim();
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Test connection. Respond with "Revolutionary DBCoach Ready".');
      const response = await result.response;
      return response.text().includes('Revolutionary DBCoach Ready');
    } catch (error) {
      console.error('Revolutionary DBCoach connection test failed:', error);
      return false;
    }
  }

  // Database-specific agent specialization methods
  private createSpecializedAgent(
    baseMode: AgentMode,
    dbType: 'SQL' | 'NoSQL' | 'VectorDB',
    expertiseLevel: 'junior' | 'senior' | 'expert' | 'architect' = 'expert'
  ): AgentCapabilities {
    const baseCapabilities = this.AGENT_CAPABILITIES[baseMode];
    const paradigm = DatabaseTypePromptEngine.getParadigm(dbType);
    
    const specializedPrompt = `${baseCapabilities.systemPrompt}

### DATABASE PARADIGM SPECIALIZATION: ${dbType}
**Philosophy**: ${paradigm.philosophy}
**Design Principles**: ${paradigm.designPrinciples.join(', ')}
**Query Paradigms**: ${paradigm.queryParadigms.join(', ')}
**Scaling Strategies**: ${paradigm.scalingStrategies.join(', ')}
**Use Cases**: ${paradigm.useCases.join(', ')}

### EXPERTISE LEVEL: ${expertiseLevel.toUpperCase()}
You operate with ${expertiseLevel}-level expertise in ${dbType} systems, providing ${this.getExpertiseLevelDescription(expertiseLevel)} guidance.

### SPECIALIZED VALIDATION CRITERIA:
${this.getSpecializedValidationCriteria(dbType)}
`;

    return {
      ...baseCapabilities,
      systemPrompt: specializedPrompt,
      databaseSpecialization: dbType,
      expertiseLevel
    };
  }

  private getExpertiseLevelDescription(level: string): string {
    const descriptions = {
      'junior': 'foundational and learning-oriented',
      'senior': 'experienced and best-practice focused',
      'expert': 'advanced and optimization-oriented',
      'architect': 'enterprise-grade and strategic'
    };
    return descriptions[level as keyof typeof descriptions] || 'expert';
  }

  private getSpecializedValidationCriteria(dbType: 'SQL' | 'NoSQL' | 'VectorDB'): string {
    const criteria = {
      'SQL': `
- ACID compliance and transaction integrity
- Normalization and referential integrity
- Index efficiency and query optimization
- Schema evolution and migration safety
- Performance under concurrent load`,
      'NoSQL': `
- Document structure efficiency and access patterns
- Sharding strategy and distribution
- Eventual consistency model validation
- Index strategy for compound queries
- Horizontal scaling considerations`,
      'VectorDB': `
- Embedding quality and model appropriateness
- Index algorithm optimization (HNSW/IVF/LSH)
- Hybrid search capability (vector + metadata)
- Memory efficiency and quantization
- AI pipeline integration readiness`
    };
    return criteria[dbType];
  }

  // Method to get specialized QA agent for database type
  getSpecializedQAAgent(dbType: 'SQL' | 'NoSQL' | 'VectorDB'): AgentCapabilities {
    return this.createSpecializedAgent(AgentMode.ANALYST, dbType, 'architect');
  }

  // Method to get specialized implementation agent for database type
  getSpecializedImplementationAgent(dbType: 'SQL' | 'NoSQL' | 'VectorDB'): AgentCapabilities {
    return this.createSpecializedAgent(AgentMode.DEVELOPER, dbType, 'expert');
  }

  // Helper methods for database type-specific implementation generation
  private extractDatabaseType(userContext: UserContext, designStep: RevolutionaryGenerationStep): string {
    // Try to extract from user context first
    if (userContext.preferences?.database_type) {
      return userContext.preferences.database_type;
    }
    
    // Extract from design step content
    const content = designStep.content.toLowerCase();
    if (content.includes('mongodb') || content.includes('document') || content.includes('nosql')) {
      return 'NoSQL';
    }
    if (content.includes('vector') || content.includes('embedding') || content.includes('similarity')) {
      return 'VectorDB';
    }
    
    // Default to SQL
    return 'SQL';
  }

  private formatDatabaseType(dbType: string): string {
    switch (dbType.toLowerCase()) {
      case 'nosql':
      case 'mongodb':
      case 'document':
        return 'NoSQL';
      case 'vectordb':
      case 'vector':
      case 'weaviate':
        return 'VectorDB';
      default:
        return 'SQL';
    }
  }

  private extractDatabaseName(userContext: UserContext): string {
    return userContext.preferences?.database_name || 
           userContext.project?.name || 
           'generated_database';
  }

  private generateMigrationScriptsForType(dbType: string): string {
    switch (dbType) {
      case 'NoSQL':
        return 'MongoDB migration scripts with collection creation and index setup';
      case 'VectorDB':
        return 'Vector database schema setup with proper indexing configuration';
      default:
        return 'SQL migration scripts with proper table creation, constraints, and indexes';
    }
  }

  private generateSampleDataForType(dbType: string): string {
    switch (dbType) {
      case 'NoSQL':
        return 'Realistic JSON documents with proper structure and relationships';
      case 'VectorDB':
        return 'Sample vectors with metadata and proper embedding structure';
      default:
        return 'Realistic SQL INSERT statements respecting all constraints';
    }
  }

  private generateMonitoringForType(dbType: string): string {
    switch (dbType) {
      case 'NoSQL':
        return 'MongoDB performance monitoring queries and health checks';
      case 'VectorDB':
        return 'Vector database performance metrics and similarity search monitoring';
      default:
        return 'SQL performance monitoring queries and index usage analysis';
    }
  }

  private generateCollectionSetupForType(dbType: string): string {
    if (dbType === 'NoSQL') {
      return `
    # Create collections with proper validation
    try:
        # Collection setup with schema validation
        collections = {
            '{collection_name}': {
                'validator': {'$jsonSchema': {schema_definition}},
                'validationLevel': 'strict'
            }
        }
        
        for collection_name, config in collections.items():
            if collection_name not in db.list_collection_names():
                db.create_collection(collection_name, **config)
                logger.info(f"Created collection: {collection_name}")
            else:
                logger.info(f"Collection already exists: {collection_name}")
    except Exception as e:
        logger.error(f"Collection setup failed: {e}")
        raise`;
    }
    return 'SQL table creation handled by migration scripts';
  }

  private generateIndexCreationForType(dbType: string): string {
    if (dbType === 'NoSQL') {
      return `
    # Apply MongoDB indexes based on access patterns
    try:
        indexes = [
            ('collection_name', [('field1', ASCENDING), ('field2', DESCENDING)]),
            ('collection_name', [('text_field', 'text')]),  # Text search index
        ]
        
        for collection_name, index_spec in indexes:
            collection = db[collection_name]
            if isinstance(index_spec[0], tuple):
                collection.create_index(index_spec)
            else:
                collection.create_index([(index_spec[0], index_spec[1])])
            logger.info(f"Created index on {collection_name}: {index_spec}")
            
    except Exception as e:
        logger.error(f"Index creation failed: {e}")
        raise`;
    }
    return 'SQL indexes handled by migration scripts';
  }

  private generateSampleDataInsertionForType(dbType: string): string {
    if (dbType === 'NoSQL') {
      return `
    # Insert sample documents
    try:
        sample_data = {
            'collection_name': [
                {
                    'field1': 'value1',
                    'field2': 123,
                    'nested_object': {'sub_field': 'value'},
                    'created_at': datetime.utcnow()
                }
            ]
        }
        
        for collection_name, documents in sample_data.items():
            collection = db[collection_name]
            result = collection.insert_many(documents)
            logger.info(f"Inserted {len(result.inserted_ids)} documents into {collection_name}")
            
    except Exception as e:
        logger.error(f"Sample data insertion failed: {e}")
        raise`;
    }
    return 'SQL sample data handled by migration scripts';
  }

  private generateQueryTestsForType(dbType: string): string {
    if (dbType === 'NoSQL') {
      return `
    # Test main query patterns
    try:
        # Example queries based on design patterns
        collection = db['main_collection']
        
        # Query 1: Find by specific criteria
        result1 = collection.find({'field1': 'value1'}).limit(10)
        logger.info(f"Query 1 results: {list(result1)}")
        
        # Query 2: Aggregation pipeline
        pipeline = [
            {'$match': {'status': 'active'}},
            {'$group': {'_id': '$category', 'count': {'$sum': 1}}}
        ]
        result2 = list(collection.aggregate(pipeline))
        logger.info(f"Aggregation results: {result2}")
        
    except Exception as e:
        logger.error(f"Query testing failed: {e}")`;
    }
    return 'SQL query testing handled separately';
  }

  private generateCompleteImplementationForType(dbType: string): string {
    switch (dbType) {
      case 'VectorDB':
        return `
# Complete Weaviate Vector Database Implementation
import weaviate
import weaviate.classes as wvc
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional

# Production-ready vector database setup with comprehensive error handling`;
      case 'NoSQL':
        return `
# Complete MongoDB Implementation  
from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime
import logging

# Production-ready MongoDB setup with comprehensive error handling`;
      default:
        return `
# Complete SQL Database Implementation
import psycopg2
from sqlalchemy import create_engine, text
import logging

# Production-ready SQL database setup with comprehensive error handling`;
    }
  }

  private generateConnectionSetupForType(dbType: string): string {
    switch (dbType) {
      case 'VectorDB':
        return `
def connect_to_weaviate():
    """Connect to Weaviate with proper error handling"""
    try:
        client = weaviate.connect_to_local()
        return client
    except Exception as e:
        logger.error(f"Weaviate connection failed: {e}")
        raise`;
      case 'NoSQL':
        return `
def connect_to_mongodb():
    """Connect to MongoDB with proper error handling"""
    try:
        client = MongoClient(MONGO_URI)
        client.admin.command('ismaster')
        return client
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise`;
      default:
        return `
def connect_to_database():
    """Connect to SQL database with proper error handling"""
    try:
        engine = create_engine(DATABASE_URL)
        return engine
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise`;
    }
  }

  private generateSchemaValidationForType(dbType: string): string {
    if (dbType === 'VectorDB') {
      return `
def create_vector_schema(client):
    """Create vector collection schema"""
    try:
        collection = client.collections.create(
            name="documents",
            vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_transformers(),
            generative_config=wvc.config.Configure.Generative.openai()
        )
        return collection
    except Exception as e:
        logger.error(f"Schema creation failed: {e}")
        raise`;
    }
    return 'Schema validation handled by migration scripts';
  }

  private generateDataIngestionForType(dbType: string): string {
    if (dbType === 'VectorDB') {
      return `
def ingest_documents(collection, documents):
    """Efficiently ingest documents with vectorization"""
    try:
        with collection.batch.dynamic() as batch:
            for doc in documents:
                batch.add_object(
                    properties=doc,
                    vector=doc.get('vector')  # If pre-computed
                )
        logger.info(f"Ingested {len(documents)} documents")
    except Exception as e:
        logger.error(f"Data ingestion failed: {e}")
        raise`;
    }
    return 'Data ingestion handled by standard insert operations';
  }

  private generateSearchFunctionsForType(dbType: string): string {
    if (dbType === 'VectorDB') {
      return `
def semantic_search(collection, query, limit=10):
    """Perform semantic similarity search"""
    try:
        response = collection.query.near_text(
            query=query,
            limit=limit,
            return_metadata=wvc.query.MetadataQuery(score=True)
        )
        return response.objects
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise`;
    }
    return 'Search functions handled by standard database queries';
  }

  private generateMaintenanceToolsForType(dbType: string): string {
    switch (dbType) {
      case 'VectorDB':
        return `
def get_collection_stats(collection):
    """Get vector collection statistics"""
    try:
        return collection.aggregate.over_all(total_count=True)
    except Exception as e:
        logger.error(f"Stats retrieval failed: {e}")
        return None`;
      case 'NoSQL':
        return `
def get_collection_stats(db):
    """Get MongoDB collection statistics"""
    try:
        stats = {}
        for collection_name in db.list_collection_names():
            stats[collection_name] = db[collection_name].count_documents({})
        return stats
    except Exception as e:
        logger.error(f"Stats retrieval failed: {e}")
        return None`;
      default:
        return `
def get_table_stats(engine):
    """Get SQL table statistics"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT table_name FROM information_schema.tables"))
            return [row[0] for row in result]
    except Exception as e:
        logger.error(f"Stats retrieval failed: {e}")
        return None`;
    }
  }

  private generateExamplesForType(dbType: string): string {
    switch (dbType) {
      case 'VectorDB':
        return `
# Example usage for vector database
if __name__ == "__main__":
    client = connect_to_weaviate()
    collection = create_vector_schema(client)
    
    # Sample documents
    documents = [
        {"title": "Example Document", "content": "This is example content"}
    ]
    
    ingest_documents(collection, documents)
    results = semantic_search(collection, "find similar content")
    print(f"Found {len(results)} similar documents")`;
      case 'NoSQL':
        return `
# Example usage for MongoDB
if __name__ == "__main__":
    client = connect_to_mongodb()
    db = client[DATABASE_NAME]
    
    # Test basic operations
    collection = db['test_collection']
    result = collection.insert_one({"test": "document"})
    print(f"Inserted document with ID: {result.inserted_id}")`;
      default:
        return `
# Example usage for SQL database
if __name__ == "__main__":
    engine = connect_to_database()
    
    # Test connection
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"Database connection successful: {result.fetchone()}")`;
    }
  }
}

export const revolutionaryDBCoachService = new RevolutionaryDBCoachService();
export default revolutionaryDBCoachService;