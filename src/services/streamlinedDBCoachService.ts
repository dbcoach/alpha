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
        return `You are a Data Generation Specialist creating high-quality, realistic sample data for vector databases.

Using the vector database design below, generate 10 realistic and detailed sample data records that match the user's original intent. Format the output as a JSON array.

**Vector Database Design:**
${designContent}

**Requirements:**
- Generate 10 diverse, realistic records
- Ensure all fields match the schema specifications
- Include varied content that demonstrates the use case
- Use realistic values for metadata fields
- Make content rich enough to generate meaningful embeddings

**Output Format:**
\`\`\`json
[
  {
    // Sample record with all required fields
    // Ensure content field has rich, meaningful text for vectorization
    // Include realistic values for all metadata fields
  }
  // ... 9 more distinct and realistic records
]
\`\`\``;

      case 'NoSQL':
        return `# [ROLE]
You are a Data Generation Specialist. Your mission is to create high-quality, realistic sample data that perfectly conforms to the NoSQL database schema design provided.

# [INSTRUCTIONS]
Using the NoSQL database design specification below, generate realistic JSON sample data that demonstrates the schema design and relationships. The data should be interconnected (e.g., referenced IDs should match across collections) and realistic for the use case.

**NoSQL Database Design:**
${designContent}

**Requirements:**
1. **Realistic Data**: Use authentic-looking names, emails, content, and values
2. **Proper Relationships**: Ensure referenced IDs match between collections
3. **Schema Compliance**: Follow exact field names and data types from the design
4. **Diverse Content**: Create varied, meaningful content that demonstrates different scenarios
5. **Date Consistency**: Use realistic, consistent timestamps (recent dates)
6. **Business Logic**: Respect any business rules implied by the schema

# [OUTPUT FORMAT]
Generate the sample data as a single JSON object with keys for each collection name. Follow this exact structure:

\`\`\`json
{
  "CollectionName1": [
    {
      "_id": "ObjectId('unique_mongodb_object_id')",
      "field_name": "realistic_value",
      "nested_object": {
        "sub_field": "value"
      },
      "array_field": ["item1", "item2"],
      "created_at": "ISODate('2025-MM-DDTHH:mm:ssZ')",
      "updated_at": "ISODate('2025-MM-DDTHH:mm:ssZ')"
    }
    // Generate 3-5 realistic documents per collection
  ],
  "CollectionName2": [
    {
      "_id": "ObjectId('unique_mongodb_object_id')",
      "reference_id": "ObjectId('matching_id_from_other_collection')",
      "other_fields": "realistic_values"
    }
    // Generate 5-8 realistic documents per collection
  ]
}
\`\`\`

**Critical Requirements:**
- Use realistic ObjectId format: ObjectId('24-character-hex-string')
- Use ISODate format for dates: ISODate('YYYY-MM-DDTHH:mm:ssZ')
- Ensure foreign key references match exactly between collections
- Create meaningful, varied content that demonstrates the use case scenarios
- Include edge cases (e.g., empty arrays, null values where appropriate)
- Make data realistic enough for actual application testing`;

      case 'SQL':
        return `You are a Data Generation Specialist creating realistic sample data for SQL databases.

Using the SQL database design below, generate INSERT statements for 8 realistic records that demonstrate the use case.

**SQL Database Design:**
${designContent}

**Requirements:**
- Generate 8 diverse, realistic records
- Respect all foreign key relationships
- Include proper data types and constraints
- Use realistic values that demonstrate the business case

**Output Format:**
\`\`\`sql
-- Sample INSERT statements with realistic data
INSERT INTO table_name (columns...) VALUES (values...);
-- ... 7 more INSERT statements
\`\`\``;

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