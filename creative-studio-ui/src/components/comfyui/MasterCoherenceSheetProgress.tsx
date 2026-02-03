/**
 * MasterCoherenceSheetProgress Component
 * 
 * Displays progress for Master Coherence Sheet (3x3 grid) generation.
 * Shows individual progress for each of the 9 panels with grid visualization
 * and real-time updates as each panel completes.
 * 
 * Requirements: 8.4, 8.5
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Status of a single panel in the grid
 */
export type PanelStatus = 'pending' | 'in-progress' | 'complete' | 'error';

/**
 * Information about a single panel
 */
export interface PanelInfo {
  /** Panel index (0-8) */
  index: number;
  /** Panel status */
  status: PanelStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Props for MasterCoherenceSheetProgress component
 */
export interface MasterCoherenceSheetProgressProps {
  /** Array of 9 panel information objects */
  panels: PanelInfo[];
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  /** Optional CSS class name */
  className?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get panel position in 3x3 grid (row, col)
 */
function getPanelPosition(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / 3),
    col: index % 3,
  };
}

/**
 * Get panel label (A1, A2, A3, B1, B2, B3, C1, C2, C3)
 */
function getPanelLabel(index: number): string {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const rowLabel = String.fromCharCode(65 + row); // A, B, C
  const colLabel = (col + 1).toString(); // 1, 2, 3
  return `${rowLabel}${colLabel}`;
}

/**
 * Get status icon for panel
 */
function getPanelIcon(status: PanelStatus) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'in-progress':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'pending':
    default:
      return <Circle className="h-5 w-5 text-gray-300" />;
  }
}

/**
 * Get background color class for panel based on status
 */
function getPanelColorClass(status: PanelStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-green-50 border-green-300';
    case 'in-progress':
      return 'bg-blue-50 border-blue-300';
    case 'error':
      return 'bg-red-50 border-red-300';
    case 'pending':
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

/**
 * Calculate completion statistics
 */
function getCompletionStats(panels: PanelInfo[]): {
  completed: number;
  inProgress: number;
  pending: number;
  errors: number;
} {
  return panels.reduce(
    (acc, panel) => {
      switch (panel.status) {
        case 'complete':
          acc.completed++;
          break;
        case 'in-progress':
          acc.inProgress++;
          break;
        case 'error':
          acc.errors++;
          break;
        case 'pending':
          acc.pending++;
          break;
      }
      return acc;
    },
    { completed: 0, inProgress: 0, pending: 0, errors: 0 }
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * MasterCoherenceSheetProgress Component
 * 
 * Displays a 3x3 grid visualization showing the progress of each panel
 * in the Master Coherence Sheet generation process.
 * 
 * Requirements: 8.4, 8.5
 */
export const MasterCoherenceSheetProgress: React.FC<MasterCoherenceSheetProgressProps> = ({
  panels,
  overallProgress,
  className = '',
  compact = false,
}) => {
  // Ensure we have exactly 9 panels
  const gridPanels = Array.from({ length: 9 }, (_, i) => {
    return panels[i] || {
      index: i,
      status: 'pending' as PanelStatus,
      progress: 0,
    };
  });

  const stats = getCompletionStats(gridPanels);

  // ============================================================================
  // Compact Mode Render
  // ============================================================================

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Master Coherence Sheet</span>
          <span className="text-muted-foreground">
            {stats.completed} / 9 panels
          </span>
        </div>
        
        {/* Mini grid visualization */}
        <div className="grid grid-cols-3 gap-1">
          {gridPanels.map((panel) => (
            <div
              key={panel.index}
              className={cn(
                'aspect-square rounded border-2 flex items-center justify-center transition-all',
                getPanelColorClass(panel.status)
              )}
              title={`Panel ${getPanelLabel(panel.index)}: ${panel.status}`}
            >
              <div className="scale-75">
                {getPanelIcon(panel.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // Full Mode Render
  // ============================================================================

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Master Coherence Sheet Progress</CardTitle>
        <p className="text-sm text-muted-foreground">
          Generating 3x3 grid for visual DNA lock
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress */}
        {/* Requirements: 8.4 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Completion Statistics */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-700">{stats.completed}</div>
            <div className="text-xs text-green-600">Complete</div>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-700">{stats.inProgress}</div>
            <div className="text-xs text-blue-600">Active</div>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-700">{stats.pending}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-700">{stats.errors}</div>
            <div className="text-xs text-red-600">Errors</div>
          </div>
        </div>

        {/* 3x3 Grid Visualization */}
        {/* Requirements: 8.4, 8.5 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Panel Status</h4>
          
          <div className="grid grid-cols-3 gap-3 p-4 bg-muted rounded-lg">
            {gridPanels.map((panel) => {
              const label = getPanelLabel(panel.index);
              
              return (
                <div
                  key={panel.index}
                  className={cn(
                    'aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all',
                    getPanelColorClass(panel.status),
                    panel.status === 'in-progress' && 'animate-pulse'
                  )}
                  title={`Panel ${label}: ${panel.status}${panel.error ? ` - ${panel.error}` : ''}`}
                >
                  {/* Panel Icon */}
                  <div className="mb-1">
                    {getPanelIcon(panel.status)}
                  </div>
                  
                  {/* Panel Label */}
                  <div className="text-xs font-mono font-semibold text-gray-700">
                    {label}
                  </div>
                  
                  {/* Progress Percentage (for in-progress panels) */}
                  {panel.status === 'in-progress' && panel.progress > 0 && (
                    <div className="text-xs text-blue-600 mt-1">
                      {Math.round(panel.progress)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Individual Panel Details */}
        {/* Requirements: 8.5 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Panel Details</h4>
          
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {gridPanels.map((panel) => {
              const label = getPanelLabel(panel.index);
              
              return (
                <div
                  key={panel.index}
                  className="flex items-center justify-between p-2 rounded border text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="scale-75">
                      {getPanelIcon(panel.status)}
                    </div>
                    <span className="font-mono font-medium">{label}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {panel.status === 'in-progress' && (
                      <span className="text-xs text-blue-600">
                        {Math.round(panel.progress)}%
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">
                      {panel.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Summary */}
        {stats.errors > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-red-900 block mb-1">
                  {stats.errors} Panel{stats.errors !== 1 ? 's' : ''} Failed
                </span>
                <div className="text-xs text-red-700 space-y-1">
                  {gridPanels
                    .filter((p) => p.status === 'error')
                    .map((p) => (
                      <div key={p.index}>
                        Panel {getPanelLabel(p.index)}: {p.error || 'Unknown error'}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MasterCoherenceSheetProgress;
