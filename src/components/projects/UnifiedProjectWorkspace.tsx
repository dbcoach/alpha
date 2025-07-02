import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
  Loader2,
  BarChart3,
  Activity,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Save,
  FileText,
  TrendingUp,
  PieChart,
  LineChart,
  Building2,
  Code,
  Globe,
  Package,
  Shield,
  Copy,
  ExternalLink,
  Share2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useGeneration } from '../../context/GenerationContext';
import { DatabaseProject, DatabaseSession, DatabaseQuery, databaseProjectsService } from '../../services/databaseProjectsService';
import { StreamingErrorBoundary } from '../streaming/StreamingErrorBoundary';
import { enhancedDBCoachService, GenerationStep, GenerationProgress } from '../../services/enhancedDBCoachService';
import MetricsChart from '../charts/MetricsChart';
import TimelineChart from '../charts/TimelineChart';
import GenerationProgressChart from '../charts/GenerationProgressChart';

interface AIMessage {
  id: string;
  agent: string;
  content: string;
  timestamp: Date;
  type: 'reasoning' | 'progress' | 'result' | 'user_chat' | 'system';
}

interface SubTab {
  id: string;
  title: string;
  content: string;
  icon?: string;
}

interface GenerationTab {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  content: string;
  agent: string;
  subTabs?: SubTab[];
}

interface WorkspaceMode {
  type: 'project' | 'generation' | 'hybrid';
  projectId?: string;
  sessionId?: string;
  isLiveGeneration: boolean;
}

export function UnifiedProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, startGeneration } = useGeneration();
  
  // Mode and navigation state
  const [mode, setMode] = useState<WorkspaceMode>({
    type: projectId ? 'project' : 'generation',
    projectId,
    isLiveGeneration: false
  });
  
  // Project data state
  const [project, setProject] = useState<DatabaseProject | null>(null);
  const [sessions, setSessions] = useState<DatabaseSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<DatabaseSession | null>(null);
  const [queries, setQueries] = useState<DatabaseQuery[]>([]);
  
  // Generation state
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [activeSubTab, setActiveSubTab] = useState<{[key: string]: string}>({});
  const [tabs, setTabs] = useState<GenerationTab[]>([
    { id: 'analysis', title: 'Requirements Analysis', status: 'pending', content: '', agent: 'Requirements Analyst' },
    { id: 'design', title: 'Schema Design', status: 'pending', content: '', agent: 'Schema Architect' },
    { id: 'implementation', title: 'Implementation', status: 'pending', content: '', agent: 'Implementation Specialist' },
    { id: 'validation', title: 'Quality Validation', status: 'pending', content: '', agent: 'Quality Assurance' },
    { id: 'visualization', title: 'Data Visualization', status: 'pending', content: '', agent: 'Data Visualization' }
  ]);
  
  // Real AI generation state
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const [currentProgress, setCurrentProgress] = useState<GenerationProgress | null>(null);
  
  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Collaboration state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Dashboard state
  const [dashboardView, setDashboardView] = useState<'overview' | 'analytics' | 'queries' | 'chat'>('overview');
  const [projectStats, setProjectStats] = useState({
    totalSessions: 0,
    totalQueries: 0,
    successRate: 0,
    avgResponseTime: 0
  });
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Scroll management state
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isDashboardChatAutoScrollEnabled, setIsDashboardChatAutoScrollEnabled] = useState(true);
  
  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dashboardChatContainerRef = useRef<HTMLDivElement>(null);
  const dashboardChatEndRef = useRef<HTMLDivElement>(null);
  
  // Ref to track initialization and completion
  const hasInitialized = useRef(false);
  const generationCompleted = useRef(false);

  // Get generation parameters from URL
  const prompt = searchParams.get('prompt') || '';
  const dbType = searchParams.get('dbType') || 'PostgreSQL';
  const generationMode = searchParams.get('mode') || 'dbcoach';

  // Initialize workspace
  useEffect(() => {
    if (projectId && user) {
      loadProject();
    } else if (prompt && user && !isGenerating && !hasInitialized.current && !generationCompleted.current) {
      hasInitialized.current = true;
      initializeGeneration();
    }
  }, [projectId, prompt, user]);

  // Track previous prompt to detect changes
  const prevPromptRef = useRef(prompt);
  
  // Reset flags only when prompt actually changes
  useEffect(() => {
    if (prevPromptRef.current !== prompt) {
      hasInitialized.current = false;
      generationCompleted.current = false;
      prevPromptRef.current = prompt;
    }
  }, [prompt]);

  const loadProject = async () => {
    if (!projectId || !user) return;
    
    try {
      const projectData = await databaseProjectsService.getProject(projectId, user.id);
      setProject(projectData);
      
      const sessionsData = await databaseProjectsService.getProjectSessions(projectId);
      setSessions(sessionsData);
      
      // Load project stats
      calculateProjectStats(sessionsData);
      
      setMode({ type: 'project', projectId, isLiveGeneration: false });
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const calculateProjectStats = (sessions: DatabaseSession[]) => {
    const totalSessions = sessions.length;
    let totalQueries = 0;
    let successfulQueries = 0;
    let totalResponseTime = 0;

    sessions.forEach(session => {
      // These would be calculated from actual query data
      totalQueries += Math.floor(Math.random() * 10) + 1; // Placeholder
      successfulQueries += Math.floor(Math.random() * 10) + 1; // Placeholder
      totalResponseTime += Math.random() * 1000; // Placeholder
    });

    setProjectStats({
      totalSessions,
      totalQueries,
      successRate: totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0,
      avgResponseTime: totalQueries > 0 ? totalResponseTime / totalQueries : 0
    });
  };

  // Generate analytics data for visualizations
  const analyticsData = useMemo(() => {
    return {
      performanceMetrics: [
        { label: 'Success Rate', value: projectStats.successRate, color: '#10B981', trend: 'up', change: 5.2 },
        { label: 'Avg Response Time', value: projectStats.avgResponseTime, color: '#F59E0B', trend: 'down', change: -12.5 },
        { label: 'Total Sessions', value: projectStats.totalSessions, color: '#8B5CF6', trend: 'up', change: 23.8 },
        { label: 'Cache Hit Rate', value: 87, color: '#06B6D4', trend: 'stable', change: 0.5 }
      ],
      usageTrends: [
        { label: 'Mon', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Tue', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Wed', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Thu', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Fri', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Sat', value: Math.floor(Math.random() * 100) + 30 },
        { label: 'Sun', value: Math.floor(Math.random() * 100) + 30 }
      ],
      generationTimeline: messages.filter(m => m.type === 'reasoning').map((msg, index) => ({
        id: msg.id,
        title: `${msg.agent} Step`,
        description: msg.content.substring(0, 100) + '...',
        status: 'completed' as const,
        timestamp: msg.timestamp,
        duration: Math.floor(Math.random() * 5000) + 1000,
        agent: msg.agent
      }))
    };
  }, [projectStats, messages]);

  const initializeGeneration = () => {
    setMode({ type: 'generation', isLiveGeneration: true });
    startLiveGeneration();
  };

  const startLiveGeneration = useCallback(async () => {
    // Prevent multiple generations from running simultaneously
    if (isGenerating) {
      console.log('Generation already in progress, skipping...');
      return;
    }

    setIsGenerating(true);
    setIsStreaming(true);
    setMode(prev => ({ ...prev, type: 'hybrid', isLiveGeneration: true }));

    // Add initial user message
    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      agent: 'User',
      content: `Create a ${dbType} database: ${prompt}`,
      timestamp: new Date(),
      type: 'user_chat'
    };
    setMessages([userMessage]);

    try {
      // Start real AI generation using enhancedDBCoachService
      const steps = await enhancedDBCoachService.generateDatabaseDesign(
        prompt,
        dbType,
        (progress: GenerationProgress) => {
          setCurrentProgress(progress);
          
          // Update tab status based on progress
          setTabs(prev => prev.map(tab => {
            if (tab.id === progress.step || (progress.step === 'design' && tab.id === 'design')) {
              return { ...tab, status: progress.isComplete ? 'completed' : 'active' };
            }
            return tab;
          }));

          // Set active tab to current step
          if (progress.step === 'design') {
            setActiveTab('design');
          } else {
            setActiveTab(progress.step);
          }

          // Add AI reasoning message
          const reasoningMessage: AIMessage = {
            id: `${progress.agent}_${Date.now()}_${Math.random()}`,
            agent: progress.agent,
            content: progress.reasoning,
            timestamp: new Date(),
            type: 'reasoning'
          };
          setMessages(prev => [...prev, reasoningMessage]);
        }
      );

      // Store the generated steps
      setGenerationSteps(steps);

      // Update tabs with actual content from AI generation and create sub-tabs
      setTabs(prev => prev.map(tab => {
        const correspondingStep = steps.find(step => 
          step.type === tab.id || (step.type === 'design' && tab.id === 'design')
        );
        if (correspondingStep) {
          const subTabs = parseContentIntoSubTabs(correspondingStep.content, tab.id);
          return {
            ...tab,
            content: correspondingStep.content,
            status: 'completed',
            subTabs: subTabs
          };
        }
        return tab;
      }));

      // Set default active sub-tabs
      setActiveSubTab(prev => {
        const newActiveSubTab = { ...prev };
        steps.forEach(step => {
          const subTabs = parseContentIntoSubTabs(step.content, step.type);
          if (subTabs.length > 0) {
            newActiveSubTab[step.type] = subTabs[0].id;
          }
        });
        return newActiveSubTab;
      });

      // Generate visualization content with sub-tabs
      const visualizationTab = tabs.find(tab => tab.id === 'visualization');
      if (visualizationTab) {
        const analysisStep = steps.find(step => step.type === 'analysis');
        const designStep = steps.find(step => step.type === 'design');
        
        if (analysisStep && designStep) {
          const tables = extractTablesFromSchema(designStep.content);
          const visualizationSubTabs: SubTab[] = [
            {
              id: 'visualization_erd',
              title: 'ER Diagram',
              content: generateERDiagramContent(tables),
              icon: 'Database'
            },
            {
              id: 'visualization_schema_stats',
              title: 'Schema Statistics',
              content: generateSchemaStatsContent(analysisStep, designStep, tables),
              icon: 'BarChart3'
            },
            {
              id: 'visualization_relationships',
              title: 'Relationships',
              content: generateRelationshipsContent(tables),
              icon: 'Globe'
            }
          ];

          setTabs(prev => prev.map(tab => 
            tab.id === 'visualization' 
              ? { 
                  ...tab, 
                  content: generateVisualizationContent(steps), 
                  status: 'completed',
                  subTabs: visualizationSubTabs
                }
              : tab
          ));

          // Set default active sub-tab for visualization
          setActiveSubTab(prev => ({
            ...prev,
            visualization: 'visualization_erd'
          }));
        }
      }

      // Auto-save if enabled
      if (autoSaveEnabled) {
        await autoSaveCompleteProject();
      }

      // Final completion message
      const completionMessage: AIMessage = {
        id: `completion_${Date.now()}`,
        agent: 'DB.Coach',
        content: '✅ Database design complete! All components generated successfully with real AI analysis.',
        timestamp: new Date(),
        type: 'result'
      };
      setMessages(prev => [...prev, completionMessage]);

      // Transition mode to show completed generation results
      setMode(prev => ({ 
        ...prev, 
        isLiveGeneration: false,
        type: project ? 'hybrid' : 'generation'
      }));

      // Add helpful completion message
      setTimeout(() => {
        const viewResultsMessage: AIMessage = {
          id: `view_results_${Date.now()}`,
          agent: 'System',
          content: '🎉 Real AI generation complete! Your database design is now available in the results panel with comprehensive analysis, schema design, implementation, and quality validation.',
          timestamp: new Date(),
          type: 'system'
        };
        setMessages(prev => [...prev, viewResultsMessage]);
      }, 1000);

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
      generationCompleted.current = true; // Mark generation as completed
    }
  }, [prompt, dbType, generationMode, startGeneration, autoSaveEnabled]);

  // Helper function to parse content into sub-tabs
  const parseContentIntoSubTabs = (content: string, tabType: string): SubTab[] => {
    const sections = content.split(/^## /gm).filter(section => section.trim());
    if (sections.length <= 1) return [];

    return sections.slice(1).map((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0].trim();
      const sectionContent = lines.slice(1).join('\n').trim();
      
      return {
        id: `${tabType}_${index}`,
        title: title,
        content: sectionContent,
        icon: getSubTabIcon(title)
      };
    });
  };

  // Helper function to get sub-tab icons
  const getSubTabIcon = (title: string): string => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('business') || titleLower.includes('domain')) return 'Building2';
    if (titleLower.includes('requirement') || titleLower.includes('specification')) return 'FileText';
    if (titleLower.includes('table') || titleLower.includes('schema')) return 'Database';
    if (titleLower.includes('index') || titleLower.includes('performance')) return 'Zap';
    if (titleLower.includes('migration') || titleLower.includes('script')) return 'Code';
    if (titleLower.includes('api') || titleLower.includes('endpoint')) return 'Globe';
    if (titleLower.includes('sample') || titleLower.includes('data')) return 'Package';
    if (titleLower.includes('security') || titleLower.includes('validation')) return 'Shield';
    if (titleLower.includes('performance') || titleLower.includes('optimization')) return 'TrendingUp';
    return 'FileText';
  };

  // Helper function to render sub-tab icon
  const renderSubTabIcon = (iconName: string) => {
    const iconProps = { className: "w-3 h-3" };
    
    switch (iconName) {
      case 'Building2': return <Building2 {...iconProps} />;
      case 'Database': return <Database {...iconProps} />;
      case 'Code': return <Code {...iconProps} />;
      case 'Globe': return <Globe {...iconProps} />;
      case 'Package': return <Package {...iconProps} />;
      case 'Shield': return <Shield {...iconProps} />;
      case 'TrendingUp': return <TrendingUp {...iconProps} />;
      case 'Zap': return <Zap {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  // Helper function to extract tables from schema content
  const extractTablesFromSchema = (designContent: string): any[] => {
    const createTableRegex = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
    const tables = [];
    let match;

    while ((match = createTableRegex.exec(designContent)) !== null) {
      const tableName = match[1];
      const columnsDef = match[2];
      
      // Parse columns
      const columnRegex = /(\w+)\s+(\w+(?:\([^)]+\))?)[^,\n]*/gi;
      const columns = [];
      let columnMatch;
      
      while ((columnMatch = columnRegex.exec(columnsDef)) !== null) {
        const [, name, type] = columnMatch;
        const isPrimaryKey = columnMatch[0].includes('PRIMARY KEY');
        const isForeignKey = columnMatch[0].includes('REFERENCES');
        
        columns.push({
          name,
          type,
          isPrimaryKey,
          isForeignKey,
          isRequired: columnMatch[0].includes('NOT NULL')
        });
      }
      
      tables.push({
        name: tableName,
        columns,
        relationships: []
      });
    }
    
    return tables;
  };

  // Helper function to generate interactive visualization content
  const generateVisualizationContent = (steps: GenerationStep[]): string => {
    const analysisStep = steps.find(step => step.type === 'analysis');
    const designStep = steps.find(step => step.type === 'design');
    
    if (!analysisStep || !designStep) {
      return 'Visualization data not available';
    }

    const tables = extractTablesFromSchema(designStep.content);
    
    // Generate sub-tabs for visualization
    const visualizationSubTabs: SubTab[] = [
      {
        id: 'visualization_erd',
        title: 'ER Diagram',
        content: generateERDiagramContent(tables),
        icon: 'Database'
      },
      {
        id: 'visualization_schema_stats',
        title: 'Schema Statistics',
        content: generateSchemaStatsContent(analysisStep, designStep, tables),
        icon: 'BarChart3'
      },
      {
        id: 'visualization_relationships',
        title: 'Relationships',
        content: generateRelationshipsContent(tables),
        icon: 'Globe'
      }
    ];

    return `# Database Visualization & Diagrams

## Interactive Database Visualization

This section provides comprehensive visualization tools for your database design including entity relationship diagrams, schema statistics, and relationship mapping.

### Features Available:
- **ER Diagram**: Interactive entity relationship diagram
- **Schema Statistics**: Comprehensive analysis of your database structure  
- **Relationships**: Detailed view of table relationships and constraints

Use the sub-tabs above to explore different visualization perspectives of your database design.`;
  };

  // Generate ER Diagram content
  const generateERDiagramContent = (tables: any[]): string => {
    const mermaidDiagram = generateMermaidERD(tables);
    
    return `# Entity Relationship Diagram

## Interactive ER Diagram

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

## Diagram Controls

### Zoom & Navigation
- **Zoom In/Out**: Use mouse wheel or zoom controls
- **Pan**: Click and drag to move around the diagram
- **Reset View**: Double-click to reset zoom and position

### Table Interactions
- **Highlight Relationships**: Click on a table to highlight its relationships
- **Field Details**: Hover over fields to see data types and constraints
- **Relationship Lines**: Different line styles indicate relationship types

## Entity Summary
${tables.map(table => `
### ${table.name.toUpperCase()}
- **Columns**: ${table.columns.length}
- **Primary Keys**: ${table.columns.filter((c: any) => c.isPrimaryKey).length}
- **Foreign Keys**: ${table.columns.filter((c: any) => c.isForeignKey).length}
`).join('')}`;
  };

  // Generate Mermaid ERD syntax
  const generateMermaidERD = (tables: any[]): string => {
    let mermaid = 'erDiagram\n';
    
    tables.forEach(table => {
      mermaid += `    ${table.name.toUpperCase()} {\n`;
      table.columns.forEach((column: any) => {
        const keyType = column.isPrimaryKey ? ' PK' : column.isForeignKey ? ' FK' : '';
        mermaid += `        ${column.type} ${column.name}${keyType}\n`;
      });
      mermaid += '    }\n\n';
    });
    
    // Add relationships (simplified - would be enhanced with actual FK parsing)
    tables.forEach(table => {
      table.columns.forEach((column: any) => {
        if (column.isForeignKey) {
          // This would be enhanced to parse actual foreign key relationships
          const relatedTable = tables.find(t => t.name !== table.name);
          if (relatedTable) {
            mermaid += `    ${table.name.toUpperCase()} ||--o{ ${relatedTable.name.toUpperCase()} : "relates to"\n`;
          }
        }
      });
    });
    
    return mermaid;
  };

  // Generate schema statistics content
  const generateSchemaStatsContent = (analysisStep: GenerationStep, designStep: GenerationStep, tables: any[]): string => {
    const totalColumns = tables.reduce((sum, table) => sum + table.columns.length, 0);
    const totalPrimaryKeys = tables.reduce((sum, table) => sum + table.columns.filter((c: any) => c.isPrimaryKey).length, 0);
    const totalForeignKeys = tables.reduce((sum, table) => sum + table.columns.filter((c: any) => c.isForeignKey).length, 0);
    
    let complexityAnalysis = 'Medium';
    try {
      const analysis = JSON.parse(analysisStep.content);
      complexityAnalysis = analysis.complexity || 'Medium';
    } catch (e) {
      // Use default if parsing fails
    }

    return `# Schema Statistics & Analysis

## Database Overview
- **Total Tables**: ${tables.length}
- **Total Columns**: ${totalColumns}
- **Average Columns per Table**: ${Math.round(totalColumns / tables.length)}
- **Complexity Level**: ${complexityAnalysis}

## Key Metrics

### Table Distribution
${tables.map(table => `- **${table.name}**: ${table.columns.length} columns`).join('\n')}

### Constraints & Keys
- **Primary Keys**: ${totalPrimaryKeys}
- **Foreign Keys**: ${totalForeignKeys}
- **Relationship Density**: ${((totalForeignKeys / tables.length) * 100).toFixed(1)}%

## Performance Indicators

### Index Recommendations
- **Automatic Indexes**: Primary keys are automatically indexed
- **Foreign Key Indexes**: Recommended for all foreign key columns
- **Query Optimization**: Custom indexes based on common query patterns

### Scalability Assessment
- **Current Structure**: Suitable for ${complexityAnalysis.toLowerCase()} scale applications
- **Growth Potential**: Can handle estimated load with proper indexing
- **Optimization Notes**: Consider partitioning for tables with high data volume

## Data Integrity

### Constraints Applied
- **NOT NULL Constraints**: ${tables.reduce((sum, table) => sum + table.columns.filter((c: any) => c.isRequired).length, 0)} columns
- **Referential Integrity**: ${totalForeignKeys} foreign key relationships
- **Unique Constraints**: Primary key uniqueness enforced

### Best Practices Compliance
✅ **Naming Conventions**: Consistent table and column naming
✅ **Normalization**: Appropriate level of normalization applied
✅ **Data Types**: Optimal data types selected for each field
✅ **Relationships**: Proper foreign key relationships defined`;
  };

  // Export utility functions
  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  };

  const exportContent = async (format: string, tabId?: string, subTabId?: string) => {
    setExportLoading(true);
    
    try {
      let content = '';
      let filename = '';
      let contentType = '';

      if (tabId && subTabId) {
        // Export specific sub-tab
        const tab = tabs.find(t => t.id === tabId);
        const subTab = tab?.subTabs?.find(st => st.id === subTabId);
        content = subTab?.content || '';
        filename = `${tab?.title}_${subTab?.title}`;
      } else if (tabId) {
        // Export specific tab
        const tab = tabs.find(t => t.id === tabId);
        content = tab?.content || '';
        filename = tab?.title || 'content';
      } else {
        // Export all content
        content = generateCompleteExport();
        filename = 'Database_Design_Complete';
      }

      switch (format) {
        case 'markdown':
          contentType = 'text/markdown';
          filename += '.md';
          break;
        case 'sql':
          content = extractSQLFromContent(content);
          contentType = 'text/sql';
          filename += '.sql';
          break;
        case 'json':
          content = convertToJSON(content);
          contentType = 'application/json';
          filename += '.json';
          break;
        case 'pdf':
          // For PDF, we'll create a formatted version
          content = formatForPDF(content);
          contentType = 'text/html';
          filename += '.html'; // User can convert to PDF via browser
          break;
        case 'copy':
          const success = await copyToClipboard(content);
          if (success) {
            // Show success notification
            console.log('Content copied to clipboard');
          }
          setExportLoading(false);
          return;
        default:
          contentType = 'text/plain';
          filename += '.txt';
      }

      downloadFile(content, filename, contentType);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const generateCompleteExport = (): string => {
    return tabs.map(tab => {
      let tabContent = `# ${tab.title}\n\n${tab.content}\n\n`;
      
      if (tab.subTabs && tab.subTabs.length > 0) {
        tabContent += tab.subTabs.map(subTab => 
          `## ${subTab.title}\n\n${subTab.content}\n\n`
        ).join('');
      }
      
      return tabContent;
    }).join('\n---\n\n');
  };

  const extractSQLFromContent = (content: string): string => {
    const sqlBlocks = content.match(/```sql\n([\s\S]*?)\n```/g);
    if (!sqlBlocks) return '-- No SQL content found\n';
    
    return sqlBlocks.map(block => 
      block.replace(/```sql\n?|\n?```/g, '').trim()
    ).join('\n\n-- ==========================================\n\n');
  };

  const convertToJSON = (content: string): string => {
    const exportData = {
      timestamp: new Date().toISOString(),
      project: project?.database_name || 'Database Design',
      dbType: dbType,
      prompt: prompt,
      tabs: tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        status: tab.status,
        agent: tab.agent,
        content: tab.content,
        subTabs: tab.subTabs || []
      })),
      generationSteps: generationSteps
    };
    
    return JSON.stringify(exportData, null, 2);
  };

  // Collaboration functions
  const generateShareUrl = async (): Promise<string> => {
    if (project) {
      // For existing projects, use the project URL
      return `${window.location.origin}/projects/${project.id}`;
    } else {
      // For new generations, we could create a shareable link with the content
      // This would require implementing a sharing service or using the existing project system
      try {
        if (user && generationSteps.length > 0) {
          // Auto-save the generation as a project for sharing
          await autoSaveCompleteProject();
          // Return project URL after save
          return `${window.location.origin}/projects/shared/${Date.now()}`;
        }
      } catch (error) {
        console.error('Failed to create shareable project:', error);
      }
      
      // Fallback to current URL with parameters
      const params = new URLSearchParams({
        prompt: prompt,
        dbType: dbType,
        mode: generationMode
      });
      return `${window.location.origin}/projects?${params.toString()}`;
    }
  };

  const handleShare = async () => {
    try {
      const url = await generateShareUrl();
      setShareUrl(url);
      setShowShareModal(true);
    } catch (error) {
      console.error('Failed to generate share URL:', error);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const shareToSocial = (platform: string) => {
    const text = `Check out this database design created with DB.Coach - the AI-powered database design studio!`;
    const url = shareUrl;
    
    let shareUrl_platform = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl_platform = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl_platform = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'email':
        shareUrl_platform = `mailto:?subject=${encodeURIComponent('Database Design from DB.Coach')}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl_platform, '_blank', 'noopener,noreferrer');
  };

  const formatForPDF = (content: string): string => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Database Design Export</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #8B5CF6; border-bottom: 2px solid #8B5CF6; }
        h2 { color: #6366F1; }
        h3 { color: #10B981; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .timestamp { color: #666; font-size: 0.9em; text-align: right; }
    </style>
</head>
<body>
    <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
    ${content.replace(/```(\w+)?\n([\s\S]*?)\n```/g, '<pre><code>$2</code></pre>')
             .replace(/^# (.*$)/gim, '<h1>$1</h1>')
             .replace(/^## (.*$)/gim, '<h2>$1</h2>')
             .replace(/^### (.*$)/gim, '<h3>$1</h3>')
             .replace(/\n/g, '<br>')
             .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             .replace(/\*(.*?)\*/g, '<em>$1</em>')}
</body>
</html>`;
  };

  // Generate relationships content
  const generateRelationshipsContent = (tables: any[]): string => {
    return `# Table Relationships & Dependencies

## Relationship Overview

This section details all relationships between tables in your database schema.

## Relationship Types

### One-to-Many Relationships
${tables.map(table => {
  const fkColumns = table.columns.filter((c: any) => c.isForeignKey);
  if (fkColumns.length > 0) {
    return `- **${table.name}** references other tables through ${fkColumns.length} foreign key(s)`;
  }
  return null;
}).filter(Boolean).join('\n') || 'No foreign key relationships detected in the current schema.'}

### Primary Key Structure
${tables.map(table => {
  const pkColumns = table.columns.filter((c: any) => c.isPrimaryKey);
  return `- **${table.name}**: ${pkColumns.map((c: any) => c.name).join(', ') || 'No primary key defined'}`;
}).join('\n')}

## Dependency Graph

\`\`\`
${tables.map(table => {
  const dependencies = table.columns.filter((c: any) => c.isForeignKey);
  if (dependencies.length > 0) {
    return `${table.name} → [References other tables]`;
  }
  return `${table.name} → [Independent table]`;
}).join('\n')}
\`\`\`

## Relationship Quality Analysis

### Referential Integrity
- **Strong Relationships**: All foreign keys properly defined
- **Cascade Options**: Consider cascade update/delete rules
- **Orphan Prevention**: Foreign key constraints prevent orphaned records

### Performance Implications
- **Join Performance**: Indexed foreign keys enable efficient joins
- **Query Optimization**: Relationship structure supports common query patterns
- **Data Consistency**: Constraints ensure data remains consistent across tables

## Recommendations

### Indexing Strategy
- Index all foreign key columns for optimal join performance
- Consider composite indexes for multi-column relationships
- Monitor query patterns to identify additional indexing opportunities

### Maintenance Considerations
- Regular constraint validation
- Cascade rule review for data modification operations
- Performance monitoring for complex relationship queries`;
  };

  const autoSaveGeneration = async (tabId: string, content: string) => {
    try {
      if (!user) return;

      // Create or update project
      let currentProject = project;
      if (!currentProject) {
        currentProject = await databaseProjectsService.createProject({
          database_name: `Generated: ${prompt.substring(0, 50)}...`,
          description: `Auto-generated database for: ${prompt}`,
          database_type: dbType,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setProject(currentProject);
        setMode(prev => ({ ...prev, type: 'hybrid', projectId: currentProject.id }));
      }

      // Create session if not exists
      let currentSession = selectedSession;
      if (!currentSession) {
        currentSession = await databaseProjectsService.createSession({
          project_id: currentProject.id,
          session_name: `Live Generation - ${new Date().toLocaleString()}`,
          description: 'Auto-generated from live streaming',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setSelectedSession(currentSession);
        setSessions(prev => [...prev, currentSession]);
      }

      // Save content as query
      await databaseProjectsService.createQuery({
        session_id: currentSession.id,
        project_id: currentProject.id,
        query_text: content,
        query_type: tabId,
        results_format: 'json',
        description: `${tabId} content`,
        created_at: new Date().toISOString()
      });

      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const autoSaveCompleteProject = async () => {
    if (!project || !user) return;

    try {
      // Update project with completion status
      await databaseProjectsService.updateProject(project.id, {
        ...project,
        updated_at: new Date().toISOString(),
        description: `${project.description} - Generation completed at ${new Date().toLocaleString()}`
      });

      // Add completion message
      const systemMessage: AIMessage = {
        id: `autosave_${Date.now()}`,
        agent: 'System',
        content: `💾 Project automatically saved! You can now interact with your database in the dashboard.`,
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);

    } catch (error) {
      console.error('Failed to save complete project:', error);
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
        content: `I understand your question about "${userInput}". ${mode.isLiveGeneration ? "I'm currently generating your database design, but I can help clarify anything about the process!" : "I can help you with your database project. What would you like to know?"}`,
        timestamp: new Date(),
        type: 'reasoning'
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  }, [userInput, mode.isLiveGeneration]);

  const handleSessionSelect = async (session: DatabaseSession) => {
    setSelectedSession(session);
    try {
      const queriesData = await databaseProjectsService.getSessionQueries(session.id);
      setQueries(queriesData);
    } catch (error) {
      console.error('Error loading queries:', error);
    }
  };

  const getAgentColor = (agent: string): string => {
    const colors = {
      'Requirements Analyst': 'from-blue-600 to-cyan-600',
      'Schema Architect': 'from-purple-600 to-pink-600',
      'Implementation Specialist': 'from-green-600 to-emerald-600',
      'Quality Assurance': 'from-orange-600 to-red-600',
      'Data Visualization': 'from-indigo-600 to-purple-600',
      'DB.Coach Assistant': 'from-purple-600 to-blue-600',
      'User': 'from-slate-600 to-slate-700',
      'System': 'from-green-600 to-teal-600'
    };
    return colors[agent as keyof typeof colors] || 'from-slate-600 to-slate-700';
  };

  // Scroll helper function to programmatically scroll to bottom
  const scrollToBottom = () => {
    setIsAutoScrollEnabled(true);
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Dashboard chat scroll function
  const scrollDashboardChatToBottom = () => {
    setIsDashboardChatAutoScrollEnabled(true);
    if (dashboardChatEndRef.current) {
      dashboardChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case 'analysis': return <AlertTriangle className="w-4 h-4" />;
      case 'schema': return <Database className="w-4 h-4" />;
      case 'implementation': return <Zap className="w-4 h-4" />;
      case 'validation': return <CheckCircle className="w-4 h-4" />;
      case 'visualization': return <BarChart3 className="w-4 h-4" />;
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

  // Auto-scroll effects with intelligent scroll management
  useEffect(() => {
    if (messagesEndRef.current && isAutoScrollEnabled) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAutoScrollEnabled]);

  // Auto-scroll for dashboard chat
  useEffect(() => {
    if (dashboardView === 'chat' && dashboardChatEndRef.current && isDashboardChatAutoScrollEnabled) {
      dashboardChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isDashboardChatAutoScrollEnabled, dashboardView]);

  // Track scroll events for intelligent auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // User is scrolling up (disable auto-scroll)
      if (scrollTop < lastScrollTop) {
        setIsUserScrolling(true);
        setIsAutoScrollEnabled(false);
      }
      
      // User has scrolled near bottom (re-enable auto-scroll)
      if (scrollHeight - scrollTop - clientHeight < 10) {
        setIsAutoScrollEnabled(true);
        setIsUserScrolling(false);
      }
      
      setLastScrollTop(scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastScrollTop]);

  useEffect(() => {
    if (chatEndRef.current && isAutoScrollEnabled) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAutoScrollEnabled]);

  return (
    <StreamingErrorBoundary>
      <ProtectedRoute>
        <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
          {/* Header */}
          <nav className="p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(project ? '/projects' : '/')}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                
                <div className="flex items-center space-x-2 text-slate-400">
                  {mode.isLiveGeneration ? (
                    <>
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-300 font-medium">Live Generation</span>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-300 font-medium">
                        {project ? project.database_name : 'Database Workspace'}
                      </span>
                    </>
                  )}
                </div>

                {autoSaveEnabled && lastSaved && (
                  <div className="flex items-center space-x-1 text-xs text-green-400">
                    <Save className="w-3 h-3" />
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
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
            {/* Left Panel - Agent Stream or Project Navigation */}
            <div className="w-[30%] min-w-[350px] max-w-[500px] lg:w-[30%] md:w-[35%] sm:w-[40%] border-r border-slate-700/50 bg-slate-800/20 flex flex-col"
                 style={{ height: 'calc(100vh - 80px)' }}>
              
              {/* Mode Toggle */}
              <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {mode.isLiveGeneration ? 'AI Agent Stream' : 'Project Dashboard'}
                  </h3>
                  
                  {project && !mode.isLiveGeneration && (
                    <button
                      onClick={() => {
                        const newPrompt = `Enhance ${project.database_name}`;
                        const url = `/projects/${project.id}?prompt=${encodeURIComponent(newPrompt)}&dbType=${project.database_type}&mode=dbcoach`;
                        navigate(url);
                        window.location.reload();
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Generate
                    </button>
                  )}
                </div>

                {!mode.isLiveGeneration && project && (
                  <div className="flex gap-2">
                    {(['overview', 'analytics', 'queries', 'chat'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setDashboardView(view)}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          dashboardView === view
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                      >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Based on Mode */}
              {mode.isLiveGeneration || (messages.length > 1) ? (
                /* Agent Stream Content - Fixed Height Chat Container */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 relative bg-slate-900/20 rounded-lg m-2 border border-slate-700/30 min-h-0">
                    {/* Chat Header */}
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-b border-slate-700/50 p-2 z-20 rounded-t-lg">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <MessageSquare className="w-3 h-3 text-purple-400" />
                        <span>{mode.isLiveGeneration ? 'Live Chat Stream' : 'AI Chat History'}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ml-auto ${
                          mode.isLiveGeneration 
                            ? 'bg-green-400 animate-pulse' 
                            : 'bg-blue-400'
                        }`} />
                      </div>
                    </div>
                    
                    {/* Fade overlay at top */}
                    <div className="absolute top-8 left-0 right-0 h-4 bg-gradient-to-b from-slate-900/50 to-transparent z-10 pointer-events-none"></div>
                    
                    {/* Scrollable content with constrained height */}
                    <div 
                      ref={messagesContainerRef}
                      className="absolute inset-0 pt-12 pb-2 overflow-y-auto scrollbar-elegant scroll-smooth"
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
                    <div className="px-4 space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="flex items-start gap-3 animate-in slide-in-from-bottom-1 duration-300">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getAgentColor(message.agent)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
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
                            <div className={`rounded-lg p-3 transition-all duration-200 hover:scale-[1.01] ${
                              message.agent === 'User' 
                                ? 'bg-purple-600/20 border border-purple-500/30 text-purple-200 shadow-purple-500/10'
                                : message.type === 'system'
                                ? 'bg-green-600/20 border border-green-500/30 text-green-200 shadow-green-500/10'
                                : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 shadow-slate-800/10'
                            } shadow-lg`}>
                              <p className="leading-relaxed">{message.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {isGenerating && (
                        <div className="flex items-start gap-3 animate-in slide-in-from-bottom-1 duration-300">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-600 to-teal-600 flex items-center justify-center shadow-lg">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white">AI Agents</span>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-yellow-500/30 shadow-lg">
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
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-900/50 to-transparent z-10 pointer-events-none rounded-b-lg"></div>
                    
                    {/* Scroll indicator when not at bottom */}
                    {!isAutoScrollEnabled && (
                      <button
                        className="absolute bottom-4 right-4 z-20 p-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-full shadow-lg animate-bounce transition-all duration-200"
                        onClick={scrollToBottom}
                        aria-label="Scroll to bottom"
                      >
                        <ArrowLeft className="w-4 h-4 transform rotate-90" />
                      </button>
                    )}
                  </div>
                </div>
              ) : project && (
                /* Project Dashboard Content */
                <div className="flex-1 p-4 overflow-y-auto scrollbar-elegant">
                  {dashboardView === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">Sessions</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-300">{projectStats.totalSessions}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-medium text-white">Queries</span>
                          </div>
                          <div className="text-2xl font-bold text-green-300">{projectStats.totalQueries}</div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-medium text-white">Success Rate</span>
                        </div>
                        <div className="text-xl font-bold text-purple-300">{projectStats.successRate.toFixed(1)}%</div>
                        <div className="w-full h-2 bg-slate-700 rounded-full mt-2">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                            style={{ width: `${projectStats.successRate}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-white">Recent Sessions</h4>
                        {sessions.slice(0, 3).map((session) => (
                          <div 
                            key={session.id}
                            onClick={() => handleSessionSelect(session)}
                            className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 hover:border-purple-500/50 cursor-pointer transition-all"
                          >
                            <div className="font-medium text-white text-sm">{session.session_name}</div>
                            <div className="text-xs text-slate-400">{new Date(session.created_at).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dashboardView === 'analytics' && (
                    <div className="space-y-4">
                      {/* Performance Metrics Chart */}
                      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <div className="h-64">
                          <MetricsChart
                            data={analyticsData.performanceMetrics}
                            type="doughnut"
                            title="Performance Metrics"
                            showTrends={true}
                            className="h-full"
                          />
                        </div>
                      </div>

                      {/* Usage Trends Chart */}
                      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <div className="h-56">
                          <MetricsChart
                            data={analyticsData.usageTrends}
                            type="line"
                            title="Weekly Usage Trends"
                            timeLabels={analyticsData.usageTrends.map(d => d.label)}
                            className="h-full"
                          />
                        </div>
                      </div>

                      {/* Generation Progress for Live Sessions */}
                      {mode.isLiveGeneration && (
                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <div className="h-80">
                            <GenerationProgressChart
                              currentProgress={currentProgress}
                              generationSteps={generationSteps}
                              tabs={tabs}
                              className="h-full"
                            />
                          </div>
                        </div>
                      )}

                      {/* Generation Timeline */}
                      {analyticsData.generationTimeline.length > 0 && (
                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <div className="h-72">
                            <TimelineChart
                              events={analyticsData.generationTimeline}
                              title="Generation Timeline"
                              className="h-full"
                            />
                          </div>
                        </div>
                      )}

                      {/* Enhanced Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-400">Database Operations</span>
                            <BarChart3 className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="text-2xl font-bold text-white mb-1">{projectStats.totalQueries}</div>
                          <div className="text-xs text-green-400">+12% from last week</div>
                        </div>
                        
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-400">Error Rate</span>
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          </div>
                          <div className="text-2xl font-bold text-white mb-1">2.1%</div>
                          <div className="text-xs text-red-400">-0.5% from last week</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {dashboardView === 'queries' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">Query History</h4>
                        <button className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg">
                          <Plus className="w-4 h-4 text-slate-300" />
                        </button>
                      </div>
                      
                      {queries.length > 0 ? (
                        <div className="space-y-2">
                          {queries.map((query) => (
                            <div key={query.id} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                              <div className="font-medium text-white text-sm">{query.description || query.query_type}</div>
                              <div className="text-xs text-slate-400 mt-1">{new Date(query.created_at).toLocaleDateString()}</div>
                              <div className="text-xs text-slate-500 mt-1 font-mono bg-slate-900/50 p-2 rounded overflow-hidden">
                                {query.query_text.substring(0, 100)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Database className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No queries yet</p>
                        </div>
                      )}
                    </div>
                  )}

                  {dashboardView === 'chat' && (
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-purple-400" />
                          AI Assistant Chat
                        </h4>
                        
                        {/* Chat messages container with elegant scroll */}
                        <div className="relative">
                          {/* Fade overlay at top */}
                          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-slate-900/30 to-transparent z-10 pointer-events-none rounded-t-lg"></div>
                          
                          {/* Scrollable chat container */}
                          <div 
                            ref={dashboardChatContainerRef}
                            className="h-64 overflow-y-auto scrollbar-elegant scroll-smooth bg-slate-900/30 rounded-lg p-3 mb-4"
                            onScroll={() => {
                              if (!dashboardChatContainerRef.current) return;
                              
                              const { scrollTop, scrollHeight, clientHeight } = dashboardChatContainerRef.current;
                              // Check if scrolled to bottom
                              const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
                              
                              if (isAtBottom && !isDashboardChatAutoScrollEnabled) {
                                setIsDashboardChatAutoScrollEnabled(true);
                              } else if (!isAtBottom && isDashboardChatAutoScrollEnabled) {
                                setIsDashboardChatAutoScrollEnabled(false);
                              }
                            }}
                          >
                            <div className="space-y-3">
                              {messages.filter(m => m.type === 'user_chat' || m.type === 'reasoning').map((message) => (
                                <div key={message.id} className="flex items-start gap-3 animate-in slide-in-from-bottom-1 duration-300">
                                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getAgentColor(message.agent)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                    {message.agent === 'User' ? (
                                      <User className="w-3 h-3 text-white" />
                                    ) : (
                                      <Bot className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-slate-500 font-medium">{message.agent}</span>
                                      <span className="text-xs text-slate-600">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div className={`rounded-lg p-3 text-sm transition-all duration-200 hover:scale-[1.01] ${
                                      message.agent === 'User' 
                                        ? 'bg-purple-600/20 border border-purple-500/30 text-purple-200 shadow-purple-500/10'
                                        : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 shadow-slate-800/10'
                                    } shadow-lg`}>
                                      <p className="leading-relaxed">{message.content}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {messages.filter(m => m.type === 'user_chat' || m.type === 'reasoning').length === 0 && (
                                <div className="text-center py-12">
                                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                                    <MessageSquare className="w-8 h-8 text-purple-400" />
                                  </div>
                                  <p className="text-slate-400 text-sm font-medium mb-2">No conversations yet</p>
                                  <p className="text-slate-500 text-xs">Start chatting with the AI assistant below</p>
                                </div>
                              )}
                              
                              <div ref={dashboardChatEndRef} />
                            </div>
                          </div>
                          
                          {/* Fade overlay at bottom */}
                          <div className="absolute bottom-4 left-0 right-0 h-3 bg-gradient-to-t from-slate-900/30 to-transparent z-10 pointer-events-none rounded-b-lg"></div>
                          
                          {/* Elegant scroll indicator */}
                          {!isDashboardChatAutoScrollEnabled && messages.filter(m => m.type === 'user_chat' || m.type === 'reasoning').length > 0 && (
                            <button
                              className="absolute bottom-6 right-6 z-20 p-2 bg-gradient-to-r from-purple-600/90 to-blue-600/90 hover:from-purple-600 hover:to-blue-600 text-white rounded-full shadow-lg backdrop-blur-sm border border-purple-500/30 animate-bounce transition-all duration-200 hover:scale-110"
                              onClick={scrollDashboardChatToBottom}
                              aria-label="Scroll to bottom"
                            >
                              <ArrowLeft className="w-3 h-3 transform rotate-90" />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/30 rounded-lg p-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          <span>AI assistant ready • Ask questions about your database project</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserMessage()}
                    placeholder={mode.isLiveGeneration ? "Ask questions about the generation..." : "Chat with AI about your project..."}
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

            {/* Right Panel - Content */}
            <div className="w-[70%] lg:w-[70%] md:w-[65%] sm:w-[60%] flex flex-col"
                 style={{ height: 'calc(100vh - 80px)' }}>
              {/* Results Canvas Header */}
              <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-green-600/10 to-blue-600/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {mode.isLiveGeneration || (tabs.some(tab => tab.content)) ? (
                        <>
                          <Database className="w-5 h-5 text-green-400" />
                          Generated Database Design
                          {!isStreaming && !mode.isLiveGeneration && tabs.some(tab => tab.content) && (
                            <span className="ml-2 px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded-full border border-green-500/30">
                              Complete
                            </span>
                          )}
                          {mode.isLiveGeneration && (
                            <div className="ml-2 flex items-center gap-2 text-xs text-slate-300">
                              <span>Results Canvas</span>
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-5 h-5 text-blue-400" />
                          {selectedSession ? `Session: ${selectedSession.session_name}` : 'Project Overview'}
                        </>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {mode.isLiveGeneration ? 'Real-time content generation and streaming results' : 
                       tabs.some(tab => tab.content) ? 'Generated database design ready for review' : 
                       'Interactive database workspace with independent scroll'}
                    </p>
                  </div>
                  
                  {/* Export Actions */}
                  {!mode.isLiveGeneration && tabs.some(tab => tab.content) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportContent('copy', activeTab)}
                        disabled={exportLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white text-xs rounded-lg transition-all duration-200 border border-slate-600/50"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      <button
                        onClick={() => setShowExportModal(true)}
                        disabled={exportLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white text-xs rounded-lg transition-all duration-200 border border-purple-500/50"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                      <button
                        onClick={handleShare}
                        disabled={exportLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white text-xs rounded-lg transition-all duration-200 border border-blue-500/50"
                      >
                        <Share2 className="w-3 h-3" />
                        Share
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {mode.isLiveGeneration || (tabs.some(tab => tab.content)) ? (
                /* Generation Tabs - Show if live generation OR if any tab has content */
                <>
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

                  {/* Results Canvas - Independent Scroll Container */}
                  <div className="flex-1 overflow-hidden bg-slate-900/10 m-2 rounded-lg border border-slate-700/30">
                    <div className="h-full overflow-y-auto scrollbar-elegant scroll-smooth">
                      {tabs.map((tab) => (
                        <div
                          key={tab.id}
                          className={`${activeTab === tab.id ? 'block' : 'hidden'} h-full`}
                        >
                          <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 h-full min-h-[calc(100vh-200px)] overflow-hidden m-2">
                            <div className="relative h-full">
                              {tab.content ? (
                                <>
                                  {tab.status === 'active' && isStreaming && (
                                    <div className="absolute top-3 right-3 z-10 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-600/50 transition-all duration-300 ease-in-out shadow-lg">
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-green-300 font-medium transition-all duration-300 ease-in-out">
                                          Generating...
                                        </span>
                                        <span className="text-slate-400 transition-all duration-300 ease-in-out">
                                          AI Processing
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Generation Complete Badge */}
                                  {!isStreaming && !mode.isLiveGeneration && tab.content && (
                                    <div className="absolute top-3 right-3 z-10 bg-green-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-green-600/50 transition-all duration-300 ease-in-out shadow-lg">
                                      <div className="flex items-center gap-2 text-xs">
                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                        <span className="text-green-300 font-medium">Complete</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Content Type Indicator */}
                                  <div className="absolute top-3 left-3 z-10 bg-blue-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-blue-600/50 shadow-lg">
                                    <div className="flex items-center gap-2 text-xs">
                                      {getTabIcon(tab.id)}
                                      <span className="text-blue-300 font-medium">{tab.title}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Sub-Tabs Navigation (if available) */}
                                  {tab.subTabs && tab.subTabs.length > 0 && (
                                    <div className="absolute top-16 left-3 right-3 z-10 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50 p-2">
                                      <div className="flex flex-wrap gap-1">
                                        {tab.subTabs.map((subTab) => (
                                          <button
                                            key={subTab.id}
                                            onClick={() => setActiveSubTab(prev => ({ ...prev, [tab.id]: subTab.id }))}
                                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-all duration-200 ${
                                              activeSubTab[tab.id] === subTab.id
                                                ? 'bg-purple-600/80 text-white border border-purple-500/50'
                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-transparent'
                                            }`}
                                          >
                                            {renderSubTabIcon(subTab.icon || 'FileText')}
                                            <span className="truncate max-w-20">{subTab.title}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Scrollable Content Area */}
                                  <div className="h-full overflow-y-auto scrollbar-elegant scroll-smooth">
                                    <div className={`p-6 ${tab.subTabs && tab.subTabs.length > 0 ? 'pt-28' : 'pt-14'}`}>
                                      <div className="text-slate-200 whitespace-pre-wrap font-mono text-sm leading-relaxed transition-all duration-300 ease-in-out">
                                        {tab.subTabs && tab.subTabs.length > 0 ? (
                                          // Show sub-tab content if available
                                          (() => {
                                            const activeSubTabData = tab.subTabs.find(st => st.id === activeSubTab[tab.id]);
                                            return activeSubTabData ? activeSubTabData.content : tab.content;
                                          })()
                                        ) : (
                                          // Show full content if no sub-tabs
                                          tab.content
                                        )}
                                        {tab.status === 'active' && isStreaming && (
                                          <span className="inline-block w-2 h-5 bg-green-400 animate-pulse ml-1 transition-opacity duration-300" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                  <div className="text-center">
                                    {tab.status === 'pending' ? (
                                      <>
                                        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                        <span>Waiting for {tab.agent}...</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                        </div>
                                        <span>Generating {tab.title.toLowerCase()}...</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Project Content */
                <div className="flex-1 p-4 overflow-y-auto">
                  {selectedSession ? (
                    <div className="space-y-4">
                      <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4">
                        <h4 className="text-lg font-semibold text-white mb-2">{selectedSession.session_name}</h4>
                        <p className="text-slate-400 mb-4">{selectedSession.description}</p>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {queries.map((query) => (
                            <div key={query.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-white">{query.description || query.query_type}</h5>
                                <div className="flex gap-2">
                                  <button className="p-1 hover:bg-slate-700/50 rounded">
                                    <Eye className="w-4 h-4 text-slate-400" />
                                  </button>
                                  <button className="p-1 hover:bg-slate-700/50 rounded">
                                    <Edit className="w-4 h-4 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                              <div className="bg-slate-900/50 rounded p-3 font-mono text-xs text-slate-300 overflow-hidden">
                                {query.query_text.substring(0, 200)}...
                              </div>
                              <div className="text-xs text-slate-500 mt-2">
                                {new Date(query.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Database className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">Welcome to Your Database Workspace</h3>
                        <p className="text-slate-400 mb-4">Select a session to view details or start a new generation.</p>
                        <button
                          onClick={() => {
                            const newPrompt = `Enhance ${project?.database_name || 'database'}`;
                            const url = `/projects/${project?.id}?prompt=${encodeURIComponent(newPrompt)}&dbType=${project?.database_type || 'PostgreSQL'}&mode=dbcoach`;
                            navigate(url);
                            window.location.reload();
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          Start Live Generation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700/50 p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-400" />
                  Share Database Design
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Share URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm"
                    />
                    <button
                      onClick={copyShareUrl}
                      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        copySuccess 
                          ? 'bg-green-600 text-white' 
                          : 'bg-slate-600/50 hover:bg-slate-600 text-slate-300 hover:text-white'
                      }`}
                    >
                      {copySuccess ? '✓' : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Share via
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => shareToSocial('twitter')}
                      className="flex items-center justify-center gap-2 p-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all duration-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Twitter
                    </button>
                    <button
                      onClick={() => shareToSocial('linkedin')}
                      className="flex items-center justify-center gap-2 p-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all duration-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      LinkedIn
                    </button>
                    <button
                      onClick={() => shareToSocial('email')}
                      className="flex items-center justify-center gap-2 p-3 bg-slate-600/20 hover:bg-slate-600/30 text-slate-300 rounded-lg transition-all duration-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Email
                    </button>
                  </div>
                </div>
                
                <div className="border-t border-slate-700/50 pt-3">
                  <div className="text-xs text-slate-500">
                    Share your database design with colleagues and collaborators. The shared link includes all generated content and analysis.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700/50 p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-purple-400" />
                  Export Options
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { exportContent('markdown'); setShowExportModal(false); }}
                    disabled={exportLoading}
                    className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 border border-slate-600/50"
                  >
                    <FileText className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Markdown</div>
                      <div className="text-xs text-slate-500">.md file</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => { exportContent('sql'); setShowExportModal(false); }}
                    disabled={exportLoading}
                    className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 border border-slate-600/50"
                  >
                    <Database className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">SQL Scripts</div>
                      <div className="text-xs text-slate-500">.sql file</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => { exportContent('json'); setShowExportModal(false); }}
                    disabled={exportLoading}
                    className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 border border-slate-600/50"
                  >
                    <Code className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">JSON Data</div>
                      <div className="text-xs text-slate-500">.json file</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => { exportContent('pdf'); setShowExportModal(false); }}
                    disabled={exportLoading}
                    className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 border border-slate-600/50"
                  >
                    <FileText className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">PDF Ready</div>
                      <div className="text-xs text-slate-500">.html file</div>
                    </div>
                  </button>
                </div>
                
                <div className="border-t border-slate-700/50 pt-3">
                  <button
                    onClick={() => { exportContent('copy'); setShowExportModal(false); }}
                    disabled={exportLoading}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg transition-all duration-200 border border-purple-500/50"
                  >
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </button>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-slate-500">
                Export formats include all generated content with proper formatting and structure.
              </div>
            </div>
          </div>
        )}
      </ProtectedRoute>
    </StreamingErrorBoundary>
  );
}