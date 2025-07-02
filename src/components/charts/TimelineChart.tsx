import React, { useMemo } from 'react';
import { Clock, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import BaseChart from './BaseChart';

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'in-progress' | 'pending' | 'error';
  timestamp: Date;
  duration?: number; // in milliseconds
  agent?: string;
}

interface TimelineChartProps {
  events: TimelineEvent[];
  title?: string;
  className?: string;
}

const TimelineChart: React.FC<TimelineChartProps> = ({ 
  events, 
  title = 'Generation Timeline',
  className = ''
}) => {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [events]);

  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'in-progress':
        return <Zap className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-400 bg-green-400/10';
      case 'in-progress':
        return 'border-blue-400 bg-blue-400/10';
      case 'error':
        return 'border-red-400 bg-red-400/10';
      default:
        return 'border-slate-400 bg-slate-400/10';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const totalDuration = useMemo(() => {
    return events.reduce((total, event) => total + (event.duration || 0), 0);
  }, [events]);

  const completedEvents = events.filter(e => e.status === 'completed').length;
  const progressPercentage = events.length > 0 ? (completedEvents / events.length) * 100 : 0;

  return (
    <BaseChart
      title={title}
      className={className}
      exportData={() => ({
        json: JSON.stringify(events, null, 2),
        csv: [
          'timestamp,title,status,duration,agent,description',
          ...events.map(e => 
            `${e.timestamp.toISOString()},${e.title},${e.status},${e.duration || 0},${e.agent || ''},${e.description || ''}`
          )
        ].join('\n')
      })}
    >
      <div className="h-full flex flex-col bg-slate-900/50">
        {/* Header Stats */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{events.length}</div>
              <div className="text-sm text-slate-400">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{completedEvents}</div>
              <div className="text-sm text-slate-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{progressPercentage.toFixed(0)}%</div>
              <div className="text-sm text-slate-400">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{formatDuration(totalDuration)}</div>
              <div className="text-sm text-slate-400">Total Time</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-auto p-4">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-600" />
            
            {/* Timeline Events */}
            <div className="space-y-6">
              {sortedEvents.map((event, index) => (
                <div key={event.id} className="relative flex items-start space-x-4">
                  {/* Timeline Node */}
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getStatusColor(event.status)}`}>
                    {getStatusIcon(event.status)}
                  </div>
                  
                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{event.title}</h4>
                          {event.description && (
                            <p className="mt-1 text-sm text-slate-300">{event.description}</p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-xs text-slate-400">
                            <span>{event.timestamp.toLocaleTimeString()}</span>
                            {event.duration && (
                              <span>Duration: {formatDuration(event.duration)}</span>
                            )}
                            {event.agent && (
                              <span>Agent: {event.agent}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                          event.status === 'in-progress' ? 'bg-blue-900/50 text-blue-300' :
                          event.status === 'error' ? 'bg-red-900/50 text-red-300' :
                          'bg-slate-700/50 text-slate-400'
                        }`}>
                          {event.status.replace('-', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Empty State */}
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Clock className="w-12 h-12 mb-4" />
                <p>No timeline events to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseChart>
  );
};

export default TimelineChart;