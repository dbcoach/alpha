import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Zap, 
  MessageSquare, 
  Database, 
  Users, 
  ShoppingCart, 
  Heart,
  ArrowRight,
  Sparkles,
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { BoltNewBadge } from '../ui/BoltNewBadge';

export function DemoLandingPage() {
  const navigate = useNavigate();
  const { setDemoMode } = useDemo();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const handleStartDemo = (demoType: string) => {
    setDemoMode(true);
    switch (demoType) {
      case 'live-generation':
        navigate('/demo/live-generation');
        break;
      case 'conversation-history':
        navigate('/demo/conversations');
        break;
      case 'streaming-chat':
        navigate('/demo/streaming-chat');
        break;
      default:
        navigate('/demo/live-generation');
    }
  };

  const demoFeatures = [
    {
      id: 'live-generation',
      title: 'Live Database Generation',
      description: 'Watch AI agents collaborate in real-time to design your database schema',
      icon: <Zap className="w-8 h-8" />,
      gradient: 'from-purple-600 to-blue-600',
      features: ['Multi-agent collaboration', 'Real-time streaming', 'Enterprise-grade output'],
      time: '3 min demo'
    },
    {
      id: 'conversation-history',
      title: 'Conversation History',
      description: 'Browse saved database generations with full context and chat history',
      icon: <MessageSquare className="w-8 h-8" />,
      gradient: 'from-blue-600 to-cyan-600',
      features: ['Persistent storage', 'Intelligent search', 'Resume sessions'],
      time: '2 min demo'
    },
    {
      id: 'streaming-chat',
      title: 'AI Chat Assistant',
      description: 'Chat with AI about your database while it\'s being generated',
      icon: <Database className="w-8 h-8" />,
      gradient: 'from-green-600 to-emerald-600',
      features: ['Context-aware responses', 'Real-time analysis', 'Interactive Q&A'],
      time: '4 min demo'
    }
  ];

  const sampleProjects = [
    {
      title: 'E-commerce Platform',
      description: 'Products, orders, customers, inventory',
      icon: <ShoppingCart className="w-6 h-6 text-blue-400" />,
      complexity: 'Medium',
      tables: 8
    },
    {
      title: 'Social Media App',
      description: 'Users, posts, comments, followers',
      icon: <Users className="w-6 h-6 text-purple-400" />,
      complexity: 'High',
      tables: 12
    },
    {
      title: 'Healthcare System',
      description: 'Patients, doctors, appointments, records',
      icon: <Heart className="w-6 h-6 text-red-400" />,
      complexity: 'Enterprise',
      tables: 15
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <nav className="p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">DB.Coach</h1>
                <p className="text-xs text-purple-300">Interactive Demo</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30">
                🎯 Demo Mode
              </div>
              <button
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Exit Demo
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600/20 text-purple-300 rounded-full border border-purple-500/30 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Experience the Future of Database Design</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Welcome to the
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"> Vibe DB </span>
              Revolution
            </h1>
            
            <p className="text-xl text-slate-400 mb-8 max-w-3xl mx-auto">
              Watch AI agents collaborate in real-time to design enterprise-grade databases. 
              Chat with intelligent assistants. Experience the future of database architecture.
            </p>

            <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>No signup required</span>
              </div>
              <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>5-minute experience</span>
              </div>
              <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Full feature access</span>
              </div>
            </div>
          </div>

          {/* Demo Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {demoFeatures.map((demo) => (
              <div
                key={demo.id}
                className={`group cursor-pointer transform transition-all duration-300 ${
                  hoveredCard === demo.id ? 'scale-105' : 'hover:scale-102'
                }`}
                onMouseEnter={() => setHoveredCard(demo.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleStartDemo(demo.id)}
              >
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 h-full backdrop-blur-xl hover:border-slate-600/50 transition-all duration-300">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${demo.gradient} flex items-center justify-center mb-6 group-hover:shadow-lg transition-all duration-300`}>
                    {demo.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">{demo.title}</h3>
                  <p className="text-slate-400 mb-6 leading-relaxed">{demo.description}</p>
                  
                  <div className="space-y-3 mb-6">
                    {demo.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 text-sm font-medium">{demo.time}</span>
                    <div className="flex items-center space-x-2 text-white group-hover:text-purple-300 transition-colors">
                      <Play className="w-4 h-4" />
                      <span className="font-medium">Start Demo</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sample Projects */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Or Try These Sample Projects
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {sampleProjects.map((project, index) => (
                <div
                  key={index}
                  className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 cursor-pointer hover:border-slate-600/50 hover:bg-slate-900/70 transition-all duration-200"
                  onClick={() => {
                    setDemoMode(true);
                    navigate(`/demo/live-generation?project=${encodeURIComponent(project.title)}`);
                  }}
                >
                  <div className="flex items-center space-x-3 mb-4">
                    {project.icon}
                    <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-4">{project.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-slate-500">
                        <span className="text-white font-medium">{project.tables}</span> tables
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        project.complexity === 'Medium' ? 'bg-yellow-600/20 text-yellow-300' :
                        project.complexity === 'High' ? 'bg-orange-600/20 text-orange-300' :
                        'bg-red-600/20 text-red-300'
                      }`}>
                        {project.complexity}
                      </span>
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Experience the Future?
            </h2>
            <p className="text-slate-400 mb-8">
              Start with any demo above, or jump straight into the full experience
            </p>
            
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => handleStartDemo('live-generation')}
                className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
              >
                <Play className="w-5 h-5" />
                <span>Start Interactive Demo</span>
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-600/50 rounded-xl font-semibold transition-all duration-200"
              >
                <span>Try Full Version</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bolt.new Badge */}
      <BoltNewBadge />
    </div>
  );
}