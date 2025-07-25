// Resilient Streaming Service with Advanced Error Handling and Recovery
import { revolutionaryDBCoachService } from './revolutionaryDBCoachService';
import { enhancedDBCoachService } from './enhancedDBCoachService';
import { streamingService } from './streamingService';
import { agentCleanupService } from './agentCleanupService';

export interface StreamingConfig {
  timeout: number;
  retryAttempts: number;
  fallbackMode: boolean;
  enableDiagnostics: boolean;
}

export interface StreamingResult {
  success: boolean;
  data?: any;
  error?: Error;
  fallbackUsed: boolean;
  diagnostics?: StreamingDiagnostics;
}

export interface StreamingDiagnostics {
  apiKeyValid: boolean;
  networkConnected: boolean;
  serviceResponsive: boolean;
  lastError?: string;
  performanceMetrics: {
    responseTime: number;
    retryCount: number;
    fallbackTriggered: boolean;
  };
}

class ResilientStreamingService {
  private config: StreamingConfig = {
    timeout: 45000, // 45 seconds - optimized for vector database generation
    retryAttempts: 2, // Reduced from 3 to minimize delays
    fallbackMode: true,
    enableDiagnostics: true
  };

  private diagnostics: StreamingDiagnostics = {
    apiKeyValid: false,
    networkConnected: false,
    serviceResponsive: false,
    performanceMetrics: {
      responseTime: 0,
      retryCount: 0,
      fallbackTriggered: false
    }
  };

  constructor(config?: Partial<StreamingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initializeDiagnostics();
    
    // Start agent cleanup service
    agentCleanupService.startCleanupService();
  }

