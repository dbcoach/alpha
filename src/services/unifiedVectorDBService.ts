// Unified Vector Database Service - Clean Implementation
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface VectorDBDesignRequest {
  userRequirement: string;
  outputType: 'design' | 'sample_data' | 'implementation';
}

export interface VectorDBDesignResponse {
  executiveSummary: string;
  technicalSpecs: {
    embeddingModel: {
      selectedModel: string;
      justification: string;
    };
    indexStrategy: {
      indexType: string;
      justification: string;
      keyParameters: string[];
    };
    similarityMetric: {
      selectedMetric: string;
      justification: string;
    };
  };
  schemaDesign: {
    className: string;
    properties: Array<{
      name: string;
      dataType: string;
      description: string;
      vectorize: boolean;
    }>;
  };
}

class UnifiedVectorDBService {
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
        maxOutputTokens: 8192,
      }
    });
  }

  // 1. VECTOR DATABASE DESIGN PROMPT
  private readonly DESIGN_PROMPT = `# [ROLE]
You are a world-class Vector Database Architect. Your mission is to analyze a user's requirements and design a technical specification for a vector database that is optimized for performance, accuracy, and cost-efficiency.

# [INSTRUCTIONS]
Based on the [USER REQUIREMENT] below, write a detailed vector database design specification. You must follow the [OUTPUT FORMAT] precisely. For every technical choice, you must provide a clear justification.

# [USER REQUIREMENT]
{userRequirement}

# [OUTPUT FORMAT]

### 1. Executive Summary
- Summarize the core purpose and design strategy of this database in 1-2 sentences that a non-technical person can understand.

### 2. Core Technical Specifications
- **Embedding Model:**
  - **Selected Model:** {e.g., \`sentence-transformers/all-MiniLM-L6-v2\`}
  - **Justification:** {Explain why this model was chosen, considering the data type (text/image), language, and specific use case (semantic search, QA, etc.).}
- **Index Strategy:**
  - **Index Type:** {e.g., \`HNSW (Hierarchical Navigable Small World)\`}
  - **Justification:** {Explain why this index is a good fit, considering the trade-offs between search speed, accuracy, recall, and memory usage for the specified use case.}
  - **Key Parameters (to consider):** {Mention key parameters that will affect performance, e.g., \`efConstruction\`, \`maxConnections\` for HNSW.}
- **Similarity Metric:**
  - **Selected Metric:** {e.g., \`Cosine Similarity\`}
  - **Justification:** {Explain why this metric is the most appropriate for the chosen embedding model and the nature of the data's similarity.}

### 3. Schema Design
- **Class / Collection Name:** \`{e.g., "RestaurantReview"}\`
- **Properties / Fields:**
  - **[Field 1]**
    - **name:** \`content\`
    - **dataType:** \`text\`
    - **description:** The original text from the blog review.
    - **vectorize:** \`True\` (This field's meaning will be encoded in the vector.)
  - **[Field 2]**
    - **name:** \`restaurant_name\`
    - **dataType:** \`string\`
    - **description:** The name of the restaurant.
    - **vectorize:** \`False\` (Used for filtering, not for vector search.)
  - **[Field 3]**
    - **name:** \`address\`
    - **dataType:** \`string\`
    - **description:** The physical address of the restaurant.
    - **vectorize:** \`False\`
  - **[Field 4]**
    - **name:** \`rating\`
    - **dataType:** \`number\`
    - **description:** The star rating, including decimals.
    - **vectorize:** \`False\`
  - **[Field 5]**
    - **name:** \`category\`
    - **dataType:** \`string\`
    - **description:** The primary food category (e.g., Italian, Japanese, Mexican).
    - **vectorize:** \`False\``;

  // 2. SAMPLE DATA GENERATION PROMPT
  private readonly SAMPLE_DATA_PROMPT = `# [ROLE]
You are a Data Generation Specialist. Your mission is to create high-quality, realistic sample data that perfectly conforms to a given database schema specification.

# [INSTRUCTIONS]
Using the [VECTOR DATABASE DESIGN] provided below, generate 10 realistic and detailed sample data records that match the user's original intent. You must format the output as a JSON array.

# [VECTOR DATABASE DESIGN]
{vectorDatabaseDesign}

# [OUTPUT FORMAT]
\`\`\`json
[
  {
    "restaurant_name": "The Pasta Palace",
    "address": "123 Lexington Ave, New York, NY 10017",
    "rating": 4.5,
    "category": "Italian",
    "content": "If you're looking for a cozy spot near Grand Central with amazing pasta, this is the place. The lasagna was rich and flavorful, and the service was excellent. Perfect for a pre-theater dinner."
  },
  {
    "restaurant_name": "Sushi Zen",
    "address": "456 Park Ave, New York, NY 10022",
    "rating": 4.8,
    "category": "Japanese",
    "content": "I had the omakase menu and it was an unforgettable experience. The fish was incredibly fresh and each piece was a work of art. It's pricey, but worth it for a special occasion."
  }
  // ... generate 8 more distinct and realistic sample objects here ...
]
\`\`\``;

  // 3. IMPLEMENTATION CODE PROMPT
  private readonly IMPLEMENTATION_PROMPT = `# [ROLE]
You are a Senior AI Engineer specializing in implementing vector search systems. Your task is to translate a vector database design specification into clean, production-ready code.

# [INSTRUCTIONS]
Based on the [VECTOR DATABASE DESIGN] provided below, write a Python script that implements the specified schema using the \`weaviate-client\` library. The script should be well-commented, easy to understand, and ready to run.

# [VECTOR DATABASE DESIGN]
{vectorDatabaseDesign}

# [OUTPUT FORMAT]
Provide a single Python code block that performs the following:
1.  Connects to a local Weaviate instance.
2.  Checks if the schema class already exists and deletes it to ensure a clean start.
3.  Creates a new class schema that exactly matches the \`Schema Design\` section of the provided input. This includes setting the vectorizer, index type, and all specified properties with their correct data types.
4.  Includes comments explaining each major step and how it relates to the design choices.
5.  Includes a "Prerequisites" section in a comment block at the top of the script.

# [PYTHON SCRIPT]
\`\`\`python
# Prerequisites:
# 1. A Weaviate instance must be running (e.g., via Docker).
# 2. The weaviate-client library must be installed: pip install weaviate-client

import weaviate
import weaviate.classes as wvc

# 1. Connect to Weaviate
# This assumes Weaviate is running on localhost:8080.
# For Weaviate Cloud Services (WCS), you would add authentication credentials.
try:
    client = weaviate.connect_to_local()
    print("Successfully connected to Weaviate.")
except Exception as e:
    print(f"Failed to connect to Weaviate: {e}")
    exit()

# Define the class name from the design specification
# Design Spec -> Class / Collection Name: "RestaurantReview"
CLASS_NAME = "RestaurantReview"

# 2. Define and Create the Schema (Class)
try:
    # Delete the class if it already exists for a clean start
    if client.collections.exists(CLASS_NAME):
        client.collections.delete(CLASS_NAME)
        print(f"Successfully deleted existing class: '{CLASS_NAME}'")

    # Recreate the class based on the design specification
    print(f"Creating new class: '{CLASS_NAME}'...")

    # Design Spec -> Core Technical Specifications are configured here
    client.collections.create(
        name=CLASS_NAME,
        description="A collection of restaurant reviews for a recommendation chatbot",
        
        # Design Spec -> Embedding Model Choice is set here via the vectorizer module
        vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_transformers(),

        # Design Spec -> Index Strategy (HNSW) and Similarity Metric (Cosine) are configured here
        vector_index_config=wvc.config.Configure.VectorIndex.hnsw(
            distance_metric=wvc.config.DistanceMetric.COSINE # Matches the design spec
        ),

        # Design Spec -> Schema Design properties are defined here
        properties=[
            wvc.config.Property(
                name="content",
                data_type=wvc.config.DataType.TEXT,
                description="The original text from the blog review",
            ),
            wvc.config.Property(
                name="restaurant_name",
                data_type=wvc.config.DataType.TEXT,
                description="The name of the restaurant",
                # This field is not vectorized by default unless explicitly added to vectorization properties.
                # Weaviate's newer clients handle this implicitly.
            ),
            wvc.config.Property(
                name="address",
                data_type=wvc.config.DataType.TEXT,
                description="The physical address of the restaurant",
            ),
            wvc.config.Property(
                name="rating",
                data_type=wvc.config.DataType.NUMBER,
                description="The star rating, including decimals",
            ),
            wvc.config.Property(
                name="category",
                data_type=wvc.config.DataType.TEXT,
                description="The primary food category (e.g., Italian, Japanese, Mexican)",
            ),
        ]
    )
    
    print("✅ Schema created successfully!")

finally:
    # Close the connection to Weaviate
    client.close()
    print("Connection closed.")
\`\`\``;

  /**
   * Generate vector database design, sample data, or implementation code
   * Single entry point - no repeated agent execution
   */
  async generateVectorDB(request: VectorDBDesignRequest): Promise<string> {
    try {
      let prompt: string;
      
      switch (request.outputType) {
        case 'design':
          prompt = this.DESIGN_PROMPT.replace('{userRequirement}', request.userRequirement);
          break;
          
        case 'sample_data':
          // For sample data, we need the design first
          const designResponse = await this.generateVectorDB({
            userRequirement: request.userRequirement,
            outputType: 'design'
          });
          prompt = this.SAMPLE_DATA_PROMPT.replace('{vectorDatabaseDesign}', designResponse);
          break;
          
        case 'implementation':
          // For implementation, we need the design first
          const implDesignResponse = await this.generateVectorDB({
            userRequirement: request.userRequirement,
            outputType: 'design'
          });
          prompt = this.IMPLEMENTATION_PROMPT.replace('{vectorDatabaseDesign}', implDesignResponse);
          break;
          
        default:
          throw new Error(`Unknown output type: ${request.outputType}`);
      }

      // Single AI call - no repeated execution
      const result = await this.model.generateContent(prompt);
      return await result.response.text();
      
    } catch (error) {
      console.error('Vector DB generation failed:', error);
      throw new Error(`Failed to generate ${request.outputType}: ${error.message}`);
    }
  }

  /**
   * Stream vector database generation with progress updates
   */
  async *streamVectorDBGeneration(request: VectorDBDesignRequest): AsyncGenerator<{
    type: 'progress' | 'content' | 'complete';
    data: any;
  }> {
    try {
      yield { type: 'progress', data: { step: 'Starting vector DB generation', progress: 10 } };

      const result = await this.generateVectorDB(request);
      
      yield { type: 'progress', data: { step: 'Processing response', progress: 90 } };
      
      // Stream content character by character for UI effect
      for (let i = 0; i < result.length; i += 50) {
        const chunk = result.slice(i, i + 50);
        yield { type: 'content', data: chunk };
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming
      }
      
      yield { type: 'complete', data: { result, outputType: request.outputType } };
      
    } catch (error) {
      yield { type: 'progress', data: { step: 'Error occurred', progress: 100, error: error.message } };
    }
  }
}

export const unifiedVectorDBService = new UnifiedVectorDBService();
export default unifiedVectorDBService;