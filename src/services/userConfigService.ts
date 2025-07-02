interface UserRule {
  name: string;
  content: string;
  metadata: {
    scope: 'global' | 'file_path_pattern' | 'database_dialect' | 'on_demand';
    rule_name: string;
    description: string;
    file_path_pattern?: string;
    database_dialect?: string;
    priority?: number;
  };
}

interface UserPreferences {
  explanationLevel: 'beginner' | 'intermediate' | 'advanced';
  safetySettings: 'strict' | 'moderate' | 'flexible';
  outputFormat: 'detailed' | 'concise' | 'code-only';
  promptTransparency: boolean;
  toolUsageApproval: 'always_ask' | 'auto_approve_safe' | 'auto_approve_all';
  customPromptOverrides: Record<string, string>;
}

export class UserConfigService {
  private rules: Map<string, UserRule> = new Map();
  private preferences: UserPreferences;

  constructor() {
    this.preferences = this.loadDefaultPreferences();
    this.loadDefaultRules();
  }

  private loadDefaultPreferences(): UserPreferences {
    return {
      explanationLevel: 'intermediate',
      safetySettings: 'strict',
      outputFormat: 'detailed',
      promptTransparency: true,
      toolUsageApproval: 'always_ask',
      customPromptOverrides: {}
    };
  }

  private loadDefaultRules(): void {
    // Global SQL formatting standards
    this.addRule({
      name: 'global_sql_formatting',
      content: `As DB.Coach, when generating or optimizing SQL, always adhere to the following formatting guidelines:
- SQL keywords (SELECT, FROM, WHERE, JOIN) must be uppercase
- Table and column names should use snake_case  
- Indent nested clauses (subqueries, JOIN conditions) by 4 spaces
- Use comments for complex logic or temporary changes
- Always include semicolons at the end of statements`,
      metadata: {
        scope: 'global',
        rule_name: 'global_sql_formatting',
        description: 'Enforces consistent SQL formatting standards across all queries',
        priority: 1
      }
    });

    // PostgreSQL-specific examples  
    this.addRule({
      name: 'postgresql_text2sql_examples',
      content: `Given PostgreSQL schema examples:
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255));
CREATE TABLE orders (order_id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), amount DECIMAL(10,2));

Example 1:
User Question: "Show me users who have placed orders over 100"
SQL Query:
SELECT u.name, u.email
FROM users u
JOIN orders o ON u.id = o.user_id  
GROUP BY u.id, u.name, u.email
HAVING SUM(o.amount) > 100;

Example 2:
User Question: "Count orders in January 2025"
SQL Query:
SELECT COUNT(*)
FROM orders
WHERE EXTRACT(MONTH FROM order_date) = 1 
  AND EXTRACT(YEAR FROM order_date) = 2025;`,
      metadata: {
        scope: 'database_dialect',
        database_dialect: 'postgresql',
        rule_name: 'postgresql_text2sql_examples',
        description: 'Provides few-shot examples for PostgreSQL Text-to-SQL generation',
        priority: 2
      }
    });

    // Security-focused rules
    this.addRule({
      name: 'security_standards',
      content: `Security Requirements for All Database Operations:
1. Never expose sensitive data in logs or error messages
2. Always use parameterized queries to prevent SQL injection  
3. Implement row-level security where applicable
4. Encrypt sensitive columns (PII, passwords, financial data)
5. Require multi-factor authentication for admin operations
6. Audit all data modifications with timestamps and user tracking
7. Follow principle of least privilege for database access`,
      metadata: {
        scope: 'global',
        rule_name: 'security_standards', 
        description: 'Mandatory security standards for all database operations',
        priority: 1
      }
    });

    // Performance optimization rules
    this.addRule({
      name: 'performance_standards',
      content: `Performance Requirements:
1. All foreign keys must have corresponding indexes
2. Query response time target: <100ms for simple queries, <1s for complex
3. Use EXPLAIN ANALYZE to validate query performance
4. Consider partitioning for tables >10M rows
5. Implement connection pooling for applications
6. Monitor slow query logs and optimize regularly
7. Use appropriate data types (avoid TEXT for known-length strings)`,
      metadata: {
        scope: 'global',
        rule_name: 'performance_standards',
        description: 'Performance standards and optimization guidelines',
        priority: 2
      }
    });
  }

  addRule(rule: UserRule): void {
    this.rules.set(rule.name, rule);
  }

  removeRule(ruleName: string): void {
    this.rules.delete(ruleName);
  }

  getActiveRules(context: {
    activeFilePath?: string;
    databaseDialect?: string;
    userQuery?: string;
  }): UserRule[] {
    const activeRules: UserRule[] = [];

    for (const rule of this.rules.values()) {
      // Global rules are always included
      if (rule.metadata.scope === 'global') {
        activeRules.push(rule);
        continue;
      }

      // File path pattern matching
      if (rule.metadata.scope === 'file_path_pattern' && 
          rule.metadata.file_path_pattern && 
          context.activeFilePath) {
        const pattern = new RegExp(rule.metadata.file_path_pattern);
        if (pattern.test(context.activeFilePath)) {
          activeRules.push(rule);
          continue;
        }
      }

      // Database dialect matching  
      if (rule.metadata.scope === 'database_dialect' &&
          rule.metadata.database_dialect === context.databaseDialect) {
        activeRules.push(rule);
        continue;
      }

      // On-demand rules (referenced via @rule:rule_name)
      if (rule.metadata.scope === 'on_demand' && 
          context.userQuery &&
          context.userQuery.includes(`@rule:${rule.name}`)) {
        activeRules.push(rule);
        continue;
      }
    }

    // Sort by priority (lower number = higher priority)
    return activeRules.sort((a, b) => 
      (a.metadata.priority || 999) - (b.metadata.priority || 999)
    );
  }

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }

  private savePreferences(): void {
    // In a real implementation, this would persist to localStorage or backend
    try {
      localStorage.setItem('dbcoach_user_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('dbcoach_user_preferences');
      if (saved) {
        this.preferences = { ...this.preferences, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  assembleRulesForPrompt(context: {
    activeFilePath?: string;
    databaseDialect?: string; 
    userQuery?: string;
  }): string {
    const activeRules = this.getActiveRules(context);
    
    if (activeRules.length === 0) {
      return '';
    }

    let rulesContent = '\n### USER-DEFINED RULES AND STANDARDS\n\n';
    
    activeRules.forEach((rule, index) => {
      rulesContent += `**Rule ${index + 1}: ${rule.metadata.description}**\n`;
      rulesContent += `${rule.content}\n\n`;
    });

    rulesContent += '**IMPORTANT:** All responses must strictly adhere to these user-defined rules and standards.\n\n';
    
    return rulesContent;
  }

  // Initialize example rules directory structure
  initializeRulesDirectory(): { [key: string]: string } {
    return {
      'global_standards.md': `---
scope: global
rule_name: "global_sql_formatting"  
description: "Enforces consistent SQL formatting standards across all queries."
priority: 1
---
As DB.Coach, when generating or optimizing SQL, always adhere to the following formatting guidelines:
- SQL keywords (SELECT, FROM, WHERE, JOIN) must be uppercase.
- Table and column names should use snake_case.
- Indent nested clauses (e.g., subqueries, JOIN conditions) by 4 spaces.
- Use comments for complex logic or temporary changes.`,

      'postgresql_examples.md': `---
scope: database_dialect
database_dialect: "postgresql"
rule_name: "postgresql_text2sql_examples"
description: "Provides few-shot examples for PostgreSQL specific Text-to-SQL generation."
priority: 2
---
Given the following PostgreSQL schema:
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255));
CREATE TABLE orders (order_id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), amount DECIMAL(10,2));

-- Example 1:
-- User Question: "Show me the names and emails of users who have placed orders totaling more than 100."
-- SQL Query:
-- SELECT u.name, u.email
-- FROM users u  
-- JOIN orders o ON u.id = o.user_id
-- GROUP BY u.id, u.name, u.email
-- HAVING SUM(o.amount) > 100;`,

      'security_requirements.md': `---
scope: global
rule_name: "security_standards"
description: "Mandatory security standards for all database operations."
priority: 1
---
Security Requirements for All Database Operations:

1. **Data Protection**
   - Never expose sensitive data in logs or error messages
   - Encrypt PII, passwords, and financial data at rest
   - Use HTTPS/TLS for all data transmission

2. **Access Control**  
   - Implement row-level security where applicable
   - Follow principle of least privilege
   - Require MFA for administrative operations

3. **SQL Injection Prevention**
   - Always use parameterized queries
   - Validate and sanitize all user inputs
   - Avoid dynamic SQL construction`,

      'performance_standards.md': `---
scope: global  
rule_name: "performance_standards"
description: "Performance standards and optimization guidelines."
priority: 2
---
Performance Requirements:

1. **Index Strategy**
   - All foreign keys must have corresponding indexes
   - Index frequently queried columns in WHERE clauses
   - Consider composite indexes for multi-column queries

2. **Query Performance**
   - Target: <100ms for simple queries, <1s for complex
   - Use EXPLAIN ANALYZE to validate performance  
   - Optimize N+1 query patterns

3. **Scalability**
   - Consider partitioning for tables >10M rows
   - Implement connection pooling
   - Monitor and optimize slow queries regularly`
    };
  }
}

export const userConfigService = new UserConfigService();