import React from 'react';
import { Code, Download } from 'lucide-react';
import useGeneration from '../../hooks/useGeneration';

const APIEndpointsTab: React.FC = () => {
  const { getStepContent } = useGeneration();
  
  const apiContent = getStepContent('api');
  const apiCode = apiContent?.content || 'No API endpoints generated yet.';

  return (
    <div className="h-full flex flex-col bg-slate-900/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center space-x-3">
          <Code className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="font-medium text-white">
              {apiContent?.title || 'REST API Endpoints'}
            </h3>
            <p className="text-xs text-slate-400">RESTful API for your database</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all duration-200">
            <Download className="w-4 h-4" />
            <span className="text-sm">Export OpenAPI</span>
          </button>
        </div>
      </div>

      {/* Code editor */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Line numbers */}
          <div className="bg-slate-800/50 border-r border-slate-700/50 p-4 text-slate-500 text-sm font-mono select-none">
            {apiCode.split('\n').map((_, index) => (
              <div key={index} className="leading-6">
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Code content */}
          <div className="flex-1 p-4 font-mono text-sm leading-6 overflow-x-auto">
            <pre className="text-slate-200">
              <code dangerouslySetInnerHTML={{ 
                __html: apiCode
                  .replace(/```json\n?/g, '')
                  .replace(/```\n?/g, '')
                  .replace(/"([^"]+)":/g, '<span style="color: #8B5CF6; font-weight: 600;">"$1":</span>')
                  .replace(/"([^"]+)"/g, '<span style="color: #F59E0B;">"$1"</span>')
                  .replace(/\b(GET|POST|PUT|DELETE|PATCH)\b/g, '<span style="color: #10B981; font-weight: 600;">$1</span>')
                  .replace(/\b(\/api\/[^\s"]+)/g, '<span style="color: #06B6D4;">$1</span>')
              }} />
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIEndpointsTab;