import React, { useEffect, useRef } from 'react';
import { Bot, User, Zap, Database, Code, Shield, FileText } from 'lucide-react';
import useGeneration from '../hooks/useGeneration';

const AIReasoningPanel: React.FC = () => {
  const { reasoningMessages, isGenerating, getTabStatus, state } = useGeneration();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [reasoningMessages]);

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-elegant" style={{
        scrollBehavior: 'smooth'
      }}>
        {reasoningMessages.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              message.type === 'ai' 
                ? 'bg-purple-500/20 border border-purple-500/30' 
                : 'bg-slate-600/30 border border-slate-500/30'
            }`}>
              {message.type === 'ai' ? (
                <Bot className="w-4 h-4 text-purple-400" />
              ) : (
                <User className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`p-3 rounded-lg ${
                message.type === 'ai'
                  ? 'bg-slate-700/30 border border-slate-600/30'
                  : 'bg-slate-600/30 border border-slate-500/30'
              }`}>
                {message.agent && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-xs font-medium text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
                      {message.agent}
                    </div>
                  </div>
                )}
                <p className="text-slate-200 text-sm leading-relaxed break-words">
                  {message.content}
                </p>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-slate-500">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.agent && (
                  <span className="text-xs text-slate-500">•</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 flex-shrink-0">
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-slate-400 text-sm ml-2">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Progress indicators */}
      <div className="flex-shrink-0 p-6 border-t border-slate-700/50 bg-slate-800/20">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Generation Progress</h3>
            {(state?.mode ?? 'standard') === 'dbcoach' && (
              <div className="flex items-center space-x-1">
                <Bot className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-purple-300">DBCoach Pro</span>
              </div>
            )}
          </div>
          
          {(state?.mode ?? 'standard') === 'dbcoach' ? (
            // DBCoach mode - show multi-agent progress
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Step {state?.progressStep ?? 0} of {state?.totalSteps ?? 0}</span>
                {state?.currentAgent && (
                  <span className="text-purple-300">🤖 {state.currentAgent}</span>
                )}
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((state?.progressStep ?? 0) / (state?.totalSteps ?? 1)) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: FileText, label: 'Requirements', agent: 'Requirements Analyst' },
                  { icon: Database, label: 'Schema Design', agent: 'Schema Architect' },
                  { icon: Code, label: 'Implementation', agent: 'Implementation Specialist' },
                  { icon: Shield, label: 'Quality Report', agent: 'Quality Assurance' },
                ].map((item, index) => {
                  const Icon = item.icon;
                  const isActive = state?.currentAgent === item.agent;
                  const isCompleted = (state?.progressStep ?? 0) > index + 1;
                  
                  return (
                    <div key={index} className={`flex items-center space-x-2 p-2 rounded-lg ${
                      isCompleted
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : isActive
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-slate-700/30 border border-slate-600/30'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        isCompleted 
                          ? 'text-green-400' 
                          : isActive 
                          ? 'text-purple-400' 
                          : 'text-slate-400'
                      }`} />
                      <span className={`text-xs truncate ${
                        isCompleted 
                          ? 'text-green-300' 
                          : isActive 
                          ? 'text-purple-300' 
                          : 'text-slate-400'
                      }`}>
                        {item.label}
                      </span>
                      {isCompleted && (
                        <div className="w-2 h-2 bg-green-400 rounded-full ml-auto flex-shrink-0"></div>
                      )}
                      {isActive && (
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse ml-auto flex-shrink-0"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Standard mode - show updated progress
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: FileText, label: 'Analysis', step: 'analysis' as const },
                { icon: Database, label: 'Schema', step: 'schema' as const },
                { icon: Code, label: 'Implementation', step: 'implementation' as const },
                { icon: Shield, label: 'Validation', step: 'validation' as const },
                { icon: Zap, label: 'Visualization', step: 'visualization' as const },
              ].map((item, index) => {
                const Icon = item.icon;
                const status = getTabStatus(item.step);
                const isCompleted = status === 'completed';
                const isGenerating = status === 'generating';
                
                return (
                  <div key={index} className={`flex items-center space-x-2 p-2 rounded-lg ${
                    isCompleted
                      ? 'bg-green-500/20 border border-green-500/30' 
                      : isGenerating
                      ? 'bg-purple-500/20 border border-purple-500/30'
                      : 'bg-slate-700/30 border border-slate-600/30'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      isCompleted 
                        ? 'text-green-400' 
                        : isGenerating 
                        ? 'text-purple-400' 
                        : 'text-slate-400'
                    }`} />
                    <span className={`text-xs truncate ${
                      isCompleted 
                        ? 'text-green-300' 
                        : isGenerating 
                        ? 'text-purple-300' 
                        : 'text-slate-400'
                    }`}>
                      {item.label}
                    </span>
                    {isCompleted && (
                      <div className="w-2 h-2 bg-green-400 rounded-full ml-auto flex-shrink-0"></div>
                    )}
                    {isGenerating && (
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse ml-auto flex-shrink-0"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIReasoningPanel;