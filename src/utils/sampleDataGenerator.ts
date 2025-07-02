// Sample Data Generator for DB.Coach Application
// Generates realistic database project data for testing and demonstration

export interface DatabaseProject {
  id: string;
  name: string;
  description: string;
  domain: 'e-commerce' | 'saas' | 'social' | 'blog' | 'financial' | 'healthcare' | 'iot' | 'education';
  scale: 'small' | 'medium' | 'large' | 'enterprise';
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise';
  databaseType: 'SQL' | 'NoSQL' | 'VectorDB';
  tableCount: number;
  estimatedUsers: number;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived';
  owner: {
    name: string;
    email: string;
    company: string;
  };
  qualityScores: {
    syntax: number;
    logic: number;
    performance: number;
    security: number;
    completeness: number;
    overall: number;
  };
  progress: {
    analysis: number;
    design: number;
    implementation: number;
    validation: number;
    documentation: number;
  };
  tags: string[];
  estimatedCompletionTime: number; // in hours
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Domain-specific project templates
const DOMAIN_TEMPLATES = {
  'e-commerce': {
    names: [
      'Online Marketplace Platform',
      'Digital Storefront System',
      'Multi-Vendor Shopping Portal',
      'Product Catalog Management',
      'E-commerce Analytics Dashboard'
    ],
    descriptions: [
      'Comprehensive e-commerce platform with inventory management, order processing, and customer analytics',
      'Modern online shopping experience with real-time inventory tracking and payment processing',
      'Multi-vendor marketplace with seller dashboards, commission tracking, and dispute resolution',
      'Product catalog system with advanced search, recommendations, and pricing optimization'
    ],
    tags: ['inventory', 'orders', 'payments', 'customers', 'products', 'shipping', 'reviews', 'analytics'],
    tableRange: [8, 25],
    userRange: [1000, 500000]
  },
  'saas': {
    names: [
      'Project Management Suite',
      'Customer Relationship Manager',
      'Team Collaboration Platform',
      'Business Intelligence Dashboard',
      'Multi-Tenant Analytics Platform'
    ],
    descriptions: [
      'Enterprise project management solution with team collaboration, time tracking, and resource allocation',
      'Comprehensive CRM system with lead management, sales pipeline, and customer support integration',
      'Team productivity platform with real-time collaboration, document sharing, and workflow automation',
      'Business intelligence platform with data visualization, reporting, and predictive analytics'
    ],
    tags: ['tenants', 'subscriptions', 'billing', 'users', 'features', 'analytics', 'notifications', 'api'],
    tableRange: [12, 30],
    userRange: [500, 100000]
  },
  'social': {
    names: [
      'Social Networking Platform',
      'Community Discussion Forum',
      'Professional Networking Site',
      'Content Sharing Platform',
      'Social Media Analytics Tool'
    ],
    descriptions: [
      'Social networking platform with user profiles, friend connections, and content sharing capabilities',
      'Community-driven discussion forum with topic categorization, voting, and moderation features',
      'Professional networking site with career profiles, job matching, and industry insights',
      'Content sharing platform with media upload, commenting, and viral content tracking'
    ],
    tags: ['users', 'posts', 'comments', 'likes', 'follows', 'messages', 'groups', 'notifications'],
    tableRange: [10, 20],
    userRange: [5000, 1000000]
  },
  'blog': {
    names: [
      'Content Management System',
      'Personal Blogging Platform',
      'News Publishing Portal',
      'Technical Documentation Site',
      'Multi-Author Blog Network'
    ],
    descriptions: [
      'Modern content management system with rich text editing, SEO optimization, and analytics',
      'Personal blogging platform with customizable themes, comment moderation, and social sharing',
      'News publishing portal with editorial workflow, breaking news alerts, and subscriber management',
      'Technical documentation platform with version control, collaborative editing, and API docs'
    ],
    tags: ['articles', 'authors', 'categories', 'tags', 'comments', 'media', 'seo', 'analytics'],
    tableRange: [6, 15],
    userRange: [100, 50000]
  },
  'financial': {
    names: [
      'Banking Transaction System',
      'Investment Portfolio Manager',
      'Payment Processing Platform',
      'Financial Risk Assessment Tool',
      'Cryptocurrency Exchange'
    ],
    descriptions: [
      'Secure banking system with account management, transaction processing, and fraud detection',
      'Investment portfolio management with real-time market data, risk analysis, and reporting',
      'Payment processing platform with multi-currency support, compliance, and reconciliation',
      'Financial risk assessment tool with credit scoring, regulatory reporting, and audit trails'
    ],
    tags: ['accounts', 'transactions', 'compliance', 'audit', 'security', 'reporting', 'regulations', 'encryption'],
    tableRange: [15, 35],
    userRange: [1000, 10000000]
  },
  'healthcare': {
    names: [
      'Electronic Health Records',
      'Patient Management System',
      'Medical Billing Platform',
      'Telemedicine Portal',
      'Clinical Trial Management'
    ],
    descriptions: [
      'HIPAA-compliant electronic health records system with patient history, treatment tracking, and provider coordination',
      'Comprehensive patient management with appointment scheduling, medical records, and insurance processing',
      'Medical billing platform with insurance claims, payment processing, and regulatory compliance',
      'Telemedicine portal with video consultations, prescription management, and patient monitoring'
    ],
    tags: ['patients', 'providers', 'appointments', 'records', 'billing', 'compliance', 'privacy', 'hipaa'],
    tableRange: [18, 40],
    userRange: [500, 100000]
  },
  'iot': {
    names: [
      'Smart Home Automation',
      'Industrial IoT Monitor',
      'Environmental Sensor Network',
      'Fleet Tracking System',
      'Smart City Management'
    ],
    descriptions: [
      'Smart home automation system with device control, energy monitoring, and security integration',
      'Industrial IoT platform with real-time sensor monitoring, predictive maintenance, and alerts',
      'Environmental monitoring network with air quality, weather, and pollution tracking',
      'Fleet management system with GPS tracking, fuel monitoring, and maintenance scheduling'
    ],
    tags: ['devices', 'sensors', 'telemetry', 'alerts', 'automation', 'monitoring', 'analytics', 'real-time'],
    tableRange: [8, 20],
    userRange: [100, 1000000]
  },
  'education': {
    names: [
      'Learning Management System',
      'Student Information System',
      'Online Course Platform',
      'Educational Assessment Tool',
      'Campus Management Portal'
    ],
    descriptions: [
      'Comprehensive learning management system with course delivery, grading, and student progress tracking',
      'Student information system with enrollment, academic records, and administrative functions',
      'Online course platform with video lectures, interactive content, and certification programs',
      'Educational assessment tool with quiz creation, automated grading, and analytics'
    ],
    tags: ['students', 'courses', 'assignments', 'grades', 'enrollment', 'faculty', 'curriculum', 'assessments'],
    tableRange: [12, 25],
    userRange: [200, 500000]
  }
};

// Common first and last names for realistic user generation
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Anna', 'Robert',
  'Maria', 'John', 'Jessica', 'William', 'Ashley', 'Christopher', 'Amanda', 'Matthew'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'
];

