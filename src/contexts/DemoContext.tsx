import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SavedConversation } from '../services/conversationStorage';

interface DemoUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  demoUser: DemoUser;
  demoConversations: SavedConversation[];
  setDemoMode: (enabled: boolean) => void;
  addDemoConversation: (conversation: SavedConversation) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const DEMO_USER: DemoUser = {
  id: 'demo-user-123',
  email: 'demo@dbcoach.ai',
  name: 'Demo User',
  avatar: 'https://via.placeholder.com/40/6366f1/white?text=D'
};

const DEMO_CONVERSATIONS: SavedConversation[] = [
  {
    id: 'demo-conv-1',
    prompt: 'E-commerce platform with products, orders, customers, and inventory management',
    dbType: 'PostgreSQL',
    title: 'E-commerce Database Schema',
    generatedContent: {
      'requirements_analysis': `# Requirements Analysis Report

## Domain Analysis
Based on the prompt: "E-commerce platform with products, orders, customers, and inventory management"

### Identified Entities:
- Customers (user accounts, profiles)
- Products (catalog, variants, categories)
- Orders (transactions, line items)
- Inventory (stock levels, warehouses)
- Categories (product organization)
- Reviews (customer feedback)

### Functional Requirements:
- Customer registration and authentication
- Product catalog management
- Shopping cart functionality
- Order processing and fulfillment
- Inventory tracking and alerts
- Customer reviews and ratings

### Non-Functional Requirements:
- Performance targets: < 100ms query response
- Concurrency: Support 10,000+ concurrent users
- Data consistency: ACID compliance required
- Security: PCI DSS compliance for payments`,
      
      'schema_design': `# Database Schema Design

## Entity Relationship Diagram

### Core Tables:

\`\`\`sql
-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    sku VARCHAR(100) UNIQUE NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### Relationships:
- One-to-Many: Customers → Orders
- One-to-Many: Orders → Order Items
- One-to-Many: Products → Order Items
- One-to-Many: Categories → Products
- Self-referencing: Categories (parent-child)

### Indexes:
- Primary keys: Clustered indexes
- Foreign keys: Non-clustered indexes
- Search fields: Composite indexes on name, email
- Unique constraints: Email, SKU`,
      
      'implementation_package': `# Implementation Package

## SQL Scripts

### Database Creation:
\`\`\`sql
-- Database setup
CREATE DATABASE ecommerce_db;
USE ecommerce_db;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\`\`\`

### Sample Data:
\`\`\`sql
-- Insert sample customers
INSERT INTO customers (email, password_hash, first_name, last_name, phone) VALUES
('john.doe@example.com', 'hashed_password_1', 'John', 'Doe', '+1234567890'),
('jane.smith@example.com', 'hashed_password_2', 'Jane', 'Smith', '+1234567891'),
('bob.wilson@example.com', 'hashed_password_3', 'Bob', 'Wilson', '+1234567892');

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Books', 'Physical and digital books');

-- Insert sample products
INSERT INTO products (name, description, price, category_id, sku, stock_quantity) VALUES
('Laptop Pro', 'High-performance laptop for professionals', 1299.99, 1, 'LAPTOP-PRO-001', 50),
('Smartphone X', 'Latest smartphone with advanced features', 799.99, 1, 'PHONE-X-001', 100),
('Cotton T-Shirt', 'Comfortable cotton t-shirt', 29.99, 2, 'TSHIRT-COT-001', 200);
\`\`\`

### API Examples:
\`\`\`javascript
// REST API endpoints
const api = {
  // Customer endpoints
  getCustomers: () => fetch('/api/customers'),
  createCustomer: (data) => fetch('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // Product endpoints
  getProducts: () => fetch('/api/products'),
  getProduct: (id) => fetch(\`/api/products/\${id}\`),
  
  // Order endpoints
  createOrder: (orderData) => fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  
  // Search products
  searchProducts: (query) => fetch(\`/api/products/search?q=\${query}\`)
};
\`\`\``,
      
      'quality_assurance': `# Quality Assurance Report

## Design Validation ✅
- Schema normalization: 3NF compliance verified
- Foreign key constraints: All relationships validated
- Data types: Appropriate selection confirmed
- Naming conventions: Consistent throughout

## Performance Analysis 📊
- Query optimization: Indexes properly placed
- Expected query time: < 50ms for most operations
- Scalability: Designed for 100x growth
- Connection pooling: Recommended configuration

## Security Audit 🔒
- SQL injection prevention: Parameterized queries
- Data encryption: Sensitive fields protected
- Access control: Role-based permissions
- Audit logging: All changes tracked
- PCI DSS compliance: Payment data protection

## Recommendations:
1. Implement regular backups (daily)
2. Monitor query performance metrics
3. Set up replication for high availability
4. Regular security updates and patches
5. Implement caching layer (Redis)

## E-commerce Specific Considerations:
- Inventory concurrency control
- Payment processing security
- Customer data privacy (GDPR)
- Order state management
- Product search optimization`
    },
    insights: [
      {
        agent: 'DB.Coach',
        message: 'Starting database generation for e-commerce platform...',
        timestamp: '2024-01-15T10:00:00Z'
      },
      {
        agent: 'Requirements Analyst',
        message: 'Analyzing e-commerce domain requirements...',
        timestamp: '2024-01-15T10:00:05Z'
      },
      {
        agent: 'Requirements Analyst',
        message: 'Identified core entities: customers, products, orders, inventory',
        timestamp: '2024-01-15T10:00:15Z'
      },
      {
        agent: 'Schema Architect',
        message: 'Designing normalized schema with proper relationships...',
        timestamp: '2024-01-15T10:00:30Z'
      },
      {
        agent: 'Schema Architect',
        message: 'Creating optimized table structures with appropriate indexes',
        timestamp: '2024-01-15T10:00:45Z'
      },
      {
        agent: 'Performance Optimizer',
        message: 'Adding performance indexes for search and joins...',
        timestamp: '2024-01-15T10:01:00Z'
      },
      {
        agent: 'Security Auditor',
        message: 'Implementing PCI DSS compliance measures...',
        timestamp: '2024-01-15T10:01:15Z'
      },
      {
        agent: 'Quality Assurance',
        message: 'Database design complete! All validations passed.',
        timestamp: '2024-01-15T10:01:30Z'
      }
    ],
    tasks: [
      {
        id: 'requirements_analysis',
        title: 'Requirements Analysis',
        agent: 'Requirements Analyst',
        status: 'completed',
        progress: 100
      },
      {
        id: 'schema_design',
        title: 'Schema Design',
        agent: 'Schema Architect',
        status: 'completed',
        progress: 100
      },
      {
        id: 'implementation_package',
        title: 'Implementation Package',
        agent: 'Implementation Specialist',
        status: 'completed',
        progress: 100
      },
      {
        id: 'quality_assurance',
        title: 'Quality Assurance',
        agent: 'Quality Assurance',
        status: 'completed',
        progress: 100
      }
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:01:30Z',
    status: 'completed',
    userId: 'demo-user-123',
    metadata: {
      duration: 90000,
      totalChunks: 5420,
      totalInsights: 8,
      mode: 'dbcoach'
    }
  },
  {
    id: 'demo-conv-2',
    prompt: 'Social media platform with users, posts, comments, likes, and followers',
    dbType: 'PostgreSQL',
    title: 'Social Media Database',
    generatedContent: {
      'requirements_analysis': `# Social Media Platform Requirements

## Domain Analysis
Social networking platform with content sharing and engagement features.

### Core Entities:
- Users (profiles, authentication)
- Posts (content, media attachments)
- Comments (threaded discussions)
- Likes/Reactions (engagement tracking)
- Followers/Following (social graph)
- Notifications (user alerts)

### Scale Considerations:
- Expected 1M+ users
- High read/write ratio
- Real-time notifications
- Media storage requirements`,
      
      'schema_design': `# Social Media Schema Design

\`\`\`sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    media_urls TEXT[],
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES comments(id),
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follows table
CREATE TABLE follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id),
    following_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

-- Likes table
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    post_id INTEGER REFERENCES posts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);
\`\`\``,
      
      'implementation_package': `# Social Media Implementation

## API Endpoints:
\`\`\`javascript
// Social media API
const api = {
  // User management
  getProfile: (userId) => fetch(\`/api/users/\${userId}\`),
  updateProfile: (data) => fetch('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // Posts
  getFeed: () => fetch('/api/posts/feed'),
  createPost: (content, media) => fetch('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ content, media })
  }),
  
  // Social interactions
  followUser: (userId) => fetch(\`/api/users/\${userId}/follow\`, {
    method: 'POST'
  }),
  likePost: (postId) => fetch(\`/api/posts/\${postId}/like\`, {
    method: 'POST'
  })
};
\`\`\``,
      
      'quality_assurance': `# Social Media QA Report

## Performance Optimizations:
- Feed generation algorithms
- Caching strategy for popular content
- Image/video CDN integration
- Real-time notification system

## Scalability Considerations:
- Database sharding strategies
- Read replicas for feed generation
- Message queue for notifications
- Content moderation workflows`
    },
    insights: [
      {
        agent: 'Requirements Analyst',
        message: 'Analyzing social media platform requirements...',
        timestamp: '2024-01-10T14:30:00Z'
      },
      {
        agent: 'Schema Architect',
        message: 'Designing scalable social graph structure...',
        timestamp: '2024-01-10T14:30:30Z'
      },
      {
        agent: 'Performance Optimizer',
        message: 'Optimizing for high-traffic social interactions...',
        timestamp: '2024-01-10T14:31:00Z'
      }
    ],
    tasks: [
      {
        id: 'requirements_analysis',
        title: 'Requirements Analysis',
        agent: 'Requirements Analyst',
        status: 'completed',
        progress: 100
      },
      {
        id: 'schema_design',
        title: 'Schema Design',
        agent: 'Schema Architect',
        status: 'completed',
        progress: 100
      },
      {
        id: 'implementation_package',
        title: 'Implementation Package',
        agent: 'Implementation Specialist',
        status: 'completed',
        progress: 100
      },
      {
        id: 'quality_assurance',
        title: 'Quality Assurance',
        agent: 'Quality Assurance',
        status: 'completed',
        progress: 100
      }
    ],
    createdAt: '2024-01-10T14:30:00Z',
    updatedAt: '2024-01-10T14:32:00Z',
    status: 'completed',
    userId: 'demo-user-123'
  },
  {
    id: 'demo-conv-3',
    prompt: 'Healthcare management system with patients, appointments, doctors, and medical records',
    dbType: 'PostgreSQL',
    title: 'Healthcare Management System',
    generatedContent: {
      'requirements_analysis': `# Healthcare Management Requirements

## HIPAA Compliance Requirements
Healthcare system requiring strict privacy and security measures.

### Core Entities:
- Patients (demographics, medical history)
- Doctors (profiles, specializations)
- Appointments (scheduling, status)
- Medical Records (diagnoses, treatments)
- Insurance (coverage, claims)
- Prescriptions (medications, dosages)

### Compliance Requirements:
- HIPAA compliance for patient data
- Audit logging for all access
- Data encryption at rest and in transit
- Access control and permissions`,
      
      'schema_design': `# HIPAA-Compliant Healthcare Schema

\`\`\`sql
-- Patients table with encryption
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_number VARCHAR(20) UNIQUE NOT NULL,
    first_name_encrypted BYTEA NOT NULL,
    last_name_encrypted BYTEA NOT NULL,
    date_of_birth_encrypted BYTEA NOT NULL,
    ssn_encrypted BYTEA,
    phone_encrypted BYTEA,
    email_encrypted BYTEA,
    emergency_contact_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    doctor_id INTEGER REFERENCES doctors(id),
    appointment_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'scheduled',
    notes_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical records with audit trail
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    doctor_id INTEGER REFERENCES doctors(id),
    visit_date TIMESTAMP NOT NULL,
    diagnosis_encrypted BYTEA,
    treatment_encrypted BYTEA,
    medications_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES doctors(id)
);

-- Audit log for HIPAA compliance
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\``,
      
      'implementation_package': `# Healthcare System Implementation

## Security Features:
- End-to-end encryption for patient data
- Role-based access control (RBAC)
- Comprehensive audit logging
- Session management and timeouts

## API with Security:
\`\`\`javascript
// Secure healthcare API
const secureApi = {
  // Authenticated endpoints only
  getPatientData: (patientId, token) => fetch(\`/api/patients/\${patientId}\`, {
    headers: { 'Authorization': \`Bearer \${token}\` }
  }),
  
  createAppointment: (data, token) => fetch('/api/appointments', {
    method: 'POST',
    headers: { 
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }),
  
  // Audit-logged medical record access
  getMedicalHistory: (patientId, token) => fetch(\`/api/patients/\${patientId}/records\`, {
    headers: { 'Authorization': \`Bearer \${token}\` }
  })
};
\`\`\``,
      
      'quality_assurance': `# Healthcare System QA Report

## HIPAA Compliance ✅
- All PII fields encrypted
- Comprehensive audit logging
- Access controls implemented
- Data retention policies defined

## Security Measures:
- Multi-factor authentication required
- Session timeout enforcement
- IP whitelist for admin access
- Regular security audits scheduled

## Performance & Reliability:
- 99.9% uptime requirement
- Automated backups every 4 hours
- Disaster recovery procedures
- Load balancing for high availability`
    },
    insights: [
      {
        agent: 'Requirements Analyst',
        message: 'Analyzing healthcare domain with HIPAA requirements...',
        timestamp: '2024-01-08T09:15:00Z'
      },
      {
        agent: 'Security Auditor',
        message: 'Implementing comprehensive encryption and audit logging...',
        timestamp: '2024-01-08T09:16:00Z'
      },
      {
        agent: 'Schema Architect',
        message: 'Designing HIPAA-compliant database structure...',
        timestamp: '2024-01-08T09:17:00Z'
      }
    ],
    tasks: [
      {
        id: 'requirements_analysis',
        title: 'Requirements Analysis',
        agent: 'Requirements Analyst',
        status: 'completed',
        progress: 100
      },
      {
        id: 'schema_design',
        title: 'Schema Design',
        agent: 'Schema Architect',
        status: 'completed',
        progress: 100
      },
      {
        id: 'implementation_package',
        title: 'Implementation Package',
        agent: 'Implementation Specialist',
        status: 'completed',
        progress: 100
      },
      {
        id: 'quality_assurance',
        title: 'Quality Assurance',
        agent: 'Quality Assurance',
        status: 'completed',
        progress: 100
      }
    ],
    createdAt: '2024-01-08T09:15:00Z',
    updatedAt: '2024-01-08T09:18:00Z',
    status: 'completed',
    userId: 'demo-user-123'
  }
];

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoConversations, setDemoConversations] = useState<SavedConversation[]>(DEMO_CONVERSATIONS);

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (enabled) {
      // Set demo conversations when entering demo mode
      setDemoConversations(DEMO_CONVERSATIONS);
    }
  };

  const addDemoConversation = (conversation: SavedConversation) => {
    setDemoConversations(prev => [conversation, ...prev]);
  };

  return (
    <DemoContext.Provider 
      value={{
        isDemoMode,
        demoUser: DEMO_USER,
        demoConversations,
        setDemoMode,
        addDemoConversation
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}