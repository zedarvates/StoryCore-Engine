/**
 * PromptManagementPanel Component
 * 
 * Manages shot-level prompt editing with completion indicators,
 * shot selection, and validation error display.
 * 
 * Requirements: 1.1, 1.4, 1.5, 2.4
 */
import { LegacyAny } from '@/types/legacy';


import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, Circle, Layers, Box, Zap } from 'lucide-react';
import { CINEMATIC_SHOT_PRESETS } from '../constants/presets/shotPresets';
import { ShotPromptEditor } from './ShotPromptEditor';
import { VirtualShotList } from './VirtualShotList';
import { GDPvalSourcePanel } from './ai/GDPvalSourcePanel';
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
  const debouncedUpdateShot = useDebounce(((shotId: string, updates: Partial<Shot>) => {
    updateShot(shotId, updates);
  }) as LegacyAny, 300);

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

  const handleTemplateSelect = useCallback((template: string) => {
    if (selectedShot) {
       handlePromptChange(template);
    }
  }, [selectedShot, handlePromptChange]);

  const cinematicStats = useMemo(() => {
    let kraCount = 0;
    let rigCount = 0;
    let sfxCount = 0;
    
    shots.forEach(shot => {
      const preset = CINEMATIC_SHOT_PRESETS.find(p => p.id === shot.presetId);
      if (preset?.templatePath) kraCount++;
      if (preset?.rigPath) rigCount++;
      if (preset?.category === 'sfx') sfxCount++;
    });
    
    return { kraCount, rigCount, sfxCount };
  }, [shots]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cinematic Production Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-blue-50/30 border-blue-100 shadow-sm transition-all hover:bg-blue-50/50 group">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Artistic Precepts (2D)</span>
              <span className="text-xl font-black text-blue-700">{cinematicStats.kraCount} <span className="text-xs font-medium text-blue-400">Linked .kra</span></span>
            </div>
            <Layers className="h-8 w-8 text-blue-400 opacity-20 group-hover:opacity-40 transition-all group-hover:scale-110" />
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/30 border-emerald-100 shadow-sm transition-all hover:bg-emerald-50/50 group">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Puppet Staging (3D)</span>
              <span className="text-xl font-black text-emerald-700">{cinematicStats.rigCount} <span className="text-xs font-medium text-emerald-400">Rigs Active</span></span>
            </div>
            <Box className="h-8 w-8 text-emerald-400 opacity-20 group-hover:opacity-40 transition-all group-hover:rotate-12 group-hover:scale-110" />
          </CardContent>
        </Card>

        <Card className="bg-amber-50/30 border-amber-100 shadow-sm transition-all hover:bg-amber-50/50 group">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">SFX Explosions & FX</span>
              <span className="text-xl font-black text-amber-700">{cinematicStats.sfxCount} <span className="text-xs font-medium text-amber-400">Dynamic Shots</span></span>
            </div>
            <Zap className="h-8 w-8 text-amber-400 opacity-20 group-hover:opacity-40 transition-all group-hover:animate-pulse group-hover:scale-110" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" role="region" aria-label="Prompt management">
      {/* Shot List Panel */}
      <Card className="lg:col-span-1 border-r-0 rounded-r-none">
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

              <ShotPromptEditor
                shot={selectedShot}
                prompt={selectedShot.prompt || ''}
                onPromptChange={handlePromptChange}
                validationError={selectedShot.promptValidation}
              />

              {/* Shot Metadata */}
              {(!!selectedShot.metadata?.['cameraAngle'] ||
                !!selectedShot.metadata?.['lighting'] ||
                !!selectedShot.metadata?.['mood']) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Shot Metadata</p>
                  <div className="grid grid-cols-3 gap-2">
                    {!!selectedShot.metadata?.['cameraAngle'] && (
                      <Badge variant="outline">
                        Camera: {String(selectedShot.metadata['cameraAngle'])}
                      </Badge>
                    )}
                    {!!selectedShot.metadata?.['lighting'] && (
                      <Badge variant="outline">
                        Lighting: {String(selectedShot.metadata['lighting'])}
                      </Badge>
                    )}
                    {!!selectedShot.metadata?.['mood'] && (
                      <Badge variant="outline">
                        Mood: {String(selectedShot.metadata['mood'])}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Errors Display */}
              {!!selectedShot.promptValidation &&
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

      {/* GDPval Source Panel */}
      <div className="lg:col-span-1 h-[700px]">
        <GDPvalSourcePanel onSelectTemplate={handleTemplateSelect} />
      </div>

      </div>
    </div>
  );
};

export default PromptManagementPanel;
