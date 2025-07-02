import React, { useState } from 'react';
import { Download, Code, Table, BarChart3 } from 'lucide-react';
import useGeneration from '../../hooks/useGeneration';
import DataTableChart from '../charts/DataTableChart';

const SampleDataTab: React.FC = () => {
  const { getStepContent } = useGeneration();
  const [viewMode, setViewMode] = useState<'table' | 'code'>('table');
  
  const dataContent = getStepContent('data');
  const sampleDataCode = dataContent?.content || 'No sample data generated yet.';

  return (
    <div className="h-full flex flex-col bg-slate-900/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium text-white">
            {dataContent?.title || 'Sample Data'}
          </h3>
          <div className="flex items-center space-x-2 text-slate-400">
            {viewMode === 'table' ? (
              <>
                <Table className="w-4 h-4" />
                <span className="text-sm">Table View</span>
              </>
            ) : (
              <>
                <Code className="w-4 h-4" />
                <span className="text-sm">Code View</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-700/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              <Table className="w-4 h-4" />
              <span className="text-sm">Table</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                viewMode === 'code'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              <Code className="w-4 h-4" />
              <span className="text-sm">Code</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'table' ? (
          <DataTableChart
            data={sampleDataCode}
            title="Sample Data"
            className="h-full"
          />
        ) : (
          <div className="flex h-full">
            {/* Line numbers */}
            <div className="bg-slate-800/50 border-r border-slate-700/50 p-4 text-slate-500 text-sm font-mono select-none">
              {sampleDataCode.split('\n').map((_, index) => (
                <div key={index} className="leading-6">
                  {index + 1}
                </div>
              ))}
            </div>
            
            {/* Code content */}
            <div className="flex-1 p-4 font-mono text-sm leading-6 overflow-x-auto">
              <pre className="text-slate-200">
                <code dangerouslySetInnerHTML={{ 
                  __html: sampleDataCode
                    .replace(/--.*$/gm, '<span style="color: #6B7280; font-style: italic;">$&</span>')
                    .replace(/\b(INSERT|INTO|VALUES|SELECT|FROM|WHERE|AND|OR|CREATE|TABLE|PRIMARY|KEY|REFERENCES|INDEX|ON|DELETE|CASCADE|SET|NULL|DEFAULT|CURRENT_TIMESTAMP|UNIQUE|NOT|SERIAL|INTEGER|VARCHAR|TEXT|BOOLEAN|TIMESTAMP)\b/g, '<span style="color: #8B5CF6; font-weight: 600;">$1</span>')
                    .replace(/\b([a-z_]+)(?=\s*\()/g, '<span style="color: #10B981;">$1</span>')
                    .replace(/'([^']*)'/g, '<span style="color: #F59E0B;">\'$1\'</span>')
                }} />
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleDataTab;