import { GoogleGenerativeAI } from '@google/generative-ai';

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
      // Step 1: Generate Schema
      onProgress?.({ 
        step: 'schema', 
        reasoning: 'Analyzing your requirements and designing the database structure...', 
        isComplete: false 
      });
      
      const schemaStep = await this.generateSchema(prompt, dbType);
      steps.push(schemaStep);
      
      onProgress?.({ 
        step: 'schema', 
        reasoning: 'Database schema generated successfully!', 
        isComplete: true 
      });

      // Step 2: Generate Sample Data
      onProgress?.({ 
        step: 'data', 
        reasoning: 'Creating realistic sample data for your database...', 
        isComplete: false 
      });
      
      const dataStep = await this.generateSampleData(prompt, dbType, schemaStep.content);
      steps.push(dataStep);
      
      onProgress?.({ 
        step: 'data', 
        reasoning: 'Sample data generated with realistic examples!', 
        isComplete: true 
      });

      // Step 3: Generate API Endpoints
      onProgress?.({ 
        step: 'api', 
        reasoning: 'Building REST API endpoints for your database...', 
        isComplete: false 
      });
      
      const apiStep = await this.generateAPIEndpoints(prompt, dbType, schemaStep.content);
      steps.push(apiStep);
      
      onProgress?.({ 
        step: 'api', 
        reasoning: 'Complete REST API documentation ready!', 
        isComplete: true 
      });

      // Step 4: Generate Visualization
      onProgress?.({ 
        step: 'visualization', 
        reasoning: 'Creating database visualization and ER diagram...', 
        isComplete: false 
      });
      
      const vizStep = await this.generateVisualization(prompt, dbType, schemaStep.content);
      steps.push(vizStep);
      
      onProgress?.({ 
        step: 'visualization', 
        reasoning: 'Database design complete with visual representation!', 
        isComplete: true 
      });

      return steps;
    } catch (error) {
      console.error('Database generation failed:', error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    return `You are an expert database designer. Generate a ${dbType} database schema based on this requirement:

"${prompt}"

REQUIREMENTS:
1. Design a production-ready ${dbType} database schema
2. Include proper relationships, constraints, and indexes
3. Use appropriate data types and naming conventions
4. Add comments explaining design decisions
5. Ensure scalability and performance optimization

RESPONSE FORMAT:
Provide your reasoning first, then the complete schema code.

For SQL databases:
- Use CREATE TABLE statements
- Include PRIMARY KEY, FOREIGN KEY constraints  
- Add appropriate indexes for performance
- Use proper data types (VARCHAR, INTEGER, TIMESTAMP, etc.)

For NoSQL databases:
- Provide document/collection structure
- Include sample document schemas
- Explain indexing strategy

For VectorDB:
- Design vector storage schema
- Include metadata structure
- Specify embedding dimensions and types

Start your response with "REASONING:" followed by your design thinking, then "SCHEMA:" followed by the code.`;
  }

  private buildSampleDataPrompt(prompt: string, dbType: string, schema: string): string {
    return `Generate realistic sample data for this ${dbType} database schema:

SCHEMA:
${schema}

ORIGINAL REQUIREMENT: "${prompt}"

REQUIREMENTS:
1. Create realistic, diverse sample data that reflects real-world usage
2. Maintain referential integrity between related tables/documents
3. Include edge cases and varied data patterns
4. Generate at least 10-20 records per main entity
5. Use realistic names, dates, and business-relevant content

RESPONSE FORMAT:
Return the data in the most appropriate format for ${dbType}:
- SQL: INSERT statements
- NoSQL: JSON documents  
- VectorDB: Documents with embeddings

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
    const reasoningMarker = response.indexOf('REASONING:');
    const schemaMarker = response.indexOf('SCHEMA:');
    
    if (reasoningMarker !== -1 && schemaMarker !== -1) {
      return response.substring(reasoningMarker + 10, schemaMarker).trim();
    }
    
    if (reasoningMarker !== -1) {
      return response.substring(reasoningMarker + 10).trim();
    }
    
    // Fallback: return first paragraph
    const firstParagraph = response.split('\n\n')[0];
    return firstParagraph.trim();
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
}

export const geminiService = new GeminiService();
export default geminiService;