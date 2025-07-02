import React, { useMemo } from 'react';
import { Copy, Download, FileText, Zap, BarChart3, TrendingUp } from 'lucide-react';
import useGeneration from '../../hooks/useGeneration';
import MetricsChart from '../charts/MetricsChart';

const AnalysisTab: React.FC = () => {
  const { getStepContent } = useGeneration();
  const content = getStepContent('analysis');

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">Requirements analysis not yet generated</p>
        </div>
      </div>
    );
  }

  const parseAnalysisContent = (content: string) => {
    try {
      return JSON.parse(content);
    } catch {
      return { rawContent: content };
    }
  };

  const analysis = parseAnalysisContent(content.content);
  const isStructured = !analysis.rawContent;

  // Generate visualization metrics from analysis
  const requirementMetrics = useMemo(() => {
    if (!isStructured || !analysis.requirements) return [];
    
    const metrics = [];
    if (analysis.requirements.explicit) {
      metrics.push({
        label: 'Explicit Requirements',
        value: analysis.requirements.explicit.length,
        color: '#10B981'
      });
    }
    if (analysis.requirements.implicit) {
      metrics.push({
        label: 'Implicit Requirements',
        value: analysis.requirements.implicit.length,
        color: '#3B82F6'
      });
    }
    if (analysis.requirements.technical_constraints) {
      metrics.push({
        label: 'Technical Constraints',
        value: analysis.requirements.technical_constraints.length,
        color: '#F59E0B'
      });
    }
    
    return metrics;
  }, [analysis, isStructured]);

  const confidenceMetrics = useMemo(() => {
    if (!isStructured || !analysis.assumptions) return [];
    
    return analysis.assumptions
      .filter((assumption: any) => assumption.confidence !== undefined)
      .map((assumption: any, index: number) => ({
        label: `Assumption ${index + 1}`,
        value: Math.round(assumption.confidence * 100),
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }));
  }, [analysis, isStructured]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
  };

  const exportAnalysis = () => {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements-analysis.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isStructured) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-slate-700/50 bg-slate-800/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Requirements Analysis</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-sm text-slate-300"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto scrollbar-elegant p-6">
          <pre className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
            {analysis.rawContent}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 border-b border-slate-700/50 bg-slate-800/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Requirements Analysis</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-sm text-slate-300"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </button>
            <button
              onClick={exportAnalysis}
              className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors text-sm text-purple-300"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto scrollbar-elegant p-6 space-y-6">
        {/* Visualization Charts */}
        {isStructured && (requirementMetrics.length > 0 || confidenceMetrics.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {requirementMetrics.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                <div className="h-80">
                  <MetricsChart
                    data={requirementMetrics}
                    type="doughnut"
                    title="Requirements Breakdown"
                    className="h-full"
                  />
                </div>
              </div>
            )}
            {confidenceMetrics.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                <div className="h-80">
                  <MetricsChart
                    data={confidenceMetrics}
                    type="bar"
                    title="Assumption Confidence"
                    className="h-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Domain & Scale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
            <h4 className="text-purple-300 font-medium mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Domain
            </h4>
            <p className="text-slate-200 text-lg font-semibold">{analysis.domain || 'Not specified'}</p>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
            <h4 className="text-purple-300 font-medium mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Scale
            </h4>
            <p className="text-slate-200 text-lg font-semibold">{analysis.scale || 'Not specified'}</p>
          </div>
        </div>

        {/* Requirements */}
        {analysis.requirements && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
            <h4 className="text-purple-300 font-medium mb-4">Requirements</h4>
            
            {analysis.requirements.explicit && analysis.requirements.explicit.length > 0 && (
              <div className="mb-4">
                <h5 className="text-green-300 font-medium mb-2">Explicit Requirements</h5>
                <ul className="space-y-1">
                  {analysis.requirements.explicit.map((req: string, index: number) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <span className="text-green-400 mr-2 flex-shrink-0">✓</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.requirements.implicit && analysis.requirements.implicit.length > 0 && (
              <div className="mb-4">
                <h5 className="text-blue-300 font-medium mb-2">Implicit Requirements</h5>
                <ul className="space-y-1">
                  {analysis.requirements.implicit.map((req: string, index: number) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <span className="text-blue-400 mr-2 flex-shrink-0">→</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.requirements.technical_constraints && analysis.requirements.technical_constraints.length > 0 && (
              <div>
                <h5 className="text-yellow-300 font-medium mb-2">Technical Constraints</h5>
                <ul className="space-y-1">
                  {analysis.requirements.technical_constraints.map((constraint: string, index: number) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <span className="text-yellow-400 mr-2 flex-shrink-0">⚠</span>
                      {constraint}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Assumptions */}
        {analysis.assumptions && analysis.assumptions.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
            <h4 className="text-purple-300 font-medium mb-4">Assumptions</h4>
            <div className="space-y-3">
              {analysis.assumptions.map((assumption: { assumption: string; justification: string; confidence?: number }, index: number) => (
                <div key={index} className="border-l-2 border-purple-500/30 pl-4">
                  <p className="text-slate-300 text-sm mb-1">{assumption.assumption}</p>
                  <p className="text-slate-400 text-xs">{assumption.justification}</p>
                  {assumption.confidence && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">Confidence:</span>
                        <div className="w-20 bg-slate-700 rounded-full h-1">
                          <div 
                            className="bg-purple-400 h-1 rounded-full" 
                            style={{ width: `${assumption.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-400">{Math.round(assumption.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhancements */}
        {analysis.enhancements && analysis.enhancements.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
            <h4 className="text-purple-300 font-medium mb-4">Recommended Enhancements</h4>
            <ul className="space-y-2">
              {analysis.enhancements.map((enhancement: string, index: number) => (
                <li key={index} className="text-slate-300 text-sm flex items-start">
                  <span className="text-purple-400 mr-2 flex-shrink-0">+</span>
                  {enhancement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Clarifications Needed */}
        {analysis.clarification_needed && analysis.clarification_needed.length > 0 && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <h4 className="text-red-300 font-medium mb-4">Clarifications Needed</h4>
            <ul className="space-y-2">
              {analysis.clarification_needed.map((clarification: string, index: number) => (
                <li key={index} className="text-red-200 text-sm flex items-start">
                  <span className="text-red-400 mr-2 flex-shrink-0">?</span>
                  {clarification}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisTab;