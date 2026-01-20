/**
 * PerformanceMonitor - Monitors and displays timeline performance metrics
 * Tracks FPS, render time, and memory usage
 */

import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  shotCount: number;
  timestamp: number;
}

interface PerformanceMonitorProps {
  shotCount: number;
  enabled?: boolean;
  showWarnings?: boolean;
  className?: string;
}

const PERFORMANCE_THRESHOLDS = {
  FPS_WARNING: 45,
  FPS_CRITICAL: 30,
  RENDER_TIME_WARNING: 50, // ms
  RENDER_TIME_CRITICAL: 100, // ms
  MEMORY_WARNING: 400, // MB
  MEMORY_CRITICAL: 700, // MB
  SHOT_COUNT_SUGGESTION: 50, // Suggest optimizations above this
};

export const PerformanceMonitor = memo<PerformanceMonitorProps>(({
  shotCount,
  enabled = true,
  showWarnings = true,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    memoryUsage: 0,
    shotCount: 0,
    timestamp: Date.now()
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showOptimizationSuggestion, setShowOptimizationSuggestion] = useState(false);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderStartRef = useRef(0);
  const metricsHistoryRef = useRef<PerformanceMetrics[]>([]);

  // Measure FPS
  const measureFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;

    if (delta >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / delta);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
      return fps;
    }

    frameCountRef.current++;
    return null;
  }, []);

  // Measure render time
  const measureRenderTime = useCallback(() => {
    if (renderStartRef.current > 0) {
      const renderTime = performance.now() - renderStartRef.current;
      renderStartRef.current = 0;
      return renderTime;
    }
    return 0;
  }, []);

  // Measure memory usage
  const measureMemory = useCallback((): number => {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / (1024 * 1024));
    }
    return 0;
  }, []);

  // Update metrics
  useEffect(() => {
    if (!enabled) return;

    renderStartRef.current = performance.now();

    const updateMetrics = () => {
      const fps = measureFPS();
      const renderTime = measureRenderTime();
      const memoryUsage = measureMemory();

      if (fps !== null) {
        const newMetrics: PerformanceMetrics = {
          fps,
          renderTime,
          memoryUsage,
          shotCount,
          timestamp: Date.now()
        };

        setMetrics(newMetrics);

        // Keep history for analysis (last 60 seconds)
        metricsHistoryRef.current.push(newMetrics);
        if (metricsHistoryRef.current.length > 60) {
          metricsHistoryRef.current.shift();
        }

        // Log metrics for debugging
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PerformanceMonitor]', {
            fps,
            renderTime: `${renderTime.toFixed(2)}ms`,
            memory: `${memoryUsage}MB`,
            shots: shotCount
          });
        }
      }

      requestAnimationFrame(updateMetrics);
    };

    const rafId = requestAnimationFrame(updateMetrics);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [enabled, shotCount, measureFPS, measureRenderTime, measureMemory]);

  // Check if optimization suggestions should be shown
  useEffect(() => {
    if (shotCount > PERFORMANCE_THRESHOLDS.SHOT_COUNT_SUGGESTION) {
      setShowOptimizationSuggestion(true);
    } else {
      setShowOptimizationSuggestion(false);
    }
  }, [shotCount]);

  // Determine performance status
  const getPerformanceStatus = useCallback(() => {
    if (metrics.fps < PERFORMANCE_THRESHOLDS.FPS_CRITICAL ||
        metrics.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL ||
        metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL) {
      return 'critical';
    }

    if (metrics.fps < PERFORMANCE_THRESHOLDS.FPS_WARNING ||
        metrics.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING ||
        metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING) {
      return 'warning';
    }

    return 'good';
  }, [metrics]);

  const performanceStatus = getPerformanceStatus();

  if (!enabled) return null;

  return (
    <div className={`${className} bg-gray-800 border border-gray-700 rounded-lg shadow-lg`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Performance</span>
          
          {/* Status Indicator */}
          {performanceStatus === 'good' && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {performanceStatus === 'warning' && (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          )}
          {performanceStatus === 'critical' && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className={metrics.fps < PERFORMANCE_THRESHOLDS.FPS_WARNING ? 'text-yellow-500' : ''}>
            {metrics.fps} FPS
          </span>
          <span>{shotCount} shots</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 py-2 border-t border-gray-700 space-y-2">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-gray-500">FPS</div>
              <div className={`font-mono ${
                metrics.fps < PERFORMANCE_THRESHOLDS.FPS_CRITICAL ? 'text-red-400' :
                metrics.fps < PERFORMANCE_THRESHOLDS.FPS_WARNING ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {metrics.fps}
              </div>
            </div>

            <div>
              <div className="text-gray-500">Render</div>
              <div className={`font-mono ${
                metrics.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL ? 'text-red-400' :
                metrics.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {metrics.renderTime.toFixed(1)}ms
              </div>
            </div>

            <div>
              <div className="text-gray-500">Memory</div>
              <div className={`font-mono ${
                metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL ? 'text-red-400' :
                metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {metrics.memoryUsage}MB
              </div>
            </div>
          </div>

          {/* Warnings */}
          {showWarnings && performanceStatus !== 'good' && (
            <div className={`p-2 rounded text-xs ${
              performanceStatus === 'critical' ? 'bg-red-900/20 text-red-300' :
              'bg-yellow-900/20 text-yellow-300'
            }`}>
              <div className="font-semibold mb-1">Performance Issues Detected</div>
              <ul className="space-y-1 text-xs">
                {metrics.fps < PERFORMANCE_THRESHOLDS.FPS_WARNING && (
                  <li>• Low FPS: {metrics.fps} (target: 60)</li>
                )}
                {metrics.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING && (
                  <li>• Slow rendering: {metrics.renderTime.toFixed(1)}ms</li>
                )}
                {metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING && (
                  <li>• High memory usage: {metrics.memoryUsage}MB</li>
                )}
              </ul>
            </div>
          )}

          {/* Optimization Suggestion */}
          {showOptimizationSuggestion && (
            <div className="p-2 rounded text-xs bg-blue-900/20 text-blue-300">
              <div className="font-semibold mb-1">💡 Optimization Suggestion</div>
              <p>
                You have {shotCount} shots in the timeline. For optimal performance with large timelines,
                consider enabling virtual scrolling or reducing the number of visible shots.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if shot count changes or enabled state changes
  return (
    prevProps.shotCount === nextProps.shotCount &&
    prevProps.enabled === nextProps.enabled &&
    prevProps.showWarnings === nextProps.showWarnings
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';
