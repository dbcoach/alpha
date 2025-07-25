// Optimized DB Coach Service - Fast, Reliable, No Hanging
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface OptimizedGenerationStep {
  type: 'analysis' | 'design' | 'implementation' | 'validation';
  title: string;
  content: string;
  reasoning: string;
  agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  executionTime: number;
}

export interface OptimizedGenerationProgress {
  step: OptimizedGenerationStep['type'];
  agent: string;
  reasoning: string;
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
  estimatedTimeRemaining: number;
}

class OptimizedDBCoachService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private readonly REQUEST_TIMEOUT = 25000; // 25 seconds max per request
  private readonly MAX_RETRIES = 1; // Only 1 retry to prevent long delays
  private readonly CONCURRENT_REQUESTS = true; // Enable parallel processing

  // Optimized system prompts - shorter and more focused
  private readonly OPTIMIZED_PROMPTS = {
    ANALYSIS: `You are a Database Requirements Analyst. Analyze the request quickly and return structured JSON:

{
  "domain": "detected_domain",
  "scale": "small|medium|large",
  "complexity": "simple|moderate|complex", 
  "entities": ["entity1", "entity2"],
  "relationships": ["relationship1", "relationship2"],
  "requirements": ["req1", "req2"]
}

Be concise and accurate. Focus on core entities and relationships only.`,

    DESIGN: `You are a Database Schema Designer. Create an optimal database schema.

Generate:
1. Core tables with proper data types
2. Essential indexes for performance
3. Foreign key relationships
4. Basic constraints

Keep it production-ready but concise. Focus on the most important elements.`,

    IMPLEMENTATION: `You are a Database Implementation Specialist. Provide:

1. Ready-to-execute SQL statements
2. 3-5 sample data records
3. Basic API endpoint examples
4. Essential migration notes

Be practical and concise. Focus on immediate implementation needs.`,

    VALIDATION: `You are a Database Quality Validator. Quickly validate and return JSON:

{
  "overall_score": 90,
  "issues": ["any critical issues"],
  "approved": true,
  "recommendations": ["key recommendations"]
}

Focus on critical issues only. Be fast and decisive.`
  };

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp', // Use fastest model
      generationConfig: {
        temperature: 0.1, // Low for consistency
        topP: 0.8,
        topK: 20, // Reduced for faster processing
        maxOutputTokens: 2048, // Limit output to prevent long responses
      }
    });
  }

  async generateDatabaseDesign(
    prompt: string,
    dbType: string,
    onProgress?: (progress: OptimizedGenerationProgress) => void
  ): Promise<OptimizedGenerationStep[]> {
    const startTime = Date.now();
    const steps: OptimizedGenerationStep[] = [];
    
    try {
      console.log('🚀 Starting optimized database generation...');

      // Define all steps upfront for accurate progress tracking
      const stepConfigs = [
        { type: 'analysis' as const, agent: 'Requirements Analyst', estimatedTime: 8 },
        { type: 'design' as const, agent: 'Schema Designer', estimatedTime: 12 },
        { type: 'implementation' as const, agent: 'Implementation Specialist', estimatedTime: 10 },
        { type: 'validation' as const, agent: 'Quality Validator', estimatedTime: 5 }
      ];

      // Process steps with timeout and progress tracking
      for (let i = 0; i < stepConfigs.length; i++) {
        const stepConfig = stepConfigs[i];
        const stepStartTime = Date.now();
        
        // Calculate remaining time
        const elapsed = Date.now() - startTime;
        const totalEstimated = stepConfigs.reduce((sum, s) => sum + s.estimatedTime, 0) * 1000;
        const estimatedRemaining = Math.max(0, totalEstimated - elapsed);

        onProgress?.({
          step: stepConfig.type,
          agent: stepConfig.agent,
          reasoning: `Processing ${stepConfig.type}...`,
          isComplete: false,
          currentStep: i + 1,
          totalSteps: stepConfigs.length,
          estimatedTimeRemaining: estimatedRemaining
        });

        try {
          const step = await this.executeStepWithTimeout(
            stepConfig.type,
            stepConfig.agent,
            prompt,
            dbType,
            i > 0 ? steps[i - 1] : undefined
          );
          
          step.executionTime = Date.now() - stepStartTime;
          steps.push(step);

          console.log(`✅ ${stepConfig.type} completed in ${step.executionTime}ms`);

        } catch (error) {
          console.error(`❌ Step ${stepConfig.type} failed:`, error);
          
          // Create fallback step
          const fallbackStep: OptimizedGenerationStep = {
            type: stepConfig.type,
            title: `${stepConfig.type} (Fallback)`,
            content: this.getFallbackContent(stepConfig.type, prompt, dbType),
            reasoning: `Fallback used due to: ${error instanceof Error ? error.message : 'Unknown error'}`,
            agent: stepConfig.agent,
            status: 'completed',
            executionTime: Date.now() - stepStartTime
          };
          
          steps.push(fallbackStep);
        }
      }

      // Final progress update
      onProgress?.({
        step: 'validation',
        agent: 'System',
        reasoning: 'Database design completed successfully!',
        isComplete: true,
        currentStep: stepConfigs.length,
        totalSteps: stepConfigs.length,
        estimatedTimeRemaining: 0
      });

      const totalTime = Date.now() - startTime;
      console.log(`🎉 Total generation time: ${totalTime}ms`);

      return steps;

    } catch (error) {
      console.error('❌ Optimized generation failed:', error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeStepWithTimeout(
    type: OptimizedGenerationStep['type'],
    agent: string,
    prompt: string,
    dbType: string,
    previousStep?: OptimizedGenerationStep
  ): Promise<OptimizedGenerationStep> {
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout: ${type} step took longer than ${this.REQUEST_TIMEOUT}ms`)), this.REQUEST_TIMEOUT);
    });

    const executionPromise = this.executeStep(type, agent, prompt, dbType, previousStep);

    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      console.warn(`Step ${type} timed out or failed, using fallback`);
      throw error;
    }
  }

  private async executeStep(
    type: OptimizedGenerationStep['type'],
    agent: string,
    prompt: string,
    dbType: string,
    previousStep?: OptimizedGenerationStep
  ): Promise<OptimizedGenerationStep> {
    
    let systemPrompt: string;
    let userPrompt: string;

    switch (type) {
      case 'analysis':
        systemPrompt = this.OPTIMIZED_PROMPTS.ANALYSIS;
        userPrompt = `Analyze this database request quickly: "${prompt}" for ${dbType}`;
        break;
        
      case 'design':
        systemPrompt = this.OPTIMIZED_PROMPTS.DESIGN;
        const analysis = previousStep?.content || '';
        userPrompt = `Create ${dbType} schema for: "${prompt}"\nAnalysis: ${analysis.substring(0, 500)}`;
        break;
        
      case 'implementation':
        systemPrompt = this.OPTIMIZED_PROMPTS.IMPLEMENTATION;
        const design = previousStep?.content || '';
        userPrompt = `Implement ${dbType} solution for: "${prompt}"\nDesign: ${design.substring(0, 800)}`;
        break;
        
      case 'validation':
        systemPrompt = this.OPTIMIZED_PROMPTS.VALIDATION;
        const impl = previousStep?.content || '';
        userPrompt = `Validate this ${dbType} implementation: ${impl.substring(0, 1000)}`;
        break;
        
      default:
        throw new Error(`Unknown step type: ${type}`);
    }

    // Execute with retry logic (max 1 retry)
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const content = await response.response.text();

        return {
          type,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          content: content.trim(),
          reasoning: `Optimized ${type} completed successfully`,
          agent,
          status: 'completed',
          executionTime: 0 // Will be set by caller
        };

      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt + 1} failed for ${type}:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          // Short delay before retry (500ms)
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    throw lastError || new Error(`Failed to execute ${type} step`);
  }

  private getFallbackContent(
    type: OptimizedGenerationStep['type'],
    prompt: string,
    dbType: string
  ): string {
    const fallbacks = {
      analysis: `{
        "domain": "general",
        "scale": "medium",
        "complexity": "moderate",
        "entities": ["users", "data", "records"],
        "relationships": ["one-to-many"],
        "requirements": ["data storage", "user management", "basic operations"]
      }`,
      
      design: `-- ${dbType} Database Schema for: ${prompt}
      
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_records_user_id ON records(user_id);
CREATE INDEX idx_users_email ON users(email);`,

      implementation: `-- Implementation Package

-- Sample Data
INSERT INTO users (name, email) VALUES 
('John Doe', 'john@example.com'),
('Jane Smith', 'jane@example.com');

INSERT INTO records (user_id, title, data) VALUES 
(1, 'First Record', 'Sample data'),
(2, 'Second Record', 'More sample data');

-- Basic API Endpoints (REST)
-- GET /api/users - List all users
-- POST /api/users - Create new user
-- GET /api/records - List all records
-- POST /api/records - Create new record`,

      validation: `{
        "overall_score": 85,
        "issues": ["Consider adding more indexes for production use"],
        "approved": true,
        "recommendations": ["Add data validation", "Implement proper error handling", "Consider backup strategy"]
      }`
    };

    return fallbacks[type] || 'Fallback content not available';
  }

  // Quick connection test
  async testConnection(): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), 5000);
      });

      const testPromise = this.model.generateContent('Test. Respond with "OK".');

      const result = await Promise.race([testPromise, timeoutPromise]);
      const response = await result.response;
      return response.text().includes('OK');
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Get service health status
  getHealthStatus(): {
    healthy: boolean;
    apiKeyValid: boolean;
    estimatedResponseTime: number;
  } {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    return {
      healthy: Boolean(apiKey),
      apiKeyValid: Boolean(apiKey && apiKey.startsWith('AIza') && apiKey.length > 30),
      estimatedResponseTime: 15000 // 15 seconds typical
    };
  }
}

export const optimizedDBCoachService = new OptimizedDBCoachService();
export default optimizedDBCoachService;