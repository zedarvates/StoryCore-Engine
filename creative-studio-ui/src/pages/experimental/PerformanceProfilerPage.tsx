/**
 * Performance Profiler - Experimental Feature
 * 
 * Real-time performance monitoring and optimization tools.
 * This is a work-in-progress experimental feature accessible only through
 * the Secret Services Menu (Ctrl+Shift+Alt).
 * 
 * Feature ID: performance-profiler
 * Requirements: 2.1, 2.2, 7.3
 * 
 * Note: This feature is currently disabled in the registry (enabled: false)
 * and will not appear in the Secret Services Menu until enabled.
 */

import { useEffect } from 'react';
import { useSecretMode } from '@/contexts/SecretModeContext';

export const PerformanceProfilerPage: React.FC = () => {
  const { setCurrentExperimentalFeature } = useSecretMode();
  
  // Register this page as an experimental feature when mounted
  useEffect(() => {
    setCurrentExperimentalFeature('performance-profiler');
    
    // Clean up when unmounted
    return () => {
      setCurrentExperimentalFeature(undefined);
    };
  }, [setCurrentExperimentalFeature]);
  
  // Handle back navigation
  const handleBack = () => {
    setCurrentExperimentalFeature(undefined);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow transition-colors"
        >
          <span>←</span>
          <span>Back to Main App</span>
        </button>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl">📊</span>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Performance Profiler
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                Real-time performance monitoring and optimization
              </p>
            </div>
          </div>
          
          {/* Experimental Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                Experimental Feature - Work in Progress
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                This feature is under active development and may have incomplete functionality
              </p>
            </div>
          </div>
        </div>
        
        {/* Feature Description */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            🚧 Coming Soon
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The Performance Profiler will provide comprehensive monitoring and optimization:
          </p>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Real-time FPS and render time monitoring</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Memory usage tracking and leak detection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Component render profiling with flame graphs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Network request monitoring and optimization suggestions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Bundle size analysis and code splitting recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Automated performance regression detection</span>
            </li>
          </ul>
        </div>
        
        {/* Mockup Dashboard */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Dashboard Preview (Mockup)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Metric Card 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">FPS</div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">60</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Optimal</div>
            </div>
            
            {/* Metric Card 2 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-700 dark:text-green-300 mb-1">Memory</div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">42 MB</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">Good</div>
            </div>
            
            {/* Metric Card 3 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="text-sm text-orange-700 dark:text-orange-300 mb-1">Load Time</div>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">1.2s</div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Needs Work</div>
            </div>
          </div>
          
          {/* Mock Chart */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-sm">Real-time Performance Graph</p>
              <p className="text-xs mt-1">Interactive charts showing FPS, memory, and render times</p>
            </div>
          </div>
        </div>
        
        {/* Development Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Development Status
          </h3>
          
          {/* Disabled Notice */}
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔒</span>
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                Feature Currently Disabled
              </p>
            </div>
            <p className="text-xs text-red-800 dark:text-red-300">
              This feature is not yet ready for testing and is disabled in the experimental features registry.
              It will not appear in the Secret Services Menu until enabled by the development team.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Metrics Collection
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">20%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Visualization Dashboard
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">5%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Optimization Suggestions
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">0%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
            <p className="text-sm text-teal-900 dark:text-teal-200">
              <strong>Technical Note:</strong> The Performance Profiler will integrate with React DevTools
              Profiler API and browser Performance APIs to provide comprehensive monitoring capabilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
