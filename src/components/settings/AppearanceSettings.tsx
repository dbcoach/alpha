import React, { useState } from 'react';
import { 
  Monitor, 
  Moon, 
  Sun, 
  Palette, 
  Type, 
  Code, 
  Zap,
  Sparkles,
  Save
} from 'lucide-react';

interface AppearancePreferences {
  theme: 'light' | 'dark' | 'system';
  editorTheme: string;
  fontSize: string;
  animations: boolean;
  glassmorphism: boolean;
  compactMode: boolean;
  highContrast: boolean;
}

export function AppearanceSettings() {
  const [preferences, setPreferences] = useState<AppearancePreferences>({
    theme: 'dark',
    editorTheme: 'github',
    fontSize: '14',
    animations: true,
    glassmorphism: true,
    compactMode: false,
    highContrast: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccessMessage('Preferences saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updatePreference = <K extends keyof AppearancePreferences>(
    key: K, 
    value: AppearancePreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Appearance</h2>
        <p className="text-slate-300">
          Customize how DB.Coach looks and feels
        </p>
      </div>
      
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300">
          {successMessage}
        </div>
      )}
      
      {/* Theme Selection */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme
        </h3>
        <p className="text-slate-300 mb-6">
          Select your preferred color theme
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Light Theme */}
          <button
            onClick={() => updatePreference('theme', 'light')}
            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
              preferences.theme === 'light' 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Sun className="h-5 w-5 text-yellow-400" />
              <span className="font-medium text-white">Light</span>
            </div>
            <div className="aspect-video rounded-lg bg-gradient-to-br from-white to-gray-100 border border-slate-300" />
          </button>
          
          {/* Dark Theme */}
          <button
            onClick={() => updatePreference('theme', 'dark')}
            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
              preferences.theme === 'dark' 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Moon className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-white">Dark</span>
            </div>
            <div className="aspect-video rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-600" />
          </button>
          
          {/* System Theme */}
          <button
            onClick={() => updatePreference('theme', 'system')}
            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
              preferences.theme === 'system' 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Monitor className="h-5 w-5 text-slate-400" />
              <span className="font-medium text-white">System</span>
            </div>
            <div className="aspect-video rounded-lg bg-gradient-to-r from-white via-slate-500 to-slate-900 border border-slate-600" />
          </button>
        </div>
      </div>
      
      {/* Editor Preferences */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Code className="h-5 w-5" />
          Code Editor
        </h3>
        <p className="text-slate-300 mb-6">
          Configure code editor appearance
        </p>
        
        <div className="space-y-6">
          {/* Editor Theme */}
          <div className="space-y-2">
            <label htmlFor="editor-theme" className="text-sm font-medium text-slate-300">
              Editor Theme
            </label>
            <select 
              id="editor-theme"
              value={preferences.editorTheme} 
              onChange={(e) => updatePreference('editorTheme', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="github">GitHub</option>
              <option value="dracula">Dracula</option>
              <option value="monokai">Monokai</option>
              <option value="nord">Nord</option>
              <option value="synthwave">SynthWave '84</option>
            </select>
          </div>
          
          {/* Font Size */}
          <div className="space-y-2">
            <label htmlFor="font-size" className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Type className="h-4 w-4" />
              Font Size
            </label>
            <select 
              id="font-size"
              value={preferences.fontSize} 
              onChange={(e) => updatePreference('fontSize', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="12">12px</option>
              <option value="14">14px (Default)</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
              <option value="20">20px</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Visual Effects */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Visual Effects
        </h3>
        <p className="text-slate-300 mb-6">
          Control animations and visual enhancements
        </p>
        
        <div className="space-y-6">
          {/* Animations */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label htmlFor="animations" className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Zap className="h-4 w-4" />
                Animations
              </label>
              <p className="text-sm text-slate-400">
                Enable smooth transitions and micro-interactions
              </p>
            </div>
            <button
              onClick={() => updatePreference('animations', !preferences.animations)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.animations ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.animations ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Glassmorphism */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label htmlFor="glassmorphism" className="text-sm font-medium text-slate-300">
                Glassmorphism
              </label>
              <p className="text-sm text-slate-400">
                Enable frosted glass effects on cards
              </p>
            </div>
            <button
              onClick={() => updatePreference('glassmorphism', !preferences.glassmorphism)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.glassmorphism ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.glassmorphism ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Compact Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label htmlFor="compact" className="text-sm font-medium text-slate-300">
                Compact Mode
              </label>
              <p className="text-sm text-slate-400">
                Reduce spacing for more content density
              </p>
            </div>
            <button
              onClick={() => updatePreference('compactMode', !preferences.compactMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.compactMode ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.compactMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label htmlFor="contrast" className="text-sm font-medium text-slate-300">
                High Contrast
              </label>
              <p className="text-sm text-slate-400">
                Increase contrast for better visibility
              </p>
            </div>
            <button
              onClick={() => updatePreference('highContrast', !preferences.highContrast)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.highContrast ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Preferences
        </button>
      </div>
    </div>
  );
}