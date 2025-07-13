export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<string>;
  safetyLevel: 'READ_ONLY' | 'SAFE_MODIFY' | 'DESTRUCTIVE';
}

export class ToolService {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async executeTool(name: string, params: Record<string, unknown>, safetyLevel: string): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    // Safety check
    if (safetyLevel === 'READ_ONLY' && tool.safetyLevel !== 'READ_ONLY') {
      return `Error: Tool '${name}' not allowed in read-only mode`;
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      return `Error executing tool '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  getAvailableTools(allowedTools: string[]): string {
    const toolDescriptions = allowedTools
      .map(toolName => {
        const tool = this.tools.get(toolName);
        if (tool) {
          return `
<tool_code>
<tool_name>${tool.name}</tool_name>
<tool_description>${tool.description}</tool_description>
<parameters>${JSON.stringify(tool.parameters)}</parameters>
</tool_code>`;
        }
        return '';
      })
      .filter(desc => desc.length > 0)
      .join('\n');

    return toolDescriptions;
  }

  private registerDefaultTools(): void {
    // Schema inspection tools
    this.registerTool({
      name: 'listTables',
      description: 'Returns a list of all tables in the current database schema',
      parameters: {},
      execute: async () => {
        // Implementation for listing tables
        return 'users, orders, products, categories';
      },
      safetyLevel: 'READ_ONLY'
    });

    this.registerTool({
      name: 'getSchemaForTables',
      description: 'Retrieves CREATE TABLE DDL statements for specified tables',
      parameters: {
        table_names: { type: 'array', description: 'List of table names' }
      },
      execute: async (params) => {
        const { table_names } = params;
        // Implementation for getting schema
        return `Schema for tables: ${table_names.join(', ')}`;
      },
      safetyLevel: 'READ_ONLY'
    });

    this.registerTool({
      name: 'executeQuery',
      description: 'Executes a SQL query with safety checks',
      parameters: {
        sql: { type: 'string', description: 'SQL query to execute' },
        read_only: { type: 'boolean', description: 'Prevent modifications' }
      },
      execute: async (params) => {
        const { sql, read_only } = params;
        
        // Basic safety check
        if (read_only && /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i.test(sql)) {
          return 'Error: Modifying query blocked in read-only mode';
        }

        // Implementation for executing query
        return `Query executed: ${sql}`;
      },
      safetyLevel: 'SAFE_MODIFY'
    });

    this.registerTool({
      name: 'explainQueryPlan', 
      description: 'Returns execution plan and performance analysis for a SQL query',
      parameters: {
        sql_query: { type: 'string', description: 'SQL query to analyze' }
      },
      execute: async (params) => {
        const { sql_query } = params;
        return `Execution plan for: ${sql_query}\n[Plan details would be here]`;
      },
      safetyLevel: 'READ_ONLY'
    });

    this.registerTool({
      name: 'suggestIndexes',
      description: 'Analyzes query or table and suggests beneficial indexes',
      parameters: {
        sql_query: { type: 'string', description: 'SQL query to analyze', nullable: true },
        table_name: { type: 'string', description: 'Table to analyze', nullable: true }
      },
      execute: async (params) => {
        const { sql_query, table_name } = params;
        return `Index suggestions for ${sql_query || table_name}`;
      },
      safetyLevel: 'READ_ONLY'
    });
  }
}

export const toolService = new ToolService();