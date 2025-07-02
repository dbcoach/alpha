import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';
import BaseChart from './BaseChart';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface MetricData {
  label: string;
  value: number;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

interface MetricsChartProps {
  data: MetricData[];
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  title?: string;
  className?: string;
  timeLabels?: string[];
  showTrends?: boolean;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ 
  data, 
  type,
  title = 'Metrics',
  className = '',
  timeLabels = [],
  showTrends = false
}) => {
  const colors = [
    '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', 
    '#84CC16', '#F97316', '#EC4899', '#6366F1', '#14B8A6'
  ];

  const chartData = useMemo(() => {
    const labels = data.map(item => item.label);
    const values = data.map(item => item.value);
    const backgroundColors = data.map((item, index) => 
      item.color || colors[index % colors.length]
    );

    if (type === 'line' || type === 'area') {
      return {
        labels: timeLabels.length > 0 ? timeLabels : labels,
        datasets: [{
          label: title,
          data: values,
          borderColor: colors[0],
          backgroundColor: type === 'area' ? `${colors[0]}20` : 'transparent',
          borderWidth: 2,
          fill: type === 'area',
          tension: 0.4,
          pointBackgroundColor: colors[0],
          pointBorderColor: '#1F2937',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }]
      };
    }

    if (type === 'bar') {
      return {
        labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: backgroundColors.map(color => `${color}80`),
          borderColor: backgroundColors,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }]
      };
    }

    // Pie and Doughnut
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors.map(color => `${color}80`),
        borderColor: backgroundColors,
        borderWidth: 2,
      }]
    };
  }, [data, type, title, timeLabels, colors]);

  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#E2E8F0',
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: '#1F2937',
          titleColor: '#E2E8F0',
          bodyColor: '#E2E8F0',
          borderColor: '#374151',
          borderWidth: 1,
        }
      },
      scales: type === 'pie' || type === 'doughnut' ? {} : {
        x: {
          ticks: {
            color: '#9CA3AF'
          },
          grid: {
            color: '#374151'
          }
        },
        y: {
          ticks: {
            color: '#9CA3AF'
          },
          grid: {
            color: '#374151'
          }
        }
      }
    };

    return baseOptions;
  }, [type]);

  const renderChart = () => {
    switch (type) {
      case 'line':
      case 'area':
        return <Line data={chartData} options={chartOptions} />;
      case 'bar':
        return <Bar data={chartData} options={chartOptions} />;
      case 'pie':
        return <Pie data={chartData} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={chartOptions} />;
      default:
        return <Line data={chartData} options={chartOptions} />;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'line':
      case 'area':
        return <TrendingUp className="w-5 h-5 text-purple-400" />;
      case 'bar':
        return <BarChart3 className="w-5 h-5 text-purple-400" />;
      case 'pie':
      case 'doughnut':
        return <PieChart className="w-5 h-5 text-purple-400" />;
      default:
        return <Activity className="w-5 h-5 text-purple-400" />;
    }
  };

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const averageValue = data.length > 0 ? totalValue / data.length : 0;
  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));

  return (
    <BaseChart
      title={title}
      className={className}
      exportData={() => ({
        json: JSON.stringify(data, null, 2),
        csv: [
          'label,value,trend,change',
          ...data.map(item => 
            `${item.label},${item.value},${item.trend || ''},${item.change || ''}`
          )
        ].join('\n')
      })}
    >
      <div className="h-full flex flex-col bg-slate-900/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <span className="font-medium text-white">{title}</span>
          </div>
          <div className="text-sm text-slate-400">
            {data.length} data points
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-700/50 bg-slate-800/30">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{totalValue.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{averageValue.toFixed(1)}</div>
            <div className="text-xs text-slate-400">Average</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{maxValue.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Max</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">{minValue.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Min</div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 p-4">
          <div className="h-full">
            {renderChart()}
          </div>
        </div>

        {/* Trends Section */}
        {showTrends && (
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
            <div className="grid grid-cols-2 gap-4">
              {data.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color || colors[index % colors.length] }}
                    />
                    <span className="text-sm text-slate-300">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">{item.value.toLocaleString()}</span>
                    {item.trend && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.trend === 'up' ? 'bg-green-900/50 text-green-300' :
                        item.trend === 'down' ? 'bg-red-900/50 text-red-300' :
                        'bg-slate-700/50 text-slate-400'
                      }`}>
                        {item.trend === 'up' ? '↗' : item.trend === 'down' ? '↘' : '→'}
                        {item.change && ` ${item.change > 0 ? '+' : ''}${item.change}%`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseChart>
  );
};

export default MetricsChart;