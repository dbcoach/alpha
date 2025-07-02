// Sample Data Generator for DB.Coach Application
// Generate realistic database project data

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
  }
};

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
  'SmartSolutions Group', 'InnovateLab Inc', 'CyberTech Industries', 'CodeCraft Studios'
];

class SampleDataGenerator {
  constructor() {
    this.usedIds = new Set();
    this.usedEmails = new Set();
  }

  generateId() {
    let id;
    do {
      id = 'proj_' + Math.random().toString(36).substr(2, 12);
    } while (this.usedIds.has(id));
    
    this.usedIds.add(id);
    return id;
  }

  generateEmail(firstName, lastName, company) {
    const domain = company.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 12) + '.com';
    
    let email;
    let attempt = 0;
    
    do {
      const suffix = attempt > 0 ? attempt.toString() : '';
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@${domain}`;
      attempt++;
    } while (this.usedEmails.has(email));
    
    this.usedEmails.add(email);
    return email;
  }

  generateQualityScores() {
    const baseQuality = 0.6 + Math.random() * 0.35;
    
    const syntax = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.2) * 100)));
    const logic = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.25) * 100)));
    const performance = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.3) * 100)));
    const security = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.2) * 100)));
    const completeness = Math.min(100, Math.max(0, Math.round((baseQuality + (Math.random() - 0.5) * 0.15) * 100)));
    
    const overall = Math.round((syntax + logic + performance + security + completeness) / 5);

    return { syntax, logic, performance, security, completeness, overall };
  }

  generateProgress(status) {
    const statusProgressMap = {
      'draft': [10, 30],
      'in_progress': [40, 80],
      'review': [80, 95],
      'completed': [95, 100],
      'archived': [100, 100]
    };

    const [minProgress, maxProgress] = statusProgressMap[status];
    const baseProgress = minProgress + Math.random() * (maxProgress - minProgress);
    
    const analysis = Math.min(100, Math.max(0, Math.round(baseProgress + (Math.random() - 0.5) * 10)));
    const design = Math.min(100, Math.max(0, Math.round(Math.min(analysis, baseProgress + (Math.random() - 0.5) * 15))));
    const implementation = Math.min(100, Math.max(0, Math.round(Math.min(design * 0.9, baseProgress + (Math.random() - 0.5) * 20))));
    const validation = Math.min(100, Math.max(0, Math.round(Math.min(implementation * 0.8, baseProgress + (Math.random() - 0.5) * 25))));
    const documentation = Math.min(100, Math.max(0, Math.round(Math.min(validation * 0.9, baseProgress + (Math.random() - 0.5) * 15))));

    return { analysis, design, implementation, validation, documentation };
  }

  generateDate(isCreated = true) {
    const now = new Date();
    const monthsBack = isCreated ? 12 : 0;
    const monthsForward = isCreated ? 0 : 6;
    
    const minDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const maxDate = new Date(now.getFullYear(), now.getMonth() + monthsForward, 28);
    
    const randomTime = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
    return new Date(randomTime).toISOString();
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  generateProject() {
    const domains = Object.keys(DOMAIN_TEMPLATES);
    const domain = this.randomChoice(domains);
    const template = DOMAIN_TEMPLATES[domain];
    
    const scales = ['small', 'medium', 'large', 'enterprise'];
    const complexities = ['simple', 'medium', 'complex', 'enterprise'];
    const statuses = ['draft', 'in_progress', 'review', 'completed', 'archived'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    const databaseTypes = ['SQL', 'NoSQL', 'VectorDB'];
    
    const scale = this.randomChoice(scales);
    const complexity = this.randomChoice(complexities);
    const status = this.randomChoice(statuses);
    const priority = this.randomChoice(priorities);
    const databaseType = this.randomChoice(databaseTypes);
    
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
    
    const firstName = this.randomChoice(FIRST_NAMES);
    const lastName = this.randomChoice(LAST_NAMES);
    const company = this.randomChoice(COMPANIES);
    const email = this.generateEmail(firstName, lastName, company);
    
    const createdAt = this.generateDate(true);
    const updatedAt = new Date(new Date(createdAt).getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const availableTags = template.tags;
    const tagCount = 3 + Math.floor(Math.random() * 4);
    const selectedTags = [];
    const usedTagIndices = new Set();
    
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

  generateProjects(count) {
    const projects = [];
    
    for (let i = 0; i < count; i++) {
      projects.push(this.generateProject());
    }
    
    return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Generate and display sample data
const generator = new SampleDataGenerator();
const sampleData = generator.generateProjects(10);

console.log('='.repeat(80));
console.log('DB.COACH SAMPLE DATABASE PROJECTS DATASET');
console.log('='.repeat(80));
console.log(`Generated ${sampleData.length} realistic database project records`);
console.log();

// Display summary statistics
const stats = sampleData.reduce((acc, project) => {
  acc.domains[project.domain] = (acc.domains[project.domain] || 0) + 1;
  acc.scales[project.scale] = (acc.scales[project.scale] || 0) + 1;
  acc.statuses[project.status] = (acc.statuses[project.status] || 0) + 1;
  acc.totalUsers += project.estimatedUsers;
  acc.totalTables += project.tableCount;
  acc.avgQuality += project.qualityScores.overall;
  return acc;
}, {
  domains: {},
  scales: {},
  statuses: {},
  totalUsers: 0,
  totalTables: 0,
  avgQuality: 0
});

stats.avgQuality = Math.round(stats.avgQuality / sampleData.length);

console.log('DATASET SUMMARY:');
console.log(`• Total Users Across All Projects: ${stats.totalUsers.toLocaleString()}`);
console.log(`• Total Database Tables: ${stats.totalTables}`);
console.log(`• Average Quality Score: ${stats.avgQuality}%`);
console.log();

console.log('DOMAIN DISTRIBUTION:');
Object.entries(stats.domains).forEach(([domain, count]) => {
  console.log(`• ${domain.charAt(0).toUpperCase() + domain.slice(1)}: ${count} projects`);
});
console.log();

console.log('PROJECT STATUS:');
Object.entries(stats.statuses).forEach(([status, count]) => {
  console.log(`• ${status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}: ${count} projects`);
});
console.log();

// Display detailed project information
console.log('DETAILED PROJECT RECORDS:');
console.log('='.repeat(80));

sampleData.forEach((project, index) => {
  console.log(`${index + 1}. ${project.name}`);
  console.log(`   ID: ${project.id}`);
  console.log(`   Domain: ${project.domain} | Scale: ${project.scale} | Status: ${project.status}`);
  console.log(`   Database: ${project.databaseType} (${project.tableCount} tables, ${project.estimatedUsers.toLocaleString()} users)`);
  console.log(`   Owner: ${project.owner.name} (${project.owner.email})`);
  console.log(`   Company: ${project.owner.company}`);
  console.log(`   Quality Score: ${project.qualityScores.overall}% (Syntax: ${project.qualityScores.syntax}%, Security: ${project.qualityScores.security}%)`);
  console.log(`   Progress: Analysis ${project.progress.analysis}%, Design ${project.progress.design}%, Implementation ${project.progress.implementation}%`);
  console.log(`   Tags: ${project.tags.join(', ')}`);
  console.log(`   Created: ${new Date(project.createdAt).toLocaleDateString()}`);
  console.log(`   Description: ${project.description}`);
  console.log();
});

// Export data formats
console.log('='.repeat(80));
console.log('EXPORT FORMATS AVAILABLE:');
console.log('='.repeat(80));

console.log('\n1. JSON FORMAT (First 2 records):');
console.log(JSON.stringify(sampleData.slice(0, 2), null, 2));

console.log('\n2. CSV FORMAT (Headers + First 3 records):');
const csvHeaders = [
  'ID', 'Name', 'Domain', 'Scale', 'Status', 'Database Type', 'Table Count',
  'Estimated Users', 'Quality Score', 'Owner Name', 'Owner Email', 'Company', 'Created Date'
];

const csvRows = sampleData.slice(0, 3).map(project => [
  project.id,
  `"${project.name}"`,
  project.domain,
  project.scale,
  project.status,
  project.databaseType,
  project.tableCount,
  project.estimatedUsers,
  project.qualityScores.overall,
  `"${project.owner.name}"`,
  project.owner.email,
  `"${project.owner.company}"`,
  new Date(project.createdAt).toLocaleDateString()
]);

console.log(csvHeaders.join(','));
csvRows.forEach(row => console.log(row.join(',')));

console.log('\n' + '='.repeat(80));
console.log('DATA VALIDATION CONSTRAINTS:');
console.log('='.repeat(80));
console.log('• ID: Unique identifier (proj_xxxxxxxxxx format)');
console.log('• Name: Non-empty string, domain-appropriate');
console.log('• Domain: One of [e-commerce, saas, social, financial, healthcare]');
console.log('• Scale: One of [small, medium, large, enterprise]');
console.log('• Table Count: Integer between 1-100');
console.log('• Estimated Users: Integer between 1-100,000,000');
console.log('• Quality Scores: Integer percentages between 0-100');
console.log('• Progress Values: Integer percentages between 0-100');
console.log('• Email: Valid email format (unique per company domain)');
console.log('• Dates: ISO 8601 format, updatedAt >= createdAt');
console.log('• Tags: 3-6 domain-relevant tags per project');

console.log('\n' + '='.repeat(80));
console.log('RELATIONSHIPS BETWEEN FIELDS:');
console.log('='.repeat(80));
console.log('• Scale affects table count, user count, and completion time');
console.log('• Domain determines available project names, descriptions, and tags');
console.log('• Status correlates with progress values (draft < in_progress < completed)');
console.log('• Quality scores have realistic variance around a base quality level');
console.log('• Progress phases are sequential (analysis → design → implementation)');
console.log('• Email domains are derived from company names');
console.log('• Creation and update dates maintain chronological order');

console.log('\n' + '='.repeat(80));
console.log('REAL-WORLD SCENARIOS REPRESENTED:');
console.log('='.repeat(80));
console.log('• E-commerce: Marketplace platforms, inventory systems, payment processing');
console.log('• SaaS: CRM systems, project management, business intelligence');
console.log('• Social: Networking platforms, forums, content sharing');
console.log('• Financial: Banking systems, investment platforms, payment processing');
console.log('• Healthcare: EHR systems, patient management, telemedicine');
console.log('• Realistic user scales from hundreds to millions');
console.log('• Quality scores reflecting real development challenges');
console.log('• Progress tracking across typical project phases');

console.log('\n🎯 Dataset ready for use in DB.Coach visualizations and testing!');