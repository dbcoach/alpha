import React, { useState, useMemo } from 'react';
import { 
  Database, Download, RefreshCw, Settings, Filter, 
  Search, BarChart3, Users, Calendar, Tag, Building
} from 'lucide-react';
import { sampleDataGenerator, DatabaseProject, generateSampleData } from '../../utils/sampleDataGenerator';
import { ProgressChart } from '../charts/ProgressChart';
import { ScoreChart } from '../charts/ScoreChart';

interface SampleDataGeneratorProps {
  className?: string;
  onDataGenerated?: (data: DatabaseProject[]) => void;
}

export const SampleDataGeneratorComponent: React.FC<SampleDataGeneratorProps> = ({
  className = '',
  onDataGenerated
}) => {
  const [recordCount, setRecordCount] = useState(10);
  const [generatedData, setGeneratedData] = useState<DatabaseProject[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv'>('json');
  const [showVisualizations, setShowVisualizations] = useState(false);

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = generatedData;

    // Apply domain filter
    if (filterDomain !== 'all') {
      filtered = filtered.filter(project => project.domain === filterDomain);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term) ||
        project.owner.name.toLowerCase().includes(term) ||
        project.owner.company.toLowerCase().includes(term) ||
        project.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [generatedData, filterDomain, filterStatus, searchTerm]);

  // Generate sample data
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate some processing time for realism
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const newData = generateSampleData(recordCount);
      setGeneratedData(newData);
      onDataGenerated?.(newData);
    } catch (error) {
      console.error('Error generating sample data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Export data
  const handleExport = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : generatedData;
    const exportedData = sampleDataGenerator.exportData(dataToExport, selectedFormat);
    
    const blob = new Blob([exportedData], { 
      type: selectedFormat === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-projects-${new Date().toISOString().split('T')[0]}.${selectedFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const data = filteredData.length > 0 ? filteredData : generatedData;
    
    const domains = data.reduce((acc, project) => {
      acc[project.domain] = (acc[project.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statuses = data.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgQuality = data.length > 0 
      ? data.reduce((sum, project) => sum + project.qualityScores.overall, 0) / data.length 
      : 0;

    const totalUsers = data.reduce((sum, project) => sum + project.estimatedUsers, 0);

    return { domains, statuses, avgQuality, totalUsers, totalProjects: data.length };
  }, [filteredData, generatedData]);

  // Prepare data for charts
  const domainChartData = useMemo(() => {
    return Object.entries(stats.domains).map(([domain, count], index) => ({
      label: domain.charAt(0).toUpperCase() + domain.slice(1),
      value: count,
      maxValue: Math.max(...Object.values(stats.domains)),
      color: `hsl(${(index * 137.5) % 360}, 60%, 50%)`,
      description: `${count} project${count !== 1 ? 's' : ''}`
    }));
  }, [stats.domains]);

  const qualityScoreData = useMemo(() => {
    if (generatedData.length === 0) return [];
    
    const avgScores = generatedData.reduce((acc, project) => {
      acc.syntax += project.qualityScores.syntax;
      acc.logic += project.qualityScores.logic;
      acc.performance += project.qualityScores.performance;
      acc.security += project.qualityScores.security;
      acc.completeness += project.qualityScores.completeness;
      return acc;
    }, { syntax: 0, logic: 0, performance: 0, security: 0, completeness: 0 });

    const count = generatedData.length;
    
    return [
      {
        category: 'Syntax',
        score: Math.round(avgScores.syntax / count),
        maxScore: 100,
        color: '#10b981',
        description: 'Average syntax quality'
      },
      {
        category: 'Logic',
        score: Math.round(avgScores.logic / count),
        maxScore: 100,
        color: '#3b82f6',
        description: 'Average logic quality'
      },
      {
        category: 'Performance',
        score: Math.round(avgScores.performance / count),
        maxScore: 100,
        color: '#f59e0b',
        description: 'Average performance score'
      },
      {
        category: 'Security',
        score: Math.round(avgScores.security / count),
        maxScore: 100,
        color: '#ef4444',
        description: 'Average security score'
      },
      {
        category: 'Completeness',
        score: Math.round(avgScores.completeness / count),
        maxScore: 100,
        color: '#8b5cf6',
        description: 'Average completeness score'
      }
    ];
  }, [generatedData]);

  return (
    <div className={`bg-slate-800/30 border border-slate-700/50 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Sample Data Generator</h2>
              <p className="text-slate-400 text-sm">Generate realistic database project data for testing and demonstration</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowVisualizations(!showVisualizations)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              showVisualizations 
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Analytics</span>
          </button>
        </div>

        {/* Generation Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Number of Records
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={recordCount}
              onChange={(e) => setRecordCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Export Format
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as 'json' | 'csv')}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded-lg text-white transition-colors"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Generating...' : 'Generate Data'}</span>
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExport}
              disabled={generatedData.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-600/30 disabled:text-slate-500 rounded-lg text-slate-300 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Display */}
      {generatedData.length > 0 && (
        <div className="p-6">
          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="all">All Domains</option>
              <option value="e-commerce">E-commerce</option>
              <option value="saas">SaaS</option>
              <option value="social">Social</option>
              <option value="blog">Blog</option>
              <option value="financial">Financial</option>
              <option value="healthcare">Healthcare</option>
              <option value="iot">IoT</option>
              <option value="education">Education</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>

            <div className="text-sm text-slate-400 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              {filteredData.length} of {generatedData.length} projects
            </div>
          </div>

          {/* Analytics Dashboard */}
          {showVisualizations && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ProgressChart
                title="Projects by Domain"
                subtitle="Distribution across business domains"
                data={domainChartData}
                orientation="horizontal"
              />
              
              {qualityScoreData.length > 0 && (
                <ScoreChart
                  title="Average Quality Scores"
                  subtitle="Quality metrics across all projects"
                  data={qualityScoreData}
                  type="circular"
                />
              )}
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-3">
                <Database className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.totalProjects}</div>
                  <div className="text-sm text-slate-400">Total Projects</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">Total Users</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{Math.round(stats.avgQuality)}%</div>
                  <div className="text-sm text-slate-400">Avg Quality</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-3">
                <Building className="w-8 h-8 text-amber-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{Object.keys(stats.domains).length}</div>
                  <div className="text-sm text-slate-400">Domains</div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Domain</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Scale</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Quality</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Owner</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((project, index) => (
                  <tr key={project.id} className={`border-b border-slate-700/30 ${index % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-200">{project.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{project.tableCount} tables, {project.estimatedUsers.toLocaleString()} users</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300">
                        {project.domain}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 capitalize">{project.scale}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'completed' ? 'bg-green-900/30 text-green-300' :
                        project.status === 'in_progress' ? 'bg-blue-900/30 text-blue-300' :
                        project.status === 'review' ? 'bg-amber-900/30 text-amber-300' :
                        'bg-slate-700/50 text-slate-300'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 bg-slate-700/30 rounded-full h-2">
                          <div 
                            className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.qualityScores.overall}%` }}
                          />
                        </div>
                        <span className="text-slate-300 text-xs">{project.qualityScores.overall}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="text-slate-300">{project.owner.name}</div>
                        <div className="text-xs text-slate-500">{project.owner.company}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {generatedData.length === 0 && (
        <div className="p-12 text-center">
          <Database className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No Sample Data Generated</h3>
          <p className="text-slate-400 mb-4">Click "Generate Data" to create realistic database project samples</p>
        </div>
      )}
    </div>
  );
};

export default SampleDataGeneratorComponent;