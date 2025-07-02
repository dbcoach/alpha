import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databaseProjectsService, DatabaseProject, ProjectStats } from '../../services/databaseProjectsService';
import { ProjectsList } from './ProjectsList';
import ProtectedRoute from '../auth/ProtectedRoute';
import { 
  Database,
  Activity,
  Search,
  BarChart3,
  Sparkles,
  Home,
  Settings
} from 'lucide-react';

export function DatabaseProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DatabaseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProjectStats>({ 
    total_projects: 0, 
    total_sessions: 0, 
    total_queries: 0, 
    last_activity: '' 
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadProjects();
      loadStats();
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await databaseProjectsService.getProjects(user.id);
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const data = await databaseProjectsService.getUserStats(user.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };


  const handleProjectSelect = async (project: DatabaseProject) => {
    // Update last accessed time
    try {
      await databaseProjectsService.updateProjectAccess(project.id);
    } catch (error) {
      console.error('Error updating project access:', error);
    }
    
    // Navigate to unified workspace
    navigate(`/projects/${project.id}`);
  };

  const handleProjectDeleted = () => {
    loadProjects();
    loadStats();
  };

  const filteredProjects = projects.filter(project => 
    project.database_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.database_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Show the main projects list
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
        
        <div className="relative z-10 container max-w-7xl mx-auto py-10 px-4 md:px-8">
          {/* Navigation Header */}
          <nav className="mb-6 p-4 rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl" aria-label="Main navigation">
            <div className="flex items-center justify-between">
              {/* Left side - Brand and breadcrumb */}
              <div className="flex items-center space-x-4">
                <Link 
                  to="/" 
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  aria-label="Go to home page"
                >
                  <Home className="w-4 h-4" />
                  <span className="font-medium">Home</span>
                </Link>
                
                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-slate-400">
                  <span>/</span>
                  <span className="text-purple-300 font-medium">Projects</span>
                </div>
              </div>
              
              {/* Right side - Settings link */}
              <Link 
                to="/settings" 
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                aria-label="Go to settings page"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium hidden sm:inline">Settings</span>
              </Link>
            </div>
          </nav>

          {/* Header */}
          <div className="mb-8 p-6 rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Database Projects
                </h1>
                <p className="text-slate-300 mt-2">
                  Your database design and development history
                </p>
              </div>
              
              {/* Stats */}
              <div className="mt-4 md:mt-0 flex items-center space-x-6 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>{stats.total_projects} projects</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>{stats.total_sessions} sessions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>{stats.total_queries} queries</span>
                </div>
                {stats.last_activity && (
                  <div className="text-xs text-slate-500">
                    Last active: {formatLastActivity(stats.last_activity)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mb-6 p-4 rounded-xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate New Database</span>
                </Link>
              </div>
              
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Projects List */}
          <ProjectsList
            projects={filteredProjects}
            loading={loading}
            onProjectSelect={handleProjectSelect}
            onProjectDelete={handleProjectDeleted}
            searchTerm={searchTerm}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}