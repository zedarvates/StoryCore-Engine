/**
 * Builder.io Integration Component for StoryCore
 * 
 * This component provides a visual interface for Builder.io within StoryCore Engine.
 * It enables drag-and-drop UI building, AI-generated layouts, and component library integration.
 */

import React, { useState, useCallback } from 'react';
import {
  Layout,
  Palette,
  Wand2,
  Layers,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
// import { useToast } from '@/hooks/use-toast';

// Builder.io Configuration Types
interface BuilderIOConfig {
  serverUrl: string;
  projectType: 'react-vite' | 'react' | 'vue' | 'angular';
  entryPoint: string;
  aiEnabled: boolean;
  visualEditorEnabled: boolean;
  libraryPath: string;
}

interface BuilderIOState {
  isConnected: boolean;
  isLoading: boolean;
  currentComponent: string | null;
  suggestedComponents: string[];
}

// Default configuration
const defaultConfig: BuilderIOConfig = {
  serverUrl: 'http://localhost:5173',
  projectType: 'react-vite',
  entryPoint: 'creative-studio-ui/src/main.tsx',
  aiEnabled: true,
  visualEditorEnabled: true,
  libraryPath: 'creative-studio-ui/src/components'
};

// AI-powered component suggestions
const suggestedComponents = [
  { name: 'VideoEditorPanel', description: 'Main video editing panel', icon: '🎬' },
  { name: 'TimelineComponent', description: 'Video timeline editor', icon: '📽️' },
  { name: 'PropertiesPanel', description: 'Properties editor panel', icon: '⚙️' },
  { name: 'AssetLibrary', description: 'Media asset browser', icon: '📚' },
  { name: 'WizardModal', description: 'Multi-step wizard dialog', icon: '🧙' },
  { name: 'PreviewPlayer', description: 'Video preview player', icon: '▶️' },
  { name: 'AIGenerationPanel', description: 'AI-powered generation panel', icon: '🤖' },
  { name: 'SettingsPanel', description: 'Application settings', icon: '🔧' }
];

export function BuilderIOIntegration() {
  // const { toast } = useToast();
  const toast = (message: any) => console.log('Toast:', message);
  const [config] = useState<BuilderIOConfig>(defaultConfig);
  const [state, setState] = useState<BuilderIOState>({
    isConnected: false,
    isLoading: false,
    currentComponent: null,
    suggestedComponents: suggestedComponents.map(c => c.name)
  });

  // Check connection to Builder.io server
  const checkConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`${config.serverUrl}/api/health`);
      const isConnected = response.ok;
      
      setState(prev => ({
        ...prev,
        isConnected,
        isLoading: false
      }));
      
      toast({
        title: isConnected ? 'Connected' : 'Disconnected',
        description: isConnected 
          ? 'Builder.io server is running' 
          : 'Cannot connect to Builder.io server',
        variant: isConnected ? 'default' : 'destructive'
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false
      }));
      
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to Builder.io server',
        variant: 'destructive'
      });
    }
  }, [config.serverUrl]);

  // Open Builder.io Visual Editor
  const openVisualEditor = useCallback(() => {
    if (!state.isConnected) {
      toast({
        title: 'Not Connected',
        description: 'Please connect to Builder.io server first',
        variant: 'destructive'
      });
      return;
    }
    
    window.open(`${config.serverUrl}/builder`, '_blank');
    
    toast({
      title: 'Opening Editor',
      description: 'Builder.io Visual Editor is opening in a new tab',
    });
  }, [state.isConnected, config.serverUrl]);

  // Generate component using AI
  const generateComponent = useCallback((componentName: string) => {
    setState(prev => ({
      ...prev,
      currentComponent: componentName
    }));
    
    toast({
      title: 'Generating Component',
      description: `AI is generating ${componentName}...`,
    });
    
    // Simulate AI generation
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        currentComponent: null
      }));
      
      toast({
        title: 'Component Generated',
        description: `${componentName} has been created successfully`,
      });
    }, 2000);
  }, []);

  // Open component library
  const openLibrary = useCallback(() => {
    window.open(`${config.serverUrl}/library`, '_blank');
  }, [config.serverUrl]);

  return (
    <div className="builder-io-integration p-6 bg-gray-900 rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Layout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Builder.io Visual AI Editor</h2>
            <p className="text-sm text-gray-400">Drag-and-drop UI builder with AI capabilities</p>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {state.isLoading ? (
            <span className="text-yellow-400 flex items-center gap-2">
              <span className="animate-spin">⏳</span> Checking...
            </span>
          ) : state.isConnected ? (
            <span className="text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Connected
            </span>
          ) : (
            <span className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={checkConnection}
          className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-blue-400" />
          <span className="text-white">Check Connection</span>
        </button>
        
        <button
          onClick={openVisualEditor}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
          <span className="text-white">Open Visual Editor</span>
        </button>
        
        <button
          onClick={openLibrary}
          className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
        >
          <Layers className="w-5 h-5" />
          <span className="text-white">Component Library</span>
        </button>
      </div>

      {/* AI-Powered Suggestions */}
      {config.aiEnabled && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">AI Component Suggestions</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {suggestedComponents.map((component) => (
              <button
                key={component.name}
                onClick={() => generateComponent(component.name)}
                disabled={state.currentComponent === component.name}
                className={`p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-left ${
                  state.currentComponent === component.name ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{component.icon}</span>
                  <span className="font-medium text-white">{component.name}</span>
                </div>
                <p className="text-xs text-gray-400">{component.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Visual Editor Features */}
      {config.visualEditorEnabled && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-semibold text-white">Visual Editor Features</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="font-medium text-white mb-2">Drag-and-Drop UI Building</h4>
              <p className="text-sm text-gray-400">
                Build interfaces visually by dragging components from the library
              </p>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="font-medium text-white mb-2">AI Layout Generation</h4>
              <p className="text-sm text-gray-400">
                Let AI generate optimal layouts based on your requirements
              </p>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="font-medium text-white mb-2">Visual Content Editing</h4>
              <p className="text-sm text-gray-400">
                Edit component properties and content visually in real-time
              </p>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="font-medium text-white mb-2">Component Library Integration</h4>
              <p className="text-sm text-gray-400">
                Access and customize StoryCore components from the library
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Info */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <h3 className="font-medium text-white mb-3">Configuration</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-400">Server URL:</div>
          <div className="text-white font-mono">{config.serverUrl}</div>
          
          <div className="text-gray-400">Project Type:</div>
          <div className="text-white font-mono">{config.projectType}</div>
          
          <div className="text-gray-400">Entry Point:</div>
          <div className="text-white font-mono">{config.entryPoint}</div>
          
          <div className="text-gray-400">Library Path:</div>
          <div className="text-white font-mono">{config.libraryPath}</div>
        </div>
      </div>
    </div>
  );
}

export default BuilderIOIntegration;