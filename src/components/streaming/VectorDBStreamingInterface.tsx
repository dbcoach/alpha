import React, { useState, useCallback } from 'react';
import { Play, Pause, Download, CheckCircle, Database } from 'lucide-react';
import { streamlinedDBCoachService } from '../../services/streamlinedDBCoachService';

interface VectorDBStreamingInterfaceProps {
  prompt: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function VectorDBStreamingInterface({ 
  prompt, 
  onComplete, 
  onError
}: VectorDBStreamingInterfaceProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'design' | 'sample_data' | 'implementation'>('design');
  const [results, setResults] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);

  const generatePhase = useCallback(async (phase: 'design' | 'sample_data' | 'implementation') => {
    setIsGenerating(true);
    setCurrentPhase(phase);
    setProgress(0);

    try {
      // Use improved streamlined service with enhanced Vector DB prompts
      const stream = streamlinedDBCoachService.streamGeneration({
        prompt,
        dbType: 'VectorDB',
        phase
      });

      let content = '';
      
      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'progress':
            setProgress(chunk.data.progress || 0);
            break;
            
          case 'content':
            content += chunk.data;
            setResults(prev => ({
              ...prev,
              [phase]: content
            }));
            break;
            
          case 'complete':
            setResults(prev => ({
              ...prev,
              [phase]: chunk.data.content
            }));
            setProgress(100);
            break;
        }
      }

      if (onComplete) {
        onComplete({ phase, content: results[phase] });
      }

    } catch (error) {
      console.error(`Vector DB ${phase} generation failed:`, error);
      if (onError) {
        onError(`Failed to generate ${phase}: ${error.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, results, onComplete, onError]);

  const generateAll = useCallback(async () => {
    for (const phase of ['design', 'sample_data', 'implementation'] as const) {
      await generatePhase(phase);
    }
  }, [generatePhase]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Vector Database Generator</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={generateAll}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {isGenerating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isGenerating ? 'Generating...' : 'Generate All'}</span>
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-3">
            <div className="flex justify-between text-sm text-purple-300 mb-1">
              <span>Generating {currentPhase.replace('_', ' ')}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="flex-1 flex flex-col">
        <div className="flex border-b border-slate-700">
          {[
            { key: 'design', label: 'Database Design', icon: '🏗️' },
            { key: 'sample_data', label: 'Sample Data', icon: '📊' },
            { key: 'implementation', label: 'Implementation', icon: '💻' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => generatePhase(key as any)}
              disabled={isGenerating}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                currentPhase === key
                  ? 'border-purple-500 text-purple-300 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {results[key] && <CheckCircle className="w-4 h-4 text-green-400" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {Object.entries(results).map(([phase, content]) => (
            <div
              key={phase}
              className={`${currentPhase === phase ? 'block' : 'hidden'}`}
            >
              <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white capitalize">
                    {phase.replace('_', ' ')} Output
                  </h3>
                  {content && (
                    <button
                      onClick={() => navigator.clipboard.writeText(content)}
                      className="flex items-center space-x-2 px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Copy</span>
                    </button>
                  )}
                </div>
                
                {content ? (
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-slate-900/50 p-4 rounded-lg overflow-auto">
                    {content}
                  </pre>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Click "Generate {phase.replace('_', ' ')}" to create content
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VectorDBStreamingInterface;