import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { Settings } from './components/Settings';
import { DatabaseProjectsPage } from './components/projects/DatabaseProjectsPage';
import { StreamingPage } from './components/streaming/StreamingPage';
import { LiveStreamingPage } from './components/streaming/LiveStreamingPage';
import { StreamingCanvasPage } from './components/streaming/StreamingCanvasPage';
import { ConversationInterface } from './components/streaming/ConversationInterface';
import { UnifiedProjectWorkspace } from './components/projects/UnifiedProjectWorkspace';
import { DemoLandingPage } from './components/demo/DemoLandingPage';
import { DemoLiveGeneration } from './components/demo/DemoLiveGeneration';
import { DemoConversationInterface } from './components/demo/DemoConversationInterface';
import { GenerationProvider } from './context/GenerationContext';
import { AuthProvider } from './contexts/AuthContext';
import { DemoProvider } from './contexts/DemoContext';
import { AuthErrorHandler } from './components/auth/AuthErrorHandler';

function AppContent() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects" element={<DatabaseProjectsPage />} />
        <Route path="/projects/:projectId" element={<UnifiedProjectWorkspace />} />
        <Route path="/generate" element={<UnifiedProjectWorkspace />} />
        <Route path="/streaming" element={<StreamingPage />} />
        <Route path="/streaming-canvas" element={<StreamingCanvasPage />} />
        <Route path="/conversations" element={<ConversationInterface />} />
        <Route path="/streaming-legacy" element={<LiveStreamingPage />} />
        <Route path="/unified-workspace" element={<UnifiedProjectWorkspace />} />
        <Route path="/settings/*" element={<Settings />} />
        
        {/* Demo Routes */}
        <Route path="/demo" element={<DemoLandingPage />} />
        <Route path="/demo/live-generation" element={<DemoLiveGeneration />} />
        <Route path="/demo/conversations" element={<DemoConversationInterface />} />
        <Route path="/demo/streaming-chat" element={<DemoLiveGeneration />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthErrorHandler>
        <Router>
          <DemoProvider>
            <GenerationProvider>
              <AppContent />
            </GenerationProvider>
          </DemoProvider>
        </Router>
      </AuthErrorHandler>
    </AuthProvider>
  );
}

export default App;