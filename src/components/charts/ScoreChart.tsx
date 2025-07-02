import React, { useState } from 'react';
import { BaseChart } from './BaseChart';
import { Info } from 'lucide-react';

interface ScoreData {
  category: string;
  score: number;
  maxScore: number;
  color: string;
  description?: string;
  details?: string[];
}

interface ScoreChartProps {
  title: string;
  subtitle?: string;
  data: ScoreData[];
  overallScore?: number;
  maxOverallScore?: number;
  className?: string;
  type?: 'radar' | 'bar' | 'circular';
}

export const ScoreChart: React.FC<ScoreChartProps> = ({
  title,
  subtitle,
  data,
  overallScore,
  maxOverallScore = 100,
  className,
  type = 'circular'
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const calculateOverallScore = () => {
    if (overallScore !== undefined) return overallScore;
    return data.reduce((sum, item) => sum + (item.score / item.maxScore) * 100, 0) / data.length;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return '#10b981'; // green-500
    if (percentage >= 75) return '#3b82f6'; // blue-500
    if (percentage >= 60) return '#f59e0b'; // amber-500
    if (percentage >= 40) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const renderCircularScore = (item: ScoreData, index: number) => {
    const percentage = (item.score / item.maxScore) * 100;
    const circumference = 2 * Math.PI * 40;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <div
        key={index}
        className="flex flex-col items-center space-y-3 p-4 rounded-lg bg-slate-800/20 border border-slate-700/30 hover:bg-slate-800/40 transition-all cursor-pointer"
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => setSelectedCategory(selectedCategory === index ? null : index)}
      >
        <div className="relative">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-700/30"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke={item.color}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${item.color}40)`
              }}
            />
          </svg>
          
          {/* Score text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
        
        <div className="text-center">
          <h4 className="text-sm font-medium text-slate-300 mb-1">{item.category}</h4>
          <p className="text-xs text-slate-400">{item.score}/{item.maxScore}</p>
          
          {hoveredIndex === index && item.description && (
            <div className="mt-2 p-2 bg-slate-900/80 rounded text-xs text-slate-300 max-w-32">
              {item.description}
            </div>
          )}
        </div>
        
        {selectedCategory === index && item.details && (
          <div className="mt-2 space-y-1 w-full">
            {item.details.map((detail, detailIndex) => (
              <div key={detailIndex} className="text-xs text-slate-400 flex items-start space-x-2">
                <Info className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderBarScore = (item: ScoreData, index: number) => {
    const percentage = (item.score / item.maxScore) * 100;
    
    return (
      <div
        key={index}
        className="space-y-2 p-3 rounded-lg bg-slate-800/20 border border-slate-700/30 hover:bg-slate-800/40 transition-all cursor-pointer"
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => setSelectedCategory(selectedCategory === index ? null : index)}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">{item.category}</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">{item.score}/{item.maxScore}</span>
            <span className="text-sm font-semibold" style={{ color: item.color }}>
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
        
        <div className="relative h-2 bg-slate-700/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: item.color,
              boxShadow: `0 0 8px ${item.color}40`
            }}
          />
        </div>
        
        {item.description && (
          <p className="text-xs text-slate-500">{item.description}</p>
        )}
        
        {selectedCategory === index && item.details && (
          <div className="mt-3 pt-2 border-t border-slate-700/50 space-y-1">
            {item.details.map((detail, detailIndex) => (
              <div key={detailIndex} className="text-xs text-slate-400 flex items-start space-x-2">
                <Info className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOverallScore = () => {
    const score = calculateOverallScore();
    const color = getScoreColor(score);
    
    return (
      <div className="text-center p-6 bg-slate-800/20 border border-slate-700/50 rounded-lg">
        <div className="relative inline-block">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-700/30"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke={color}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 50}
              strokeDashoffset={2 * Math.PI * 50 - (score / 100) * 2 * Math.PI * 50}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 10px ${color}40)`
              }}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
            <span className="text-sm text-slate-400">/{maxOverallScore}</span>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-white mt-4">Overall Score</h3>
        <p className="text-slate-400 mt-1">
          {score >= 90 ? 'Excellent' :
           score >= 75 ? 'Good' :
           score >= 60 ? 'Fair' :
           score >= 40 ? 'Needs Improvement' : 'Poor'}
        </p>
      </div>
    );
  };

  return (
    <BaseChart
      title={title}
      subtitle={subtitle}
      data={data}
      className={className}
      onExport={(format) => {
        if (format === 'json') {
          const exportData = {
            title,
            subtitle,
            overallScore: calculateOverallScore(),
            maxOverallScore,
            categories: data.map(item => ({
              category: item.category,
              score: item.score,
              maxScore: item.maxScore,
              percentage: (item.score / item.maxScore) * 100,
              description: item.description,
              details: item.details
            }))
          };
          
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-scores.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }}
    >
      <div className="h-full flex flex-col space-y-6">
        {/* Overall Score */}
        {renderOverallScore()}
        
        {/* Category Scores */}
        <div className="flex-1">
          <h4 className="text-lg font-medium text-white mb-4">Category Breakdown</h4>
          
          {type === 'circular' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.map(renderCircularScore)}
            </div>
          ) : (
            <div className="space-y-4">
              {data.map(renderBarScore)}
            </div>
          )}
        </div>
        
        {/* Legend and Help */}
        <div className="pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Click categories for details • Hover for descriptions</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>90%+ Excellent</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>75%+ Good</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span>60%+ Fair</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>&lt;60% Poor</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseChart>
  );
};