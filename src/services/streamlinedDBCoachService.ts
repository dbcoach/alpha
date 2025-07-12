// Streamlined DB Coach Service - Single Execution, No Repetition
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatabaseTypePromptEngine } from './databaseTypePrompts';

export interface StreamlinedGenerationRequest {
  prompt: string;
  dbType: 'SQL' | 'NoSQL' | 'VectorDB';
  phase: 'design' | 'sample_data' | 'implementation';
}

export interface StreamlinedGenerationResult {
  content: string;
  confidence: number;
  agent: string;
  dbType: string;
  phase: string;
}

class StreamlinedDBCoachService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private executionCache = new Map<string, StreamlinedGenerationResult>();

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
        maxOutputTokens: 8192,
      }
    });
  }

  /**
   * Single execution point - prevents repeated agent runs
   * Uses caching to avoid duplicate generations
   */
  async generateDatabase(request: StreamlinedGenerationRequest): Promise<StreamlinedGenerationResult> {
    // Create cache key to prevent repeated execution
    const cacheKey = `${request.dbType}-${request.phase}-${this.hashString(request.prompt)}`;
    
    // Return cached result if available
    if (this.executionCache.has(cacheKey)) {
      console.log('🎯 Returning cached result, preventing repeated execution');
      return this.executionCache.get(cacheKey)!;
    }

    try {
      // Get appropriate prompt template for database type
      const promptTemplate = DatabaseTypePromptEngine.getPromptTemplate(request.dbType);
      let systemPrompt: string;
      let userPrompt: string;

      switch (request.phase) {
        case 'design':
          systemPrompt = promptTemplate.systemPrompt;
          userPrompt = promptTemplate.designPrompt.replace('{user_request}', request.prompt);
          break;
          
        case 'sample_data':
          systemPrompt = `You are a Data Generation Specialist. Create realistic sample data that conforms to the database schema.`;
          userPrompt = this.buildSampleDataPrompt(request.prompt, request.dbType);
          break;
          
        case 'implementation':
          systemPrompt = promptTemplate.systemPrompt;
          userPrompt = promptTemplate.implementationPrompt.replace('{analysis_results}', request.prompt);
          break;
          
        default:
          throw new Error(`Unknown phase: ${request.phase}`);
      }

      // Single AI execution - no repeats
      console.log(`🚀 Executing ${request.dbType} ${request.phase} generation`);
      const result = await this.model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      const content = await result.response.text();

      const generationResult: StreamlinedGenerationResult = {
        content,
        confidence: this.calculateConfidence(content, request.dbType),
        agent: `${request.dbType} ${request.phase.charAt(0).toUpperCase() + request.phase.slice(1)} Agent`,
        dbType: request.dbType,
        phase: request.phase
      };

      // Cache result to prevent repeated execution
      this.executionCache.set(cacheKey, generationResult);
      
      return generationResult;

    } catch (error) {
      console.error(`Generation failed for ${request.dbType} ${request.phase}:`, error);
      throw new Error(`Failed to generate ${request.dbType} ${request.phase}: ${error.message}`);
    }
  }

  /**
   * Stream generation with progress updates - single execution
   */
  async *streamGeneration(request: StreamlinedGenerationRequest): AsyncGenerator<{
    type: 'progress' | 'content' | 'complete' | 'error';
    data: any;
  }> {
    const cacheKey = `${request.dbType}-${request.phase}-${this.hashString(request.prompt)}`;
    
    // Check cache first
    if (this.executionCache.has(cacheKey)) {
      const cached = this.executionCache.get(cacheKey)!;
      yield { type: 'progress', data: { step: 'Using cached result', progress: 50 } };
      
      // Stream cached content
      for (let i = 0; i < cached.content.length; i += 50) {
        const chunk = cached.content.slice(i, i + 50);
        yield { type: 'content', data: chunk };
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      yield { type: 'complete', data: cached };
      return;
    }

    try {
      yield { type: 'progress', data: { step: `Starting ${request.dbType} ${request.phase}`, progress: 10 } };

      const result = await this.generateDatabase(request);

      yield { type: 'progress', data: { step: 'Processing response', progress: 80 } };

      // Stream content character by character
      for (let i = 0; i < result.content.length; i += 50) {
        const chunk = result.content.slice(i, i + 50);
        yield { type: 'content', data: chunk };
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      yield { type: 'complete', data: result };

    } catch (error) {
      yield { type: 'error', data: { message: error.message, step: 'Generation failed' } };
    }
  }

  /**
   * Clear execution cache - useful for development/testing
   */
  clearCache(): void {
    this.executionCache.clear();
    console.log('🧹 Execution cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.executionCache.size,
      keys: Array.from(this.executionCache.keys())
    };
  }

  private buildSampleDataPrompt(designContent: string, dbType: string): string {
    switch (dbType) {
      case 'VectorDB':
        return `Generate 5 realistic sample data records in JSON format for this vector database design:

${designContent}

Return only the JSON array with realistic, diverse sample data that matches the schema.`;

      case 'NoSQL':
        return `Generate 5 realistic sample documents in JSON format for this NoSQL database design:

${designContent}

Return only the JSON array with realistic, diverse documents that match the schema.`;

      case 'SQL':
        return `Generate 5 realistic sample INSERT statements for this SQL database design:

${designContent}

Return only the SQL INSERT statements with realistic, diverse data.`;

      default:
        return designContent;
    }
  }

  private calculateConfidence(content: string, dbType: string): number {
    // Simple confidence calculation based on content quality indicators
    let confidence = 0.7; // Base confidence

    // Check for database-specific patterns
    switch (dbType) {
      case 'SQL':
        if (content.includes('CREATE TABLE')) confidence += 0.1;
        if (content.includes('PRIMARY KEY')) confidence += 0.1;
        if (content.includes('FOREIGN KEY')) confidence += 0.1;
        break;
        
      case 'NoSQL':
        if (content.includes('{') && content.includes('}')) confidence += 0.1;
        if (content.includes('collection')) confidence += 0.1;
        if (content.includes('index')) confidence += 0.1;
        break;
        
      case 'VectorDB':
        if (content.includes('vector') || content.includes('embedding')) confidence += 0.1;
        if (content.includes('HNSW') || content.includes('similarity')) confidence += 0.1;
        if (content.includes('dimension')) confidence += 0.1;
        break;
    }

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

export const streamlinedDBCoachService = new StreamlinedDBCoachService();
export default streamlinedDBCoachService;