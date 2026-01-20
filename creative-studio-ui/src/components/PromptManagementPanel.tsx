/**
 * PromptManagementPanel Component
 * 
 * Manages shot-level prompt editing with completion indicators,
 * shot selection, and validation error display.
 * 
 * Requirements: 1.1, 1.4, 1.5, 2.4
 */

import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, Circle } from 'lucide-react';
import { ShotPromptEditor } from './ShotPromptEditor';
import { VirtualShotList } from './VirtualShotList';
import { useProject } from '../contexts/ProjectContext';
import { useDebounce } from '../utils/performanceOptimizations';
import type { Shot } from '../types/projectDashboard';

// ============================================================================
// Component Props
// ============================================================================

export interface PromptManagementPanelProps {
  className?: string;
}

// ============================================================================
// PromptManagementPanel Component
// ============================================================================

export const PromptManagementPanel: React.FC<PromptManagementPanelProps> = ({
  className = '',
}) => {
  // ============================================================================
  // Context
  // ============================================================================

  const {
    project,
    selectedShot,
    selectShot,
    updateShot,
    getPromptCompletionStatus,
  } = useProject();

  // ============================================================================
  // Computed Values (Memoized for performance)
  // ============================================================================

  const shots = useMemo(() => project?.shots || [], [project?.shots]);
  const completionStatus = useMemo(() => getPromptCompletionStatus(), [getPromptCompletionStatus]);

  // ============================================================================
  // Handlers (Memoized and debounced for performance)
  // ============================================================================

  const handleShotSelect = useCallback((shot: Shot) => {
    selectShot(shot);
  }, [selectShot]);

  // Debounce prompt changes to reduce validation calls (Requirements: 10.2)
  const debouncedUpdateShot = useDebounce((shotId: string, updates: Partial<Shot>) => {
    updateShot(shotId, updates);
  }, 300);

  const handlePromptChange = useCallback((prompt: string) => {
    if (selectedShot) {
      debouncedUpdateShot(selectedShot.id, { prompt });
    }
  }, [selectedShot, debouncedUpdateShot]);

  // ============================================================================
  // Helper Functions (Memoized for performance)
  // ============================================================================

  /**
   * Get prompt completion indicator for a shot
   * Memoized to avoid recalculation on every render
   */
  const getPromptIndicator = useCallback((shot: Shot) => {
    const validation = shot.promptValidation;
    
    if (!validation) {
      // No validation yet - check if prompt is empty
      if (!shot.prompt || shot.prompt.trim().length === 0) {
        return {
          icon: Circle,
          color: 'text-gray-400',
          label: 'Empty',
          variant: 'secondary' as const,
        };
      }
      return {
        icon: Circle,
        color: 'text-gray-400',
        label: 'Pending',
        variant: 'secondary' as const,
      };
    }

    if (validation.isValid) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        label: 'Complete',
        variant: 'outline' as const,
      };
    }

    return {
      icon: AlertCircle,
      color: 'text-red-600',
      label: 'Invalid',
      variant: 'destructive' as const,
    };
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`} role="region" aria-label="Prompt management">
      {/* Shot List Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Shots</CardTitle>
          <CardDescription>
            Select a shot to edit its prompt
          </CardDescription>
          
          {/* Completion Status Summary */}
          <div className="flex items-center gap-2 pt-2" role="status" aria-label="Prompt completion status">
            <Badge variant="outline" className="flex items-center gap-1" aria-label={`${completionStatus.complete} shots with complete prompts`}>
              <CheckCircle className="h-3 w-3 text-green-600" aria-hidden="true" />
              {completionStatus.complete} Complete
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1" aria-label={`${completionStatus.incomplete} shots with incomplete prompts`}>
              <AlertCircle className="h-3 w-3 text-red-600" aria-hidden="true" />
              {completionStatus.incomplete} Incomplete
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {shots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" role="status">
              <p className="text-sm">No shots in this project</p>
              <p className="text-xs mt-2">Add shots to begin prompt management</p>
            </div>
          ) : (
            <VirtualShotList
              shots={shots}
              selectedShotId={selectedShot?.id || null}
              onShotSelect={handleShotSelect}
              getPromptIndicator={getPromptIndicator}
              containerHeight={600}
              className="pr-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Prompt Editor Panel */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Prompt Editor</CardTitle>
          <CardDescription>
            {selectedShot
              ? `Editing prompt for Shot ${selectedShot.id.slice(0, 8)}`
              : 'Select a shot to edit its prompt'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {selectedShot ? (
            <div className="space-y-6">
              {/* Shot Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Shot ID</p>
                  <p className="text-sm font-medium">{selectedShot.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm font-medium">{selectedShot.duration}s</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Start Time</p>
                  <p className="text-sm font-medium">{selectedShot.startTime}s</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sequence</p>
                  <p className="text-sm font-medium">{selectedShot.sequenceId}</p>
                </div>
              </div>

              {/* Prompt Editor */}
              <ShotPromptEditor
                shot={selectedShot}
                prompt={selectedShot.prompt}
                onPromptChange={handlePromptChange}
                validationError={selectedShot.promptValidation}
              />

              {/* Shot Metadata */}
              {(selectedShot.metadata.cameraAngle ||
                selectedShot.metadata.lighting ||
                selectedShot.metadata.mood) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Shot Metadata</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedShot.metadata.cameraAngle && (
                      <Badge variant="outline">
                        Camera: {selectedShot.metadata.cameraAngle}
                      </Badge>
                    )}
                    {selectedShot.metadata.lighting && (
                      <Badge variant="outline">
                        Lighting: {selectedShot.metadata.lighting}
                      </Badge>
                    )}
                    {selectedShot.metadata.mood && (
                      <Badge variant="outline">
                        Mood: {selectedShot.metadata.mood}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Errors Display */}
              {selectedShot.promptValidation &&
                !selectedShot.promptValidation.isValid && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="polite">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 mb-2">
                          Validation Errors
                        </p>
                        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                          {selectedShot.promptValidation.errors.map((error, index) => (
                            <li key={`error-${index}`}>{error.message}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground" role="status">
              <Circle className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p className="text-sm">No shot selected</p>
              <p className="text-xs mt-2">Select a shot from the list to edit its prompt</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptManagementPanel;
