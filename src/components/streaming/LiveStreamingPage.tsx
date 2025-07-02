import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  ArrowLeft, 
  Zap, 
  Bot, 
  User, 
  Send, 
  Play, 
  Pause, 
  Download,
  Database,
  CheckCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useGeneration } from '../../context/GenerationContext';
import { databaseProjectsService } from '../../services/databaseProjectsService';
import { StreamingErrorBoundary } from './StreamingErrorBoundary';

interface AIMessage {
  id: string;
  agent: string;
  content: string;
  timestamp: Date;
  type: 'reasoning' | 'progress' | 'result' | 'user_chat';
}

interface GenerationTab {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  content: string;
  agent: string;
}

export function LiveStreamingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, startGeneration } = useGeneration();
  
  // Get parameters from URL
  const prompt = searchParams.get('prompt') || '';
  const dbType = searchParams.get('dbType') || 'PostgreSQL';
  const mode = searchParams.get('mode') || 'dbcoach';

  // State management
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [tabs, setTabs] = useState<GenerationTab[]>([
    { id: 'analysis', title: 'Requirements Analysis', status: 'pending', content: '', agent: 'Requirements Analyst' },
    { id: 'schema', title: 'Schema Design', status: 'pending', content: '', agent: 'Schema Architect' },
    { id: 'implementation', title: 'Implementation', status: 'pending', content: '', agent: 'Implementation Specialist' },
    { id: 'validation', title: 'Quality Validation', status: 'pending', content: '', agent: 'Quality Assurance' },
    { id: 'visualization', title: 'Visualization', status: 'pending', content: '', agent: 'Data Visualization' }
  ]);
  
  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cursorRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Character-by-character streaming state
  const [streamingContent, setStreamingContent] = useState<Map<string, { full: string; displayed: string; position: number }>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // Scroll position tracking
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Redirect if no prompt
  useEffect(() => {
    if (!prompt) {
      navigate('/', { replace: true });
    }
  }, [prompt, navigate]);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current && isAutoScrollEnabled) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAutoScrollEnabled]);

  // Track scroll events
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // User is scrolling up
      if (scrollTop < lastScrollTop) {
        setIsUserScrolling(true);
        setIsAutoScrollEnabled(false);
      }
      
      // User has scrolled to bottom
      if (scrollHeight - scrollTop - clientHeight < 10) {
        setIsAutoScrollEnabled(true);
        setIsUserScrolling(false);
      }
      
      setLastScrollTop(scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastScrollTop]);

  // Define the generation function
  const startLiveGeneration = useCallback(async () => {
    setIsGenerating(true);
    setIsStreaming(true);

    // Add initial user message
    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      agent: 'User',
      content: `Create a ${dbType} database: ${prompt}`,
      timestamp: new Date(),
      type: 'user_chat'
    };
    setMessages([userMessage]);

    // Simulate AI agent workflow
    const agents = [
      {
        name: 'Requirements Analyst',
        tab: 'analysis',
        color: 'from-blue-600 to-cyan-600',
        tasks: [
          'Analyzing domain and business context...',
          'Extracting entities and relationships...',
          'Identifying functional requirements...',
          'Classifying complexity and scale...',
          'Requirements analysis complete!'
        ]
      },
      {
        name: 'Schema Architect',
        tab: 'schema',
        color: 'from-purple-600 to-pink-600',
        tasks: [
          'Designing database schema structure...',
          'Defining tables and relationships...',
          'Applying normalization rules...',
          'Planning indexes and constraints...',
          'Schema design complete!'
        ]
      },
      {
        name: 'Implementation Specialist',
        tab: 'implementation',
        color: 'from-green-600 to-emerald-600',
        tasks: [
          'Generating CREATE TABLE statements...',
          'Creating sample data scripts...',
          'Building API endpoint examples...',
          'Setting up migration files...',
          'Implementation package ready!'
        ]
      },
      {
        name: 'Quality Assurance',
        tab: 'validation',
        color: 'from-orange-600 to-red-600',
        tasks: [
          'Validating schema design...',
          'Checking performance optimization...',
          'Reviewing security measures...',
          'Testing data integrity...',
          'Quality validation complete!'
        ]
      }
    ];

    try {
      // Start actual generation
      await startGeneration(prompt, dbType, mode as any);

      // Process each agent
      for (const agent of agents) {
        // Update tab to active
        setTabs(prev => prev.map(tab => 
          tab.id === agent.tab ? { ...tab, status: 'active' } : tab
        ));
        setActiveTab(agent.tab);

        // Add agent messages
        for (const task of agent.tasks) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const message: AIMessage = {
            id: `${agent.name}_${Date.now()}_${Math.random()}`,
            agent: agent.name,
            content: task,
            timestamp: new Date(),
            type: 'reasoning'
          };
          setMessages(prev => [...prev, message]);
        }

        // Generate content for this tab
        const content = generateTabContent(agent.tab, prompt, dbType);
        
        // Start streaming content
        setStreamingContent(prev => {
          const newMap = new Map(prev);
          newMap.set(agent.tab, { full: content, displayed: '', position: 0 });
          return newMap;
        });

        // Wait for streaming to complete - simplified approach
        const streamDuration = Math.max(2000, content.length * 50); // 50ms per character minimum
        await new Promise(resolve => setTimeout(resolve, streamDuration));

        // Mark tab as completed
        setTabs(prev => prev.map(tab => 
          tab.id === agent.tab ? { ...tab, status: 'completed' } : tab
        ));
      }

      // Final completion message
      const completionMessage: AIMessage = {
        id: `completion_${Date.now()}`,
        agent: 'DB.Coach',
        content: '✅ Database design complete! All components generated successfully.',
        timestamp: new Date(),
        type: 'result'
      };
      setMessages(prev => [...prev, completionMessage]);

    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage: AIMessage = {
        id: `error_${Date.now()}`,
        agent: 'System',
        content: `❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        type: 'reasoning'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
    }
  }, [prompt, dbType, mode, startGeneration]);

  // Initialize generation
  useEffect(() => {
    if (prompt && user && !isGenerating) {
      startLiveGeneration().catch(error => {
        console.error('Failed to start live generation:', error);
      });
    }
  }, [prompt, user, isGenerating, startLiveGeneration]);

  // Character streaming effect
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setStreamingContent(prev => {
        const newMap = new Map(prev);
        let hasChanges = false;

        newMap.forEach((data, tabId) => {
          if (data.position < data.full.length) {
            const charsToAdd = Math.min(3, data.full.length - data.position); // 3 chars at a time
            data.displayed = data.full.substring(0, data.position + charsToAdd);
            data.position += charsToAdd;
            hasChanges = true;

            // Update tab content
            setTabs(prevTabs => prevTabs.map(tab => 
              tab.id === tabId ? { ...tab, content: data.displayed } : tab
            ));
          }
        });

        if (!hasChanges) {
          setIsStreaming(false);
        }

        return newMap;
      });
    }, 50); // 20 chars per second

    return () => clearInterval(interval);
  }, [isStreaming]);

  const generateTabContent = (tabId: string, prompt: string, dbType: string): string => {
    switch (tabId) {
      case 'analysis':
        return `# Requirements Analysis

## Business Domain Analysis
- Domain: ${prompt.toLowerCase().includes('e-commerce') ? 'E-commerce Platform' : prompt.toLowerCase().includes('blog') ? 'Content Management' : 'Custom Application'}
- Scale: Medium (estimated 10K-100K users)
- Complexity: Moderate (10-20 entities)

## Key Requirements
- User management and authentication
- Core business entities and relationships
- Data integrity and validation
- Performance optimization
- Security compliance

## Entities Identified
1. Users/Accounts
2. Primary business objects
3. Relationships and associations
4. Supporting data structures

## Technical Specifications
- Database: ${dbType}
- Expected Load: Moderate
- Availability: High
- Consistency: Strong`;

      case 'schema':
        return `# Database Schema Design

## Core Tables

\`\`\`sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main business entity (example)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relationship table
CREATE TABLE user_products (
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    relationship_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id)
);
\`\`\`

## Indexes
\`\`\`sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_user_products_user_id ON user_products(user_id);
\`\`\`

## Constraints
- Foreign key relationships ensure data integrity
- Unique constraints prevent duplicates
- Check constraints validate data ranges`;

      case 'implementation':
        return `# Implementation Package

## Migration Scripts

\`\`\`sql
-- Migration 001: Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
\`\`\`

## Sample Data
\`\`\`sql
INSERT INTO users (username, email, password_hash) VALUES
('admin', 'admin@example.com', '$2b$12$sample_hash_here'),
('user1', 'user1@example.com', '$2b$12$sample_hash_here'),
('user2', 'user2@example.com', '$2b$12$sample_hash_here');
\`\`\`

## API Endpoints
\`\`\`javascript
// User management
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id

// Authentication
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
\`\`\``;

      case 'validation':
        return `# Quality Validation Report

## Schema Validation ✅
- All tables have primary keys
- Foreign key relationships are properly defined
- Appropriate data types selected
- Naming conventions followed

## Performance Review ✅
- Indexes created for frequently queried columns
- Query optimization opportunities identified
- Connection pooling recommended
- Caching strategy outlined

## Security Audit ✅
- Password hashing implemented
- SQL injection prevention measures
- Input validation required
- Access control mechanisms

## Scalability Assessment ✅
- Database design supports horizontal scaling
- Partition strategies identified
- Archive policies recommended
- Monitoring setup included

## Production Readiness ✅
- All constraints properly defined
- Error handling implemented
- Backup strategy outlined
- Deployment scripts ready

## Recommendations
1. Implement connection pooling (recommended: 10-20 connections)
2. Set up monitoring for slow queries
3. Regular backup schedule (daily incremental, weekly full)
4. Consider read replicas for scaling reads`;

      default:
        return `# ${tabId.charAt(0).toUpperCase() + tabId.slice(1)}

Content for ${tabId} tab is being generated...`;
    }
  };

  const handleUserMessage = useCallback(() => {
    if (!userInput.trim()) return;

    const message: AIMessage = {
      id: `user_${Date.now()}`,
      agent: 'User',
      content: userInput,
      timestamp: new Date(),
      type: 'user_chat'
    };

    setMessages(prev => [...prev, message]);
    setUserInput('');
    // Enable auto-scroll when user sends a message
    setIsAutoScrollEnabled(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: AIMessage = {
        id: `ai_${Date.now()}`,
        agent: 'DB.Coach Assistant',
        content: `I understand your question about "${userInput}". I'm currently focused on generating your database design, but I can help clarify anything about the process!`,
        timestamp: new Date(),
        type: 'reasoning'
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  }, [userInput]);

  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case 'analysis': return <AlertTriangle className="w-4 h-4" />;
      case 'schema': return <Database className="w-4 h-4" />;
      case 'implementation': return <Zap className="w-4 h-4" />;
      case 'validation': return <CheckCircle className="w-4 h-4" />;
      case 'visualization': return <Bot className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTabColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
      case 'completed': return 'border-green-500 bg-green-500/10 text-green-300';
      default: return 'border-slate-600 bg-slate-800/50 text-slate-400';
    }
  };

  const getAgentColor = (agent: string): string => {
    const colors = {
      'Requirements Analyst': 'from-blue-600 to-cyan-600',
      'Schema Architect': 'from-purple-600 to-pink-600',
      'Implementation Specialist': 'from-green-600 to-emerald-600',
      'Quality Assurance': 'from-orange-600 to-red-600',
      'DB.Coach Assistant': 'from-purple-600 to-blue-600',
      'User': 'from-slate-600 to-slate-700'
    };
    return colors[agent as keyof typeof colors] || 'from-slate-600 to-slate-700';
  };

  // Scroll helper function to programmatically scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current && isAutoScrollEnabled) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!prompt) return null;

  return (
    <StreamingErrorBoundary>
      <ProtectedRoute>
        <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
        {/* Header */}
        <nav className="p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              
              <div className="flex items-center space-x-2 text-slate-400">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-300 font-medium">Live Generation</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link to="/projects" className="px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200">
                Projects
              </Link>
              <Link to="/settings" className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: AI Agent Stream + Chat */}
          <div className="w-[30%] min-w-[300px] lg:w-[30%] md:w-[35%] sm:w-[40%] border-r border-slate-700/50 bg-slate-800/20 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                AI Agent Collaboration
              </h3>
              <p className="text-sm text-slate-400">Real-time agent communication and user chat</p>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 relative">
              {/* Fade overlay at top */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-800/20 to-transparent z-10 pointer-events-none"></div>
              
              {/* Scrollable content */}
              <div 
                ref={messagesContainerRef}
                className="h-full p-4 overflow-y-auto scrollbar-elegant scroll-smooth"
                onScroll={() => {
                  if (!messagesContainerRef.current) return;
                  
                  const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                  // Check if scrolled to bottom
                  const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
                  
                  if (isAtBottom && !isAutoScrollEnabled) {
                    setIsAutoScrollEnabled(true);
                  }
                }}
              >
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getAgentColor(message.agent)} flex items-center justify-center flex-shrink-0`}>
                        {message.agent === 'User' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{message.agent}</span>
                          <span className="text-xs text-slate-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className={`rounded-lg p-3 ${
                          message.agent === 'User' 
                            ? 'bg-purple-600/20 border border-purple-500/30 text-purple-200'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-300'
                        }`}>
                          <p className="leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isGenerating && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-600 to-teal-600 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">AI Agents</span>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-yellow-500/30">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-yellow-300 text-sm">Collaborating...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>
              
              {/* Fade overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-800/20 to-transparent z-10 pointer-events-none"></div>
              
              {/* Scroll indicator */}
              {!isAutoScrollEnabled && (
                <button
                  className="absolute bottom-4 right-4 z-20 p-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-full shadow-lg animate-bounce"
                  onClick={scrollToBottom}
                  aria-label="Scroll to bottom"
                >
                  <ArrowLeft className="w-4 h-4 transform rotate-90" />
                </button>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserMessage()}
                  placeholder="Ask questions or provide additional requirements..."
                  className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleUserMessage}
                  disabled={!userInput.trim()}
                  className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Results with Tabs */}
          <div className="w-[70%] lg:w-[70%] md:w-[65%] sm:w-[60%] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-green-400" />
                Generated Database Design
              </h3>
              <p className="text-sm text-slate-400">Step-by-step results visualization</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700/50 bg-slate-800/20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                      : getTabColor(tab.status)
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {getTabIcon(tab.id)}
                    <span className="hidden lg:inline">{tab.title}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`${activeTab === tab.id ? 'block' : 'hidden'}`}
                >
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 min-h-[400px] overflow-hidden">
                    {/* Content area with position indicator */}
                    <div className="relative h-full">
                      {tab.content ? (
                        <>
                          {/* Position indicator */}
                          {tab.status === 'active' && isStreaming && (
                            <div className="absolute top-2 right-2 z-10 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1 border border-slate-600/50 transition-all duration-300 ease-in-out">
                              <div className="flex items-center gap-2 text-xs">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-green-300 font-medium transition-all duration-300 ease-in-out">
                                  {Math.round((streamingContent.get(tab.id)?.position || 0) / (streamingContent.get(tab.id)?.full.length || 1) * 100)}%
                                </span>
                                <span className="text-slate-400 transition-all duration-300 ease-in-out">
                                  ({streamingContent.get(tab.id)?.position || 0}/{streamingContent.get(tab.id)?.full.length || 0})
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="h-full p-4 overflow-y-auto scrollbar-elegant scroll-smooth">
                            <div className="text-slate-200 whitespace-pre-wrap font-mono text-sm leading-relaxed transition-all duration-300 ease-in-out">
                              {tab.content}
                              {tab.status === 'active' && isStreaming && (
                                <span className="inline-block w-2 h-5 bg-green-400 animate-pulse ml-1 transition-opacity duration-300" />
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-40 text-slate-500">
                          {tab.status === 'pending' ? (
                            <span>Waiting for {tab.agent}...</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Generating content...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </ProtectedRoute>
    </StreamingErrorBoundary>
  );
}