import React, { useState } from 'react';
import { Copy, Download, FileText, Check } from 'lucide-react';
import useGeneration from '../../hooks/useGeneration';

interface SchemaTabProps {
  dbType: string;
}

const SchemaTab: React.FC<SchemaTabProps> = ({ dbType }) => {
  const [copied, setCopied] = useState(false);
  const { getStepContent } = useGeneration();
  
  const schemaContent = getStepContent('schema');
  const schemaCode = schemaContent?.content || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schemaCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center space-x-3 min-w-0">
          <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-medium text-white truncate">
              {schemaContent?.title || `${dbType} Database Schema`}
            </h3>
            <p className="text-xs text-slate-400">{dbType} Database Schema</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all duration-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-sm">Copy</span>
              </>
            )}
          </button>
          <div className="relative">
            <button className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all duration-200">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex">
          {/* Line numbers */}
          <div className="flex-shrink-0 bg-slate-800/50 border-r border-slate-700/50 p-4 text-slate-500 text-sm font-mono select-none overflow-y-auto scrollbar-elegant">
            {schemaCode.split('\n').map((_, index) => (
              <div key={index} className="leading-6 text-right pr-2" style={{ minWidth: '3ch' }}>
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Code content */}
          <div className="flex-1 overflow-auto scrollbar-elegant">
            <div className="p-4 font-mono text-sm leading-6">
              <pre className="text-slate-200 whitespace-pre-wrap">
                <code dangerouslySetInnerHTML={{ 
                  __html: schemaCode
                    .replace(/--.*$/gm, '<span style="color: #6B7280; font-style: italic;">$&</span>')
                    .replace(/\b(CREATE|TABLE|PRIMARY|KEY|REFERENCES|INDEX|ON|DELETE|CASCADE|SET|NULL|DEFAULT|CURRENT_TIMESTAMP|UNIQUE|NOT|SERIAL|INTEGER|VARCHAR|TEXT|BOOLEAN|TIMESTAMP|INSERT|INTO|VALUES|SELECT|FROM|WHERE|AND|OR)\b/g, '<span style="color: #8B5CF6; font-weight: 600;">$1</span>')
                    .replace(/\b([a-z_]+)(?=\s*\()/g, '<span style="color: #10B981;">$1</span>')
                    .replace(/'([^']*)'/g, '<span style="color: #F59E0B;">\'$1\'</span>')
                }} />
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaTab;