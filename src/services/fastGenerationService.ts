// Fast Generation Service - Single-shot, no multi-step complexity
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface FastGenerationResult {
  content: string;
  executionTime: number;
  success: boolean;
  fallbackUsed: boolean;
}

export interface FastGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  useCache?: boolean;
}

class FastGenerationService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private cache = new Map<string, { content: string; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_TIMEOUT = 15000; // 15 seconds

  // Ultra-optimized single prompt for complete database generation
  private readonly FAST_GENERATION_PROMPT = `You are an expert database architect. Generate a complete, production-ready database solution in a single response.

For the request: "{USER_REQUEST}" using {DB_TYPE}

Provide a comprehensive solution with these sections:

## 📋 Analysis Summary
Brief analysis of requirements and entities (2-3 sentences)

## 🗄️ Database Schema
Complete SQL DDL with:
- All necessary tables
- Primary and foreign keys
- Essential indexes
- Basic constraints

## 📊 Sample Data
INSERT statements with 3-5 realistic records per table

## 🔧 Implementation Notes
- Key considerations
- Performance recommendations
- Security measures

Be concise but complete. Focus on practical, implementable solutions.
Ensure all SQL is syntactically correct and production-ready.`;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 3000,
      }
    });
  }

  async generateDatabase(
    userRequest: string,
    dbType: string,
    options: FastGenerationOptions = {}
  ): Promise<FastGenerationResult> {
    const startTime = Date.now();
    const cacheKey = `${userRequest}_${dbType}`;
    
    try {
      // Check cache first if enabled
      if (options.useCache !== false) {
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          console.log('📋 Using cached result');
          return {
            content: cached.content,
            executionTime: Date.now() - startTime,
            success: true,
            fallbackUsed: false
          };
        }
      }

      // Prepare optimized prompt
      const prompt = this.FAST_GENERATION_PROMPT
        .replace('{USER_REQUEST}', userRequest)
        .replace('{DB_TYPE}', dbType);

      // Set timeout
      const timeout = options.timeout || this.DEFAULT_TIMEOUT;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Generation timeout after ${timeout}ms`)), timeout);
      });

      // Execute generation with timeout
      const generationPromise = this.executeGeneration(prompt, options);
      const content = await Promise.race([generationPromise, timeoutPromise]);

      // Cache successful result
      if (options.useCache !== false) {
        this.cacheResult(cacheKey, content);
      }

      const executionTime = Date.now() - startTime;
      console.log(`⚡ Fast generation completed in ${executionTime}ms`);

      return {
        content,
        executionTime,
        success: true,
        fallbackUsed: false
      };

    } catch (error) {
      console.warn('Fast generation failed, using fallback:', error);
      
      // Return fallback result
      const fallbackContent = this.generateFallbackContent(userRequest, dbType);
      const executionTime = Date.now() - startTime;

      return {
        content: fallbackContent,
        executionTime,
        success: true,
        fallbackUsed: true
      };
    }
  }

  private async executeGeneration(
    prompt: string,
    options: FastGenerationOptions
  ): Promise<string> {
    // Update model config if options provided
    if (options.maxTokens || options.temperature) {
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: options.temperature || 0.2,
          topP: 0.8,
          topK: 20,
          maxOutputTokens: options.maxTokens || 3000,
        }
      });
    }

    const response = await this.model.generateContent(prompt);
    return await response.response.text();
  }

  private getCachedResult(key: string): { content: string } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return { content: cached.content };
  }

  private cacheResult(key: string, content: string): void {
    this.cache.set(key, {
      content,
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (this.cache.size > 50) {
      this.cleanCache();
    }
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  private generateFallbackContent(userRequest: string, dbType: string): string {
    return `# ${dbType} Database Solution

## 📋 Analysis Summary
Generated fallback solution for: "${userRequest}"
This is a basic implementation covering core requirements.

## 🗄️ Database Schema

\`\`\`sql
-- Core Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Main Data Table
CREATE TABLE main_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Essential Indexes
CREATE INDEX idx_main_data_user_id ON main_data(user_id);
CREATE INDEX idx_main_data_status ON main_data(status);
CREATE INDEX idx_users_email ON users(email);
\`\`\`

## 📊 Sample Data

\`\`\`sql
-- Sample Users
INSERT INTO users (name, email) VALUES 
('John Doe', 'john.doe@example.com'),
('Jane Smith', 'jane.smith@example.com'),
('Bob Johnson', 'bob.johnson@example.com');

-- Sample Main Data
INSERT INTO main_data (user_id, title, description, status) VALUES 
(1, 'First Entry', 'Initial data entry for testing', 'active'),
(1, 'Second Entry', 'Another entry for the same user', 'active'),
(2, 'User 2 Entry', 'Data entry for second user', 'active'),
(3, 'Draft Entry', 'This is still being worked on', 'draft');
\`\`\`

## 🔧 Implementation Notes

**Performance Considerations:**
- Indexes added for commonly queried fields
- Foreign keys ensure data integrity
- Consider adding pagination for large datasets

**Security Measures:**
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Consider data encryption for sensitive fields

**Scalability:**
- Monitor query performance and add indexes as needed
- Consider table partitioning for very large datasets
- Implement proper backup and recovery procedures

This fallback solution provides a solid foundation that can be extended based on specific requirements.`;
  }

  // Quick health check
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const response = await Promise.race([
        this.model.generateContent('Health check. Respond with "OK".'),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      
      const result = await response.response.text();
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: result.toLowerCase().includes('ok'),
        responseTime
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  // Clear cache manually
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const fastGenerationService = new FastGenerationService();
export default fastGenerationService;