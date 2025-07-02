import React, { useMemo } from 'react';
import { Clock, CheckCircle, Zap, AlertTriangle, Activity } from 'lucide-react';
import BaseChart from './BaseChart';
import { GenerationProgress } from '../../services/enhancedDBCoachService';

interface GenerationProgressChartProps {
  currentProgress: GenerationProgress | null;
  generationSteps: any[];
  tabs: any[];
  className?: string;
}

const GenerationProgressChart: React.FC<GenerationProgressChartProps> = ({ 
  currentProgress,
  generationSteps,
  tabs,
  className = ''
}) => {
  const progressData = useMemo(() => {
    return tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      agent: tab.agent,
      status: tab.status,
      isActive: currentProgress?.step === tab.id,
      percentage: tab.status === 'completed' ? 100 : 
                  tab.status === 'active' ? (currentProgress?.percentage || 0) : 0
    }));
  }, [tabs, currentProgress]);

  const overallProgress = useMemo(() => {
    const completedSteps = tabs.filter(tab => tab.status === 'completed').length;
    const activeStep = tabs.find(tab => tab.status === 'active');
    const activeProgress = activeStep ? (currentProgress?.percentage || 0) / 100 : 0;
    
    return ((completedSteps + activeProgress) / tabs.length) * 100;
  }, [tabs, currentProgress]);

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (isActive) return <Zap className="w-4 h-4 text-blue-400 animate-pulse" />;
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (isActive) return 'border-blue-400 bg-blue-400/20';
    if (status === 'completed') return 'border-green-400 bg-green-400/20';
    return 'border-slate-400 bg-slate-700/20';
  };

  const getProgressBarColor = (status: string, isActive: boolean) => {
    if (isActive) return 'from-blue-500 to-purple-500';
    if (status === 'completed') return 'from-green-500 to-emerald-500';
    return 'from-slate-500 to-slate-600';
  };

  return (
    <BaseChart
      title="Generation Progress"
      className={className}
      exportData={() => ({
        json: JSON.stringify({
          overallProgress,
          currentStep: currentProgress?.step,
          steps: progressData
        }, null, 2),
        csv: [
          'step,title,agent,status,percentage',
          ...progressData.map(step => 
            `${step.id},${step.title},${step.agent},${step.status},${step.percentage}`
          )
        ].join('\n')
      })}
    >
      <div className="h-full flex flex-col bg-slate-900/50">
        {/* Overall Progress Header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-white">Overall Progress</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {overallProgress.toFixed(0)}%
            </div>
          </div>
          
          {/* Overall Progress Bar */}
          <div className="w-full bg-slate-700/50 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          
          {/* Current Step Info */}
          {currentProgress && (
            <div className="mt-3 text-sm text-slate-300">
              <span className="text-purple-400">Current:</span> {currentProgress.step} 
              <span className="mx-2">•</span>
              <span className="text-blue-400">Agent:</span> {currentProgress.agent}
            </div>
          )}
        </div>

        {/* Step Progress List */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {progressData.map((step, index) => (
            <div 
              key={step.id}
              className={`border rounded-lg p-4 transition-all duration-300 ${getStatusColor(step.status, step.isActive)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(step.status, step.isActive)}
                  <div>
                    <h4 className="font-medium text-white">{step.title}</h4>
                    <p className="text-sm text-slate-400">{step.agent}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {step.percentage.toFixed(0)}%
                    </div>
                    <div className={`text-xs font-medium ${
                      step.status === 'completed' ? 'text-green-300' :
                      step.isActive ? 'text-blue-300' :
                      'text-slate-400'
                    }`}>
                      {step.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Step Progress Bar */}
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div 
                  className={`bg-gradient-to-r ${getProgressBarColor(step.status, step.isActive)} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${step.percentage}%` }}
                />
              </div>
              
              {/* Current Reasoning */}
              {step.isActive && currentProgress?.reasoning && (
                <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600/50">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse" />
                    <p className="text-sm text-slate-300 flex-1">
                      {currentProgress.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Generation Stats */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-400">
                {progressData.filter(s => s.status === 'completed').length}
              </div>
              <div className="text-xs text-slate-400">Completed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">
                {progressData.filter(s => s.status === 'active').length}
              </div>
              <div className="text-xs text-slate-400">Active</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-400">
                {progressData.filter(s => s.status === 'pending').length}
              </div>
              <div className="text-xs text-slate-400">Pending</div>
            </div>
          </div>
        </div>
      </div>
    </BaseChart>
  );
};

export default GenerationProgressChart;