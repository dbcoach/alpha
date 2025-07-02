// DBCoach Testing and Validation Utilities

export interface TestScenario {
  id: string;
  name: string;
  input: string;
  dbType: string;
  expectedDomain: string;
  expectedScale: 'small' | 'medium' | 'large' | 'enterprise';
  expectedComplexity: 'simple' | 'medium' | 'complex' | 'enterprise';
  expectedFeatures: string[];
  validationCriteria: {
    requiresSQL: boolean;
    requiresIndexes: boolean;
    requiresConstraints: boolean;
    requiresSecurityMeasures: boolean;
    minimumTables: number;
  };
}

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'blog-minimal',
    name: 'Minimal Blog System',
    input: 'database for blog',
    dbType: 'SQL',
    expectedDomain: 'blog',
    expectedScale: 'small',
    expectedComplexity: 'simple',
    expectedFeatures: ['users', 'posts', 'comments', 'categories'],
    validationCriteria: {
      requiresSQL: true,
      requiresIndexes: true,
      requiresConstraints: true,
      requiresSecurityMeasures: true,
      minimumTables: 4
    }
  },
  {
    id: 'ecommerce-complex',
    name: 'E-commerce Platform',
    input: 'Multi-currency e-commerce platform with inventory tracking, order management, and customer accounts',
    dbType: 'SQL',
    expectedDomain: 'e_commerce',
    expectedScale: 'medium',
    expectedComplexity: 'complex',
    expectedFeatures: ['products', 'inventory', 'orders', 'payments', 'customers', 'currencies'],
    validationCriteria: {
      requiresSQL: true,
      requiresIndexes: true,
      requiresConstraints: true,
      requiresSecurityMeasures: true,
      minimumTables: 8
    }
  },
  {
    id: 'saas-enterprise',
    name: 'Multi-tenant SaaS',
    input: 'Multi-tenant SaaS project management platform with 10,000 companies, time tracking, team collaboration',
    dbType: 'SQL',
    expectedDomain: 'saas',
    expectedScale: 'large',
    expectedComplexity: 'enterprise',
    expectedFeatures: ['tenants', 'projects', 'tasks', 'time_entries', 'teams', 'users'],
    validationCriteria: {
      requiresSQL: true,
      requiresIndexes: true,
      requiresConstraints: true,
      requiresSecurityMeasures: true,
      minimumTables: 10
    }
  }
];

export interface ValidationResult {
  scenario: string;
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  performance: {
    responseTime: number;
    accuracy: number;
    completeness: number;
  };
}

export class DBCoachValidator {
  
  static validateResponse(scenario: TestScenario, response: { content: string }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Validate SQL syntax if required
    if (scenario.validationCriteria.requiresSQL && response.content) {
      const sqlValidation = this.validateSQL(response.content);
      if (!sqlValidation.valid) {
        errors.push(`SQL syntax errors: ${sqlValidation.errors.join(', ')}`);
        score -= 25;
      }
    }

    // Validate indexes
    if (scenario.validationCriteria.requiresIndexes) {
      const indexValidation = this.validateIndexes(response.content);
      if (!indexValidation.valid) {
        warnings.push('Missing recommended indexes on foreign keys');
        score -= 10;
      }
    }

    // Validate constraints
    if (scenario.validationCriteria.requiresConstraints) {
      const constraintValidation = this.validateConstraints(response.content);
      if (!constraintValidation.valid) {
        errors.push('Missing critical constraints (PRIMARY KEY, FOREIGN KEY)');
        score -= 20;
      }
    }

    // Validate security measures
    if (scenario.validationCriteria.requiresSecurityMeasures) {
      const securityValidation = this.validateSecurity(response.content);
      if (!securityValidation.valid) {
        errors.push('Security vulnerabilities detected');
        score -= 30;
      }
    }

    // Validate minimum table count
    const tableCount = this.countTables(response.content);
    if (tableCount < scenario.validationCriteria.minimumTables) {
      warnings.push(`Only ${tableCount} tables found, expected at least ${scenario.validationCriteria.minimumTables}`);
      score -= 5;
    }

    // Generate recommendations
    if (score < 90) {
      recommendations.push('Consider reviewing best practices for database design');
    }
    if (warnings.length > 0) {
      recommendations.push('Address warnings to improve schema quality');
    }

    return {
      scenario: scenario.id,
      passed: errors.length === 0 && score >= 80,
      score: Math.max(0, score),
      errors,
      warnings,
      recommendations,
      performance: {
        responseTime: 0, // Will be set by caller
        accuracy: score / 100,
        completeness: this.calculateCompleteness(scenario, response)
      }
    };
  }

  private static validateSQL(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic SQL syntax checks
    if (!content.includes('CREATE TABLE')) {
      errors.push('No CREATE TABLE statements found');
    }
    
    // Check for unclosed parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses in SQL');
    }

