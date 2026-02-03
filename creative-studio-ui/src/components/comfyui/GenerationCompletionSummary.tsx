/**
 * GenerationCompletionSummary Component
 * 
 * Displays a summary of completed generation session including total time,
 * success/failure counts, and average time per image.
 * 
 * Requirements: 8.6
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Generation completion statistics
 */
export interface GenerationStats {
  /** Total generation time in milliseconds */
  totalTime: number;
  /** Number of successful generations */
  successCount: number;
  /** Number of failed generations */
  failureCount: number;
  /** Average time per image in milliseconds */
  averageTimePerImage: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Total number of images attempted */
  totalImages: number;
}

/**
 * Props for GenerationCompletionSummary component
 */
export interface GenerationCompletionSummaryProps {
  /** Generation statistics */
  stats: GenerationStats;
  /** Optional CSS class name */
  className?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Callback when user clicks to view results */
  onViewResults?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format timestamp to readable date/time
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate success rate percentage
 */
function calculateSuccessRate(successCount: number, totalImages: number): number {
  if (totalImages === 0) return 0;
  return Math.round((successCount / totalImages) * 100);
}

// ============================================================================
// Component
// ============================================================================

/**
 * GenerationCompletionSummary Component
 * 
 * Displays comprehensive statistics about a completed generation session.
 * 
 * Requirements: 8.6
 */
export const GenerationCompletionSummary: React.FC<GenerationCompletionSummaryProps> = ({
  stats,
  className = '',
  compact = false,
  onViewResults,
}) => {
  const successRate = calculateSuccessRate(stats.successCount, stats.totalImages);
  const hasFailures = stats.failureCount > 0;

  // ============================================================================
  // Compact Mode Render
  // ============================================================================

  if (compact) {
    return (
      <div className={`flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-green-900">
            Generation Complete
          </div>
          <div className="text-xs text-green-700">
            {stats.successCount} / {stats.totalImages} images in {formatDuration(stats.totalTime)}
          </div>
        </div>
        {onViewResults && (
          <button
            onClick={onViewResults}
            className="text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
          >
            View Results
          </button>
        )}
      </div>
    );
  }

  // ============================================================================
  // Full Mode Render
  // ============================================================================

  return (
    <Card className={cn('border-green-200 bg-green-50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-green-900">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Generation Complete
        </CardTitle>
        <p className="text-sm text-green-700">
          Your sequence has been generated successfully
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Generation Time */}
        {/* Requirements: 8.6 */}
        <div className="p-4 bg-white rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-5 w-5 text-green-700" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Total Generation Time</div>
              <div className="text-2xl font-bold text-green-900">
                {formatDuration(stats.totalTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Success vs Failed Generations */}
        {/* Requirements: 8.6 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Successful</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {stats.successCount}
            </div>
            <div className="text-xs text-green-700 mt-1">
              {successRate}% success rate
            </div>
          </div>

          <div className={cn(
            'p-4 rounded-lg border',
            hasFailures 
              ? 'bg-red-50 border-red-200' 
              : 'bg-white border-green-200'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className={cn(
                'h-4 w-4',
                hasFailures ? 'text-red-600' : 'text-gray-400'
              )} />
              <span className="text-xs text-muted-foreground">Failed</span>
            </div>
            <div className={cn(
              'text-2xl font-bold',
              hasFailures ? 'text-red-900' : 'text-gray-600'
            )}>
              {stats.failureCount}
            </div>
            {hasFailures && (
              <div className="text-xs text-red-700 mt-1">
                {Math.round((stats.failureCount / stats.totalImages) * 100)}% failure rate
              </div>
            )}
          </div>
        </div>

        {/* Average Time Per Image */}
        {/* Requirements: 8.6 */}
        <div className="p-4 bg-white rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-5 w-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Average Time Per Image</div>
              <div className="text-xl font-bold text-gray-900">
                {formatDuration(stats.averageTimePerImage)}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="p-4 bg-white rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Performance Metrics</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Images</span>
              <span className="font-medium">{stats.totalImages}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Started</span>
              <span className="font-medium">{formatTimestamp(stats.startTime)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{formatTimestamp(stats.endTime)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Success Rate</span>
              <span className={cn(
                'font-medium',
                successRate >= 90 ? 'text-green-600' : 
                successRate >= 70 ? 'text-yellow-600' : 
                'text-red-600'
              )}>
                {successRate}%
              </span>
            </div>
          </div>
        </div>

        {/* View Results Button */}
        {onViewResults && (
          <button
            onClick={onViewResults}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            View Generated Results
          </button>
        )}

        {/* Failure Warning */}
        {hasFailures && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-yellow-900 block mb-1">
                  Some Generations Failed
                </span>
                <span className="text-xs text-yellow-700">
                  {stats.failureCount} image{stats.failureCount !== 1 ? 's' : ''} failed to generate. 
                  Check the error logs for details.
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GenerationCompletionSummary;