const COMPANIES = [
  'TechCorp Solutions', 'Digital Innovations Inc', 'CloudTech Systems', 'DataDrive Analytics',
  'NextGen Software', 'Quantum Computing Co', 'AI Dynamics Ltd', 'FutureTech Enterprises',
  'SmartSolutions Group', 'InnovateLab Inc', 'CyberTech Industries', 'CodeCraft Studios',
  'DataMind Corporation', 'TechPulse Systems', 'DigitalEdge Solutions', 'CloudFirst Technologies'
];

class SampleDataGenerator {
  private usedIds: Set<string> = new Set();
  private usedEmails: Set<string> = new Set();

  // Generate a unique ID
  private generateId(): string {
    let id: string;
    do {
      id = 'proj_' + Math.random().toString(36).substr(2, 12);
    } while (this.usedIds.has(id));
    
    this.usedIds.add(id);
    return id;
  }

  // Generate a unique email
  private generateEmail(firstName: string, lastName: string, company: string): string {
    const domain = company.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 12) + '.com';
    
    let email: string;
    let attempt = 0;
    
    do {
      const suffix = attempt > 0 ? attempt.toString() : '';
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@${domain}`;
      attempt++;
    } while (this.usedEmails.has(email));
    
    this.usedEmails.add(email);
    return email;
  }

  // Generate realistic quality scores with some correlation
  private generateQualityScores(): DatabaseProject['qualityScores'] {
    // Base quality level (affects all scores)
    const baseQuality = 0.6 + Math.random() * 0.35; // 60-95% base
    
    // Individual score variations
    const syntax = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.2) * 100)));
    const logic = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.25) * 100)));
    const performance = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.3) * 100)));
    const security = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.2) * 100)));
    const completeness = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.15) * 100)));
    
    const overall = Math.round((syntax + logic + performance + security + completeness) / 5);

    return { syntax, logic, performance, security, completeness, overall };
  }

  // Generate realistic progress with logical constraints
  private generateProgress(status: DatabaseProject['status']): DatabaseProject['progress'] {
    const statusProgressMap = {
      'draft': [10, 30],
      'in_progress': [40, 80],
      'review': [80, 95],
      'completed': [95, 100],
      'archived': [100, 100]
    };

    const [minProgress, maxProgress] = statusProgressMap[status];
    const baseProgress = minProgress + Math.random() * (maxProgress - minProgress);
    
    // Sequential progress (each phase builds on previous)
    const analysis = Math.min(100, Math.max(0, Math.round(baseProgress + (Math.random() - 0.5) * 10)));
    const design = Math.min(100, Math.max(0, Math.round(Math.min(analysis, baseProgress + (Math.random() - 0.5) * 15))));
    const implementation = Math.min(100, Math.max(0, Math.round(Math.min(design * 0.9, baseProgress + (Math.random() - 0.5) * 20))));
    const validation = Math.min(100, Math.max(0, Math.round(Math.min(implementation * 0.8, baseProgress + (Math.random() - 0.5) * 25))));
    const documentation = Math.min(100, Math.max(0, Math.round(Math.min(validation * 0.9, baseProgress + (Math.random() - 0.5) * 15))));

    return { analysis, design, implementation, validation, documentation };
  }

  // Generate date within a reasonable range
  private generateDate(isCreated: boolean = true): string {
    const now = new Date();
    const monthsBack = isCreated ? 12 : 0;
    const monthsForward = isCreated ? 0 : 6;
    
    const minDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const maxDate = new Date(now.getFullYear(), now.getMonth() + monthsForward, 28);
    
    const randomTime = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
    return new Date(randomTime).toISOString();
  }

  // Select random item from array
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate a single database project record
  public generateProject(): DatabaseProject {
    const domain = this.randomChoice(Object.keys(DOMAIN_TEMPLATES)) as keyof typeof DOMAIN_TEMPLATES;
    const template = DOMAIN_TEMPLATES[domain];
    
    // Determine scale and complexity based on domain
    const scales: DatabaseProject['scale'][] = ['small', 'medium', 'large', 'enterprise'];
    const complexities: DatabaseProject['complexity'][] = ['simple', 'medium', 'complex', 'enterprise'];
    const statuses: DatabaseProject['status'][] = ['draft', 'in_progress', 'review', 'completed', 'archived'];
    const priorities: DatabaseProject['priority'][] = ['low', 'medium', 'high', 'critical'];
    const databaseTypes: DatabaseProject['databaseType'][] = ['SQL', 'NoSQL', 'VectorDB'];
    
    const scale = this.randomChoice(scales);
    const complexity = this.randomChoice(complexities);
    const status = this.randomChoice(statuses);
    const priority = this.randomChoice(priorities);
    const databaseType = this.randomChoice(databaseTypes);
    
    // Generate realistic metrics based on scale
    const scaleMultipliers = {
      small: { tables: 1, users: 1, time: 1 },
      medium: { tables: 1.5, users: 10, time: 2 },
      large: { tables: 2, users: 100, time: 4 },
      enterprise: { tables: 3, users: 1000, time: 8 }
    };
    
    const multiplier = scaleMultipliers[scale];
    const [minTables, maxTables] = template.tableRange;
    const [minUsers, maxUsers] = template.userRange;
    
    const tableCount = Math.round((minTables + Math.random() * (maxTables - minTables)) * multiplier.tables);
    const estimatedUsers = Math.round((minUsers + Math.random() * (maxUsers - minUsers)) * multiplier.users);
    const estimatedCompletionTime = Math.round((20 + Math.random() * 180) * multiplier.time);
    
    // Generate owner information
    const firstName = this.randomChoice(FIRST_NAMES);
    const lastName = this.randomChoice(LAST_NAMES);
    const company = this.randomChoice(COMPANIES);
    const email = this.generateEmail(firstName, lastName, company);
    
    // Generate dates
    const createdAt = this.generateDate(true);
    const updatedAt = new Date(new Date(createdAt).getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Select random tags
    const availableTags = template.tags;
    const tagCount = 3 + Math.floor(Math.random() * 4); // 3-6 tags
    const selectedTags = [];
    const usedTagIndices = new Set<number>();
    
    while (selectedTags.length < tagCount && selectedTags.length < availableTags.length) {
      const index = Math.floor(Math.random() * availableTags.length);
      if (!usedTagIndices.has(index)) {
        usedTagIndices.add(index);
        selectedTags.push(availableTags[index]);
      }
    }

    return {
      id: this.generateId(),
      name: this.randomChoice(template.names),
      description: this.randomChoice(template.descriptions),
      domain,
      scale,
      complexity,
      databaseType,
      tableCount,
      estimatedUsers,
      createdAt,
      updatedAt,
      status,
      owner: {
        name: `${firstName} ${lastName}`,
        email,
        company
      },
      qualityScores: this.generateQualityScores(),
      progress: this.generateProgress(status),
      tags: selectedTags,
      estimatedCompletionTime,
      priority
    };
  }

  // Generate multiple projects
  public generateProjects(count: number): DatabaseProject[] {
    const projects: DatabaseProject[] = [];
    
    for (let i = 0; i < count; i++) {
      projects.push(this.generateProject());
    }
    
    // Sort by creation date (newest first)
    return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Reset generator state for fresh generation
  public reset(): void {
    this.usedIds.clear();
    this.usedEmails.clear();
  }

  // Validate generated data
  public validateProject(project: DatabaseProject): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!project.id || project.id.length === 0) errors.push('ID is required');
    if (!project.name || project.name.length === 0) errors.push('Name is required');
    if (!project.description || project.description.length === 0) errors.push('Description is required');
    
    // Enum validation
    const validDomains = ['e-commerce', 'saas', 'social', 'blog', 'financial', 'healthcare', 'iot', 'education'];
    if (!validDomains.includes(project.domain)) errors.push('Invalid domain');
    
    const validScales = ['small', 'medium', 'large', 'enterprise'];
    if (!validScales.includes(project.scale)) errors.push('Invalid scale');
    
    // Numeric range validation
    if (project.tableCount < 1 || project.tableCount > 100) errors.push('Table count must be between 1 and 100');
    if (project.estimatedUsers < 1 || project.estimatedUsers > 100000000) errors.push('Estimated users must be between 1 and 100,000,000');
    if (project.estimatedCompletionTime < 1 || project.estimatedCompletionTime > 2000) errors.push('Estimated completion time must be between 1 and 2000 hours');
    
    // Quality scores validation (0-100)
    const scores = Object.values(project.qualityScores);
    if (scores.some(score => score < 0 || score > 100)) {
      errors.push('Quality scores must be between 0 and 100');
    }
    
    // Progress validation (0-100)
    const progressValues = Object.values(project.progress);
    if (progressValues.some(progress => progress < 0 || progress > 100)) {
      errors.push('Progress values must be between 0 and 100');
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(project.owner.email)) {
      errors.push('Invalid email format');
    }
    
    // Date validation
    const createdDate = new Date(project.createdAt);
    const updatedDate = new Date(project.updatedAt);
    if (updatedDate < createdDate) {
      errors.push('Updated date cannot be before created date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Export data in different formats
  public exportData(projects: DatabaseProject[], format: 'json' | 'csv' | 'xlsx'): string | Blob {
    switch (format) {
      case 'json':
        return JSON.stringify(projects, null, 2);
        
      case 'csv':
        if (projects.length === 0) return '';
        
        const headers = [
          'ID', 'Name', 'Description', 'Domain', 'Scale', 'Complexity', 'Database Type',
          'Table Count', 'Estimated Users', 'Status', 'Priority', 'Owner Name', 'Owner Email',
          'Owner Company', 'Overall Quality Score', 'Created At', 'Updated At', 'Tags'
        ];
        
        const rows = projects.map(project => [
          project.id,
          `"${project.name.replace(/"/g, '""')}"`,
          `"${project.description.replace(/"/g, '""')}"`,
          project.domain,
          project.scale,
          project.complexity,
          project.databaseType,
          project.tableCount,
          project.estimatedUsers,
          project.status,
          project.priority,
          `"${project.owner.name.replace(/"/g, '""')}"`,
          project.owner.email,
          `"${project.owner.company.replace(/"/g, '""')}"`,
          project.qualityScores.overall,
          project.createdAt,
          project.updatedAt,
          `"${project.tags.join(', ')}"`
        ]);
        
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

// Export singleton instance
export const sampleDataGenerator = new SampleDataGenerator();

// Generate initial 10 sample records
export const generateSampleData = (count: number = 10): DatabaseProject[] => {
  return sampleDataGenerator.generateProjects(count);
};

// Export default 10 records for immediate use
export const defaultSampleData: DatabaseProject[] = generateSampleData(10);