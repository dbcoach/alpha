import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  MessageSquare,
  History,
  Zap,
  Download
} from 'lucide-react';
import { DatabaseProject, DatabaseSession } from '../../services/databaseProjectsService';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  project: DatabaseProject;
  session: DatabaseSession;
  onNewGeneration?: (prompt: string) => void;
  onExport?: (messages: ChatMessage[]) => void;
}

export function ChatInterface({ 
  project, 
  session, 
  onNewGeneration,
  onExport 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initialize with a welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `Welcome back! I'm ready to help you continue working on your ${project.database_type} database project "${project.database_name}". 

What would you like to do next? I can help you:
• Refine the existing database schema
• Generate additional SQL scripts or queries
• Optimize performance and relationships
• Add new features or tables
• Answer questions about the current design

Just describe what you'd like to work on!`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [project]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response - in a real implementation, this would call your AI service
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: generateContextualResponse(userMessage.content, project),
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const generateContextualResponse = (userInput: string, project: DatabaseProject): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('schema') || input.includes('table') || input.includes('structure')) {
      return `I'd be happy to help with your ${project.database_type} schema! Based on your current project "${project.database_name}", I can help you:

• Add new tables and relationships
• Modify existing table structures
• Optimize indexes and constraints
• Review normalization

Would you like me to generate a new streaming session to work on this, or do you have specific schema changes in mind?`;
    }
    
    if (input.includes('query') || input.includes('sql') || input.includes('select')) {
      return `Great! I can help you create optimized SQL queries for your ${project.database_type} database. I can generate:

• Complex SELECT statements with JOINs
• Data analysis and reporting queries
• Performance-optimized queries with proper indexing
• Stored procedures and functions

What specific data are you looking to query or what functionality do you need?`;
    }
    
    if (input.includes('performance') || input.includes('optimize') || input.includes('slow')) {
      return `Performance optimization is crucial! For your ${project.database_type} database, I can help with:

• Query optimization and execution plans
• Index analysis and recommendations
• Database configuration tuning
• Identifying bottlenecks and slow queries

Would you like me to analyze your current schema and suggest optimizations?`;
    }
    
    if (input.includes('new') || input.includes('add') || input.includes('feature')) {
      return `Exciting! Adding new features to "${project.database_name}" can really enhance its capabilities. I can help you:

• Design new database components
• Plan feature implementation
• Generate migration scripts
• Ensure compatibility with existing structure

What kind of new feature are you thinking about? I can start a new streaming generation session to build it out completely.`;
    }
    
    return `That's an interesting request! For your ${project.database_type} project "${project.database_name}", I can provide detailed assistance. 

Would you like me to:
1. Start a new streaming generation session to build this out completely
2. Provide specific code snippets and guidance here
3. Help you plan the implementation approach

Let me know which approach works best for you!`;
  };

  const handleNewGeneration = () => {
    if (onNewGeneration && inputValue.trim()) {
      onNewGeneration(inputValue.trim());
    }
  };

  const handleExportChat = () => {
    if (onExport) {
      onExport(messages);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="font-semibold text-white">Continue Conversation</h3>
            <p className="text-sm text-slate-400">{project.database_name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportChat}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Export chat"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={`max-w-[70%] ${message.type === 'user' ? 'order-last' : ''}`}>
              <div className={`rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-slate-800/70 border border-slate-700/50 text-slate-200'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
              <div className={`text-xs text-slate-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
            
            {message.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-200" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800/70 border border-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-slate-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700/50 bg-slate-800/30 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your database, request modifications, or describe new features..."
              className="w-full px-4 py-3 pr-12 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
              rows={3}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Press Enter to send, Shift+Enter for new line
            </p>
            
            {inputValue.trim() && onNewGeneration && (
              <button
                type="button"
                onClick={handleNewGeneration}
                className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-500/30 text-green-300 rounded-lg text-sm hover:bg-green-600/30 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Start Generation
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}