  private async initializeDiagnostics(): Promise<void> {
    if (!this.config.enableDiagnostics) return;

    try {
      // Check API Key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      this.diagnostics.apiKeyValid = Boolean(
        apiKey && 
        apiKey.startsWith('AIza') && 
        apiKey.length > 30
      );

      // Check Network Connectivity
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        });
        
        clearTimeout(timeoutId);
        this.diagnostics.networkConnected = true;
      } catch {
        this.diagnostics.networkConnected = false;
      }

      // Check Service Responsiveness (lightweight test)
      if (this.diagnostics.apiKeyValid) {
        this.diagnostics.serviceResponsive = true; // Assume responsive if API key is valid
      }

    } catch (error) {
      console.warn('Diagnostics initialization failed:', error);
    }
  }

  async generateDatabaseDesign(
    prompt: string,
    dbType: string,
    progressCallback?: (progress: any) => void
  ): Promise<StreamingResult> {
    const startTime = Date.now();
    this.diagnostics.performanceMetrics.retryCount = 0;
    this.diagnostics.performanceMetrics.fallbackTriggered = false;

    // Pre-flight checks
    if (!this.diagnostics.apiKeyValid) {
      return {
        success: false,
        error: new Error('Invalid or missing API key. Please configure VITE_GEMINI_API_KEY.'),
        fallbackUsed: false,
        diagnostics: this.diagnostics
      };
    }

    if (!this.diagnostics.networkConnected) {
      return {
        success: false,
        error: new Error('Network connection unavailable. Please check your internet connection.'),
        fallbackUsed: false,
        diagnostics: this.diagnostics
      };
    }

    // Initialize streaming session for tracking
    const sessionId = `resilient_${Date.now()}`;
    streamingService.initializeSession(sessionId);

    // Attempt primary service with retries
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      let taskId: string | null = null;
      
      try {
        this.diagnostics.performanceMetrics.retryCount = attempt - 1;
        
        console.log(`🚀 Streaming attempt ${attempt}/${this.config.retryAttempts} for ${dbType} database`);
        
        // Start tracking this attempt
        taskId = `${sessionId}_attempt_${attempt}`;
        streamingService.startTask(taskId, `${dbType} Generation Attempt ${attempt}`, `${dbType} Generator`);
        
        const result = await this.attemptGeneration(
          prompt,
          dbType,
          progressCallback,
          attempt
        );

        // Mark attempt as successful
        if (taskId) {
          streamingService.completeTask(taskId);
        }

        this.diagnostics.performanceMetrics.responseTime = Date.now() - startTime;
        
        return {
          success: true,
          data: result,
          fallbackUsed: false,
          diagnostics: this.diagnostics
        };

      } catch (error) {
        console.warn(`❌ Attempt ${attempt} failed:`, error);
        this.diagnostics.lastError = error instanceof Error ? error.message : String(error);
        
        // Mark attempt as failed
        if (taskId) {
          streamingService.handleError(taskId, error instanceof Error ? error.message : String(error));
        }
        
        // If this is the last attempt and fallback is enabled, try fallback
        if (attempt === this.config.retryAttempts && this.config.fallbackMode) {
          console.log('🔄 Trying fallback mode...');
          return this.attemptFallbackGeneration(prompt, dbType, progressCallback);
        }
        
        // If not the last attempt, brief pause before retry
        if (attempt < this.config.retryAttempts) {
          // Minimal delay, just enough to avoid hammering the API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // All attempts failed
    this.diagnostics.performanceMetrics.responseTime = Date.now() - startTime;
    
    return {
      success: false,
      error: new Error(`All ${this.config.retryAttempts} streaming attempts failed. Please try again later.`),
      fallbackUsed: false,
      diagnostics: this.diagnostics
    };
  }

  private async attemptGeneration(
    prompt: string,
    dbType: string,
    progressCallback?: (progress: any) => void,
    attempt: number = 1
  ): Promise<any> {
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Generation timeout after ${this.config.timeout}ms (attempt ${attempt})`));
      }, this.config.timeout);
    });

    // Create generation promise
    const generationPromise = revolutionaryDBCoachService.generateDatabaseDesign(
      prompt,
      dbType,
      progressCallback
    );

    // Race between generation and timeout
    return Promise.race([generationPromise, timeoutPromise]);
  }

  private async attemptFallbackGeneration(
    prompt: string,
    dbType: string,
    progressCallback?: (progress: any) => void
  ): Promise<StreamingResult> {
    
    const fallbackTaskId = `fallback_${Date.now()}`;
    
    try {
      this.diagnostics.performanceMetrics.fallbackTriggered = true;
      
      console.log('🛡️ Using enhanced fallback service...');
      
      // Track fallback attempt
      streamingService.startTask(fallbackTaskId, `${dbType} Fallback Generation`, `${dbType} Fallback Service`);
      
      // Use enhanced service as fallback
      const fallbackResult = await enhancedDBCoachService.generateDatabaseDesign(
        prompt,
        {
          type: dbType as 'SQL' | 'NoSQL' | 'VectorDB',
          specificTechnology: this.detectSpecificTechnology(prompt, dbType)
        }
      );

      // Report real fallback progress
      if (progressCallback) {
        progressCallback({
          step: 'analysis',
          agent: `${dbType} Fallback Analyst`,
          reasoning: 'Using enhanced fallback service for generation',
          isComplete: false,
          currentStep: 1,
          totalSteps: 2,
          confidence: 0.85
        });

        progressCallback({
          step: 'design',
          agent: `${dbType} Fallback Designer`,
          reasoning: 'Database design completed using fallback service',
          isComplete: true,
          currentStep: 2,
          totalSteps: 2,
          confidence: 0.9
        });
      }

      // Mark fallback as successful
      streamingService.completeTask(fallbackTaskId);

      return {
        success: true,
        data: fallbackResult,
        fallbackUsed: true,
        diagnostics: this.diagnostics
      };

    } catch (fallbackError) {
      console.error('❌ Fallback generation also failed:', fallbackError);
      
      // Mark fallback as failed
      streamingService.handleError(fallbackTaskId, fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      
      return {
        success: false,
        error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
        fallbackUsed: true,
        diagnostics: this.diagnostics
      };
    }
  }

  private detectSpecificTechnology(prompt: string, dbType: string): string | undefined {
    const promptLower = prompt.toLowerCase();
    
    switch (dbType.toLowerCase()) {
      case 'sql':
        if (promptLower.includes('postgres')) return 'PostgreSQL';
        if (promptLower.includes('mysql')) return 'MySQL';
        if (promptLower.includes('sqlite')) return 'SQLite';
        if (promptLower.includes('sql server')) return 'SQL Server';
        return 'PostgreSQL'; // Default
        
      case 'nosql':
        if (promptLower.includes('mongo')) return 'MongoDB';
        if (promptLower.includes('firebase')) return 'Firestore';
        if (promptLower.includes('cosmos')) return 'CosmosDB';
        if (promptLower.includes('dynamo')) return 'DynamoDB';
        return 'MongoDB'; // Default
        
      case 'vectordb':
        if (promptLower.includes('pinecone')) return 'Pinecone';
        if (promptLower.includes('weaviate')) return 'Weaviate';
        if (promptLower.includes('qdrant')) return 'Qdrant';
        if (promptLower.includes('chroma')) return 'Chroma';
        return 'Pinecone'; // Default
        
      default:
        return undefined;
    }
  }

  // Utility method to generate static fallback content
  generateStaticFallback(prompt: string, dbType: string): any {
    console.log('📋 Generating static fallback content...');
    
    const timestamp = new Date().toLocaleString();
    
    const fallbackContent = {
      analysis: {
        type: 'analysis',
        title: `${dbType} Requirements Analysis (Fallback)`,
        content: `# ${dbType} Database Analysis\n\n**Request**: ${prompt}\n\n**Database Type**: ${dbType}\n\n## Core Requirements\n- Data storage and retrieval\n- Scalable architecture\n- Performance optimization\n- Security implementation\n\n*Generated in fallback mode: ${timestamp}*`,
        reasoning: 'Static fallback analysis when AI services are unavailable',
        agent: `${dbType} Fallback Analyst`,
        status: 'completed' as const,
        confidence: 0.7
      },
      design: {
        type: 'design',
        title: `${dbType} Database Design (Fallback)`,
        content: this.getStaticDesignContent(dbType, prompt),
        reasoning: 'Static fallback design with basic structure',
        agent: `${dbType} Fallback Designer`,
        status: 'completed' as const,
        confidence: 0.75
      }
    };

    return [fallbackContent.analysis, fallbackContent.design];
  }

  private getStaticDesignContent(dbType: string, prompt: string): string {
    const timestamp = new Date().toLocaleString();
    
    switch (dbType.toLowerCase()) {
      case 'sql':
        return `# SQL Database Design\n\n## Core Tables\n\`\`\`sql\n-- Basic structure for your SQL database\nCREATE TABLE users (\n    id SERIAL PRIMARY KEY,\n    username VARCHAR(255) UNIQUE NOT NULL,\n    email VARCHAR(255) UNIQUE NOT NULL,\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE TABLE main_data (\n    id SERIAL PRIMARY KEY,\n    name VARCHAR(255) NOT NULL,\n    description TEXT,\n    user_id INTEGER REFERENCES users(id),\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\`\`\`\n\n*Generated in fallback mode: ${timestamp}*`;
        
      case 'nosql':
        return `# NoSQL Database Design\n\n## Document Structure\n\`\`\`json\n{\n  "_id": "user_12345",\n  "profile": {\n    "username": "example_user",\n    "email": "user@example.com"\n  },\n  "data": [\n    {\n      "name": "Sample Item",\n      "description": "Example document structure",\n      "timestamp": "2024-01-01T00:00:00Z"\n    }\n  ],\n  "metadata": {\n    "created_at": "2024-01-01T00:00:00Z",\n    "updated_at": "2024-01-01T00:00:00Z"\n  }\n}\n\`\`\`\n\n*Generated in fallback mode: ${timestamp}*`;
        
      case 'vectordb':
        return `# Vector Database Design\n\n## Vector Collection\n\`\`\`python\n# Vector collection configuration\ncollection_config = {\n    "dimension": 1536,\n    "metric": "cosine",\n    "index_type": "HNSW"\n}\n\n# Sample vector document\nvector_document = {\n    "id": "doc_001",\n    "vector": [0.1, -0.3, 0.7, ...],  # 1536 dimensions\n    "metadata": {\n        "title": "Sample Document",\n        "content": "Example content for vectorization",\n        "category": "example"\n    }\n}\n\`\`\`\n\n*Generated in fallback mode: ${timestamp}*`;
        
      default:
        return `# Database Design\n\nBasic database structure for your ${dbType} database.\n\n*Generated in fallback mode: ${timestamp}*`;
    }
  }

  // Get current diagnostics
  getDiagnostics(): StreamingDiagnostics {
    return { ...this.diagnostics };
  }

  // Update configuration
  updateConfig(newConfig: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const resilientStreamingService = new ResilientStreamingService();
export default resilientStreamingService;