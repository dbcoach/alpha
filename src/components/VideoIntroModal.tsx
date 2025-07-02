import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, ExternalLink } from 'lucide-react';

interface VideoIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoIntroModal({ isOpen, onClose }: VideoIntroModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // YouTube video ID and URLs
  const youtubeVideoId = 'Ak7HrkdkHVE';
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1&controls=1&fs=1&playsinline=1`;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setShowVideo(false);
      setHasError(false);
    }
  }, [isOpen]);

  const handlePlayVideo = () => {
    setShowVideo(true);
  };

  const handleIframeError = () => {
    setHasError(true);
  };

  const openYouTube = () => {
    window.open(youtubeWatchUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Video Container with elegant border */}
        <div className="relative bg-slate-900/95 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 overflow-hidden backdrop-blur-xl">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to DB.Coach</h2>
              <p className="text-slate-300 text-sm mt-1">Discover how AI transforms database design</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
              aria-label="Close video"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* YouTube Video Player */}
          <div className="relative aspect-video bg-black">
            {!showVideo && !hasError ? (
              /* Video Thumbnail with Play Button */
              <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                {/* YouTube Thumbnail Background */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-60"
                  style={{
                    backgroundImage: `url(https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg)`
                  }}
                />
                
                {/* Play Button Overlay */}
                <div className="relative z-10 flex flex-col items-center space-y-4">
                  <button
                    onClick={handlePlayVideo}
                    className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-2xl"
                    aria-label="Play video"
                  >
                    <Play className="w-8 h-8 text-white ml-1" />
                  </button>
                  <p className="text-white text-sm font-medium">Click to play video</p>
                </div>
              </div>
            ) : hasError ? (
              /* Error Fallback */
              <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center space-y-4 p-8">
                <div className="text-center">
                  <h3 className="text-white font-semibold mb-2">Unable to load video</h3>
                  <p className="text-slate-300 text-sm mb-4">
                    The video couldn't be embedded. You can watch it directly on YouTube.
                  </p>
                  <button
                    onClick={openYouTube}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Watch on YouTube</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Embedded Video */
              <iframe
                ref={iframeRef}
                className="w-full h-full"
                src={youtubeEmbedUrl}
                title="DB.Coach Introduction Video"
                frameBorder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onError={handleIframeError}
                style={{
                  border: 'none',
                  borderRadius: '0'
                }}
              />
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Ready to get started?</p>
                <p className="text-slate-300 text-sm">Try our live demo or sign up for free</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    onClose();
                    // Navigate to demo - you can add navigation logic here
                    window.location.href = '/demo';
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Try Demo
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}