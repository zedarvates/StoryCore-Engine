/**
 * ShotManagementContext - Shot selection and management operations
 * 
 * Responsibility: Shot CRUD, selection, validation, and prompt status tracking
 * Part of ProjectContext split (see docs/PROJECTCONTEXT_ANALYSIS.md)
 * 
 * State Variables:
 * - selectedShot: Currently selected shot for editing
 * 
 * Callback Functions:
 * - updateShot(shotId, updates): Update shot properties
 * - deleteShot(shotId): Remove shot from project
 * - validateAllShots(): Validate all shots for completeness
 * - getPromptCompletionStatus(): Get prompt status per shot
 * - selectShot(shot): Set currently selected shot
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Shot } from '../types';

// Define PromptStatus type for tracking prompt completion
export type PromptStatus = 
  | 'pending'      // Prompt not yet generated
  | 'in-progress'   // Prompt generation in progress
  | 'complete'      // Prompt generated successfully
  | 'failed';       // Prompt generation failed

interface ShotManagementContextType {
  selectedShot: Shot | null;
  updateShot: (shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (shotId: string) => void;
  validateAllShots: () => { valid: boolean; errors: string[] };
  getPromptCompletionStatus: () => Record<string, PromptStatus>;
  selectShot: (shot: Shot | null) => void;
}

export type { ShotManagementContextType };

const ShotManagementContext = createContext<ShotManagementContextType | undefined>(undefined);

// Validation rules for shots
const SHOT_VALIDATION_RULES = {
  minimumTitleLength: 1,
  minimumDuration: 0.5, // seconds
  maximumShotsPerProject: 1000,
};

export const ShotManagementProvider: React.FC<{ 
  children: React.ReactNode;
  shots?: Shot[];
  onShotsUpdate?: (shots: Shot[]) => void;
}> = ({ 
  children,
  shots: externalShots,
  onShotsUpdate 
}) => {
  // Use external shots if provided, otherwise use local state
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  
  // Internal shots state if no external source
  const [internalShots, setInternalShots] = useState<Shot[]>([]);
  
  // Use external shots or internal state
  const shots = externalShots !== undefined ? externalShots : internalShots;
  
  const updateShot = useCallback((shotId: string, updates: Partial<Shot>) => {
    setInternalShots(prev => {
      const updatedShots = prev.map(shot => 
        shot.id === shotId 
          ? { ...shot, ...updates, updatedAt: new Date().toISOString() }
          : shot
      );
      
      // Update selected shot if it's the one being modified
      setSelectedShot(current => 
        current?.id === shotId 
          ? { ...current, ...updates }
          : current
      );
      
      // Notify external handler
      onShotsUpdate?.(updatedShots);
      
      return updatedShots;
    });
  }, [onShotsUpdate]);

  const deleteShot = useCallback((shotId: string) => {
    setInternalShots(prev => {
      const filteredShots = prev.filter(shot => shot.id !== shotId);
      onShotsUpdate?.(filteredShots);
      return filteredShots;
    });
    
    // Clear selected shot if it was deleted
    setSelectedShot(current => 
      current?.id === shotId ? null : current
    );
  }, [onShotsUpdate]);

  const validateAllShots = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check for empty shots array
    if (shots.length === 0) {
      errors.push('No shots in project. Add at least one shot.');
      return { valid: false, errors };
    }
    
    // Check shot count limit
    if (shots.length > SHOT_VALIDATION_RULES.maximumShotsPerProject) {
      errors.push(`Too many shots (${shots.length}). Maximum is ${SHOT_VALIDATION_RULES.maximumShotsPerProject}.`);
    }
    
    // Validate each shot
    shots.forEach((shot, index) => {
      // Validate title
      if (!shot.title || shot.title.trim().length < SHOT_VALIDATION_RULES.minimumTitleLength) {
        errors.push(`Shot ${index + 1}: Title is required.`);
      }
      
      // Validate duration
      if (shot.duration < SHOT_VALIDATION_RULES.minimumDuration) {
        errors.push(`Shot "${shot.title}": Duration must be at least ${SHOT_VALIDATION_RULES.minimumDuration} seconds.`);
      }
      
      // Validate position uniqueness
      const positionCount = shots.filter(s => s.position === shot.position).length;
      if (positionCount > 1) {
        errors.push(`Shot "${shot.title}": Duplicate position (${shot.position}).`);
      }
    });
    
    // Check for gaps in positions
    const positions = shots.map(s => s.position).sort((a, b) => a - b);
    for (let i = 0; i < positions.length - 1; i++) {
      if (positions[i + 1] - positions[i] > 1) {
        errors.push(`Gap detected between positions ${positions[i]} and ${positions[i + 1]}.`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }, [shots]);

  const getPromptCompletionStatus = useCallback((): Record<string, PromptStatus> => {
    const status: Record<string, PromptStatus> = {};
    
    shots.forEach(shot => {
      // Determine prompt status based on shot properties
      // A shot has a complete prompt if it has required generation data
      const hasGenerationData = !!(
        shot.metadata?.prompt ||
        shot.metadata?.positivePrompt ||
        shot.promoted_panel_path
      );
      
      const isGenerating = shot.metadata?.generationStatus === 'in-progress';
      const hasFailed = shot.metadata?.generationStatus === 'failed';
      
      if (isGenerating) {
        status[shot.id] = 'in-progress';
      } else if (hasFailed) {
        status[shot.id] = 'failed';
      } else if (hasGenerationData) {
        status[shot.id] = 'complete';
      } else {
        status[shot.id] = 'pending';
      }
    });
    
    return status;
  }, [shots]);

  const selectShot = useCallback((shot: Shot | null) => {
    setSelectedShot(shot);
  }, []);

  const value = useMemo(() => ({
    selectedShot,
    updateShot,
    deleteShot,
    validateAllShots,
    getPromptCompletionStatus,
    selectShot
  }), [
    selectedShot,
    updateShot,
    deleteShot,
    validateAllShots,
    getPromptCompletionStatus,
    selectShot
  ]);

  return (
    <ShotManagementContext.Provider value={value}>
      {children}
    </ShotManagementContext.Provider>
  );
};

export const useShotManagement = () => {
  const context = useContext(ShotManagementContext);
  if (!context) {
    throw new Error('useShotManagement must be used within a ShotManagementProvider');
  }
  return context;
};
