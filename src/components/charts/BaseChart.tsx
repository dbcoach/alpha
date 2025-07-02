import React, { useRef, useEffect, useState } from 'react';
import { Download, Maximize2, Minimize2 } from 'lucide-react';

interface BaseChartProps {
  title: string;
  subtitle?: string;
  data: unknown[];
  className?: string;
  exportable?: boolean;
  fullscreenEnabled?: boolean;
  children: React.ReactNode;
  onExport?: (format: 'png' | 'svg' | 'json') => void;
}

export const BaseChart: React.FC<BaseChartProps> = ({
  title,
  subtitle,
  data,
  className = '',
  exportable = true,
  fullscreenEnabled = true,
  children,
  onExport
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = (format: 'png' | 'svg' | 'json') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export behavior
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-data.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
    setShowExportMenu(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  const chartContent = (
    <div
      ref={chartRef}
      className={`bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 border-0 rounded-none' : ''
      }`}
      role="img"
      aria-label={`${title} chart visualization`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/20">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
          {exportable && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-sm text-slate-300"
                aria-label="Export chart"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={() => handleExport('png')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-t-lg transition-colors"
                  >
                    PNG Image
                  </button>
                  <button
                    onClick={() => handleExport('svg')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                  >
                    SVG Vector
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-b-lg transition-colors"
                  >
                    JSON Data
                  </button>
                </div>
              )}
            </div>
          )}
          
          {fullscreenEnabled && (
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Chart content */}
      <div className={`${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-96'} p-4`}>
        {children}
      </div>
    </div>
  );

  return (
    <>
      {chartContent}
      
      {/* Backdrop for fullscreen */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
      
      {/* Click outside handler */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </>
  );
};

export default BaseChart;