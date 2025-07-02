import React from 'react';
import { BaseChart } from './BaseChart';

interface ProgressData {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  description?: string;
}

interface ProgressChartProps {
  title: string;
  subtitle?: string;
  data: ProgressData[];
  orientation?: 'horizontal' | 'vertical';
  showValues?: boolean;
  showPercentages?: boolean;
  className?: string;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  subtitle,
  data,
  orientation = 'horizontal',
  showValues = true,
  showPercentages = true,
  className
}) => {
  const maxValue = Math.max(...data.map(item => item.maxValue));

  const renderHorizontalBar = (item: ProgressData, index: number) => {
    const percentage = (item.value / item.maxValue) * 100;
    const widthPercent = (item.value / maxValue) * 100;

    return (
      <div key={index} className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">{item.label}</span>
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            {showValues && <span>{item.value}/{item.maxValue}</span>}
            {showPercentages && <span>({percentage.toFixed(1)}%)</span>}
          </div>
        </div>
        
        <div className="relative">
          <div className="w-full bg-slate-700/30 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: item.color,
                boxShadow: `0 0 10px ${item.color}40`
              }}
              role="progressbar"
              aria-valuenow={item.value}
              aria-valuemin={0}
              aria-valuemax={item.maxValue}
              aria-label={`${item.label}: ${item.value} out of ${item.maxValue}`}
            />
          </div>
          
          {/* Gradient overlay for visual effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full opacity-30"
            style={{ width: `${widthPercent}%` }}
          />
        </div>
        
        {item.description && (
          <p className="text-xs text-slate-500 mt-1">{item.description}</p>
        )}
      </div>
    );
  };

  const renderVerticalBar = (item: ProgressData, index: number) => {
    const percentage = (item.value / item.maxValue) * 100;
    const heightPercent = (item.value / maxValue) * 100;

    return (
      <div key={index} className="flex flex-col items-center space-y-2">
        <div className="flex-1 flex flex-col justify-end w-12 h-48 bg-slate-700/30 rounded-lg overflow-hidden relative">
          <div
            className="w-full rounded-b-lg transition-all duration-700 ease-out"
            style={{
              height: `${heightPercent}%`,
              backgroundColor: item.color,
              boxShadow: `0 0 10px ${item.color}40`
            }}
            role="progressbar"
            aria-valuenow={item.value}
            aria-valuemin={0}
            aria-valuemax={item.maxValue}
            aria-label={`${item.label}: ${item.value} out of ${item.maxValue}`}
          />
          
          {/* Gradient overlay */}
          <div
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-transparent via-white/10 to-transparent rounded-b-lg opacity-30"
            style={{ height: `${heightPercent}%` }}
          />
        </div>
        
        <div className="text-center">
          <div className="text-sm font-medium text-slate-300 mb-1">{item.label}</div>
          {showValues && (
            <div className="text-xs text-slate-400">{item.value}/{item.maxValue}</div>
          )}
          {showPercentages && (
            <div className="text-xs text-slate-500">({percentage.toFixed(1)}%)</div>
          )}
        </div>
        
        {item.description && (
          <p className="text-xs text-slate-500 text-center max-w-20">{item.description}</p>
        )}
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
            orientation,
            data: data.map(item => ({
              label: item.label,
              value: item.value,
              maxValue: item.maxValue,
              percentage: (item.value / item.maxValue) * 100,
              description: item.description
            }))
          };
          
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-progress.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }}
    >
      <div className="h-full flex flex-col">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
        
        {/* Chart */}
        <div className="flex-1 flex items-center justify-center">
          {orientation === 'horizontal' ? (
            <div className="w-full space-y-6">
              {data.map(renderHorizontalBar)}
            </div>
          ) : (
            <div className="flex items-end justify-center space-x-6 h-full">
              {data.map(renderVerticalBar)}
            </div>
          )}
        </div>
        
        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-white">
                {data.reduce((sum, item) => sum + item.value, 0)}
              </div>
              <div className="text-xs text-slate-400">Total Completed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">
                {data.reduce((sum, item) => sum + item.maxValue, 0)}
              </div>
              <div className="text-xs text-slate-400">Total Possible</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-400">
                {data.length}
              </div>
              <div className="text-xs text-slate-400">Categories</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-400">
                {((data.reduce((sum, item) => sum + item.value, 0) / 
                   data.reduce((sum, item) => sum + item.maxValue, 0)) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400">Overall Progress</div>
            </div>
          </div>
        </div>
      </div>
    </BaseChart>
  );
};