    // Check for missing semicolons
    const statements = content.split('CREATE TABLE').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim() && !statement.includes(';')) {
        errors.push('Missing semicolon in SQL statement');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static validateIndexes(content: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for foreign key indexes
    const foreignKeyPattern = /FOREIGN KEY.*REFERENCES\s+(\w+)/gi;
    const foreignKeys = content.match(foreignKeyPattern) || [];
    const indexPattern = /CREATE INDEX.*ON\s+(\w+)/gi;
    const indexes = content.match(indexPattern) || [];
    
    if (foreignKeys.length > 0 && indexes.length === 0) {
      issues.push('No indexes found for foreign keys');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private static validateConstraints(content: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for primary keys
    if (!content.includes('PRIMARY KEY')) {
      issues.push('No PRIMARY KEY constraints found');
    }

    // Check for foreign keys in multi-table schemas
    const tableCount = this.countTables(content);
    if (tableCount > 1 && !content.includes('FOREIGN KEY') && !content.includes('REFERENCES')) {
      issues.push('No FOREIGN KEY constraints found in multi-table schema');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private static validateSecurity(content: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for plain text passwords
    if (content.toLowerCase().includes('password') && !content.toLowerCase().includes('password_hash')) {
      issues.push('Potential plain text password storage detected');
    }

    // Check for audit fields
    if (!content.includes('created_at') && !content.includes('updated_at')) {
      issues.push('Missing audit timestamp fields');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private static countTables(content: string): number {
    const matches = content.match(/CREATE TABLE/gi);
    return matches ? matches.length : 0;
  }

  private static calculateCompleteness(scenario: TestScenario, response: { content: string }): number {
    let completeness = 0;
    const totalFeatures = scenario.expectedFeatures.length;
    
    if (totalFeatures === 0) return 1;

    for (const feature of scenario.expectedFeatures) {
      if (response.content && response.content.toLowerCase().includes(feature.toLowerCase())) {
        completeness += 1;
      }
    }

    return completeness / totalFeatures;
  }
}

export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startTimer(): () => number {
    const startTime = performance.now();
    return () => performance.now() - startTime;
  }

  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  static getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  static getMetricSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        summary[name] = {
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }

    return summary;
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }
}

// Quality Assurance Utilities
export class QualityAssurance {
  
  static async runTestSuite(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    console.log('🧪 Running DBCoach Quality Assurance Test Suite...');
    
    for (const scenario of TEST_SCENARIOS) {
      console.log(`Testing scenario: ${scenario.name}`);
      
      try {
        const timer = PerformanceMonitor.startTimer();
        
        // This would normally call the actual DBCoach service
        // For now, we'll simulate a response
        const mockResponse = { content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);' };
        
        const responseTime = timer();
        PerformanceMonitor.recordMetric('response_time', responseTime);
        
        const result = DBCoachValidator.validateResponse(scenario, mockResponse);
        result.performance.responseTime = responseTime;
        
        results.push(result);
        
        console.log(`✅ ${scenario.name}: ${result.passed ? 'PASSED' : 'FAILED'} (Score: ${result.score})`);
        
      } catch (error) {
        console.error(`❌ ${scenario.name}: ERROR - ${error}`);
        results.push({
          scenario: scenario.id,
          passed: false,
          score: 0,
          errors: [`Test execution failed: ${error}`],
          warnings: [],
          recommendations: ['Review test setup and error logs'],
          performance: { responseTime: 0, accuracy: 0, completeness: 0 }
        });
      }
    }
    
    return results;
  }

  static generateReport(results: ValidationResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    const averageResponseTime = results.reduce((sum, r) => sum + r.performance.responseTime, 0) / totalTests;

    return `
# DBCoach Quality Assurance Report

## Test Summary
- **Total Tests**: ${totalTests}
- **Passed**: ${passedTests}
- **Failed**: ${totalTests - passedTests}
- **Pass Rate**: ${((passedTests / totalTests) * 100).toFixed(1)}%
- **Average Score**: ${averageScore.toFixed(1)}/100
- **Average Response Time**: ${averageResponseTime.toFixed(0)}ms

## Performance Metrics
${JSON.stringify(PerformanceMonitor.getMetricSummary(), null, 2)}

## Detailed Results
${results.map(result => `
### ${result.scenario}
- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Score**: ${result.score}/100
- **Errors**: ${result.errors.length > 0 ? result.errors.join(', ') : 'None'}
- **Warnings**: ${result.warnings.length > 0 ? result.warnings.join(', ') : 'None'}
- **Response Time**: ${result.performance.responseTime.toFixed(0)}ms
`).join('')}

Generated at: ${new Date().toISOString()}
    `.trim();
  }
}

export default {
  TEST_SCENARIOS,
  DBCoachValidator,
  PerformanceMonitor,
  QualityAssurance
};