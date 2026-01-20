/**
 * GenerationStatusIndicator Component
 * 
 * Displays generation status indicator in navigation to show ongoing background generation.
 * Shows progress, current stage, and allows navigation back to the generating project.
 * 
 * Requirements: 10.5
 */

import React, { useEffect, useState } from 'react';
import {
  generationStatePersistence,
  type PersistedGenerationState,
} from '../services/persistence/generationStatePersistence';
import type { GenerationStatus } from '../types/projectDashboard';

// ============================================================================
// Component Props
// ============================================================================

export interface GenerationStatusIndicatorProps {
  /**
   * Callback when user clicks to view the generating project
   */
  onViewProject?: (projectId: string) => void;
  
  /**
   * Custom class name for styling
   */
  className?: string;
  
  /**
   * Whether to show in compact mode (icon only)
   */
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display text for generation stage
 */
function getStageDisplayText(stage: GenerationStatus['stage']): string {
  switch (stage) {
    case 'grid':
      return 'Generating Grid';
    case 'comfyui':
      return 'Generating Images';
    case 'promotion':
      return 'Promoting Shots';
    case 'qa':
      return 'Running QA';
    case 'export':
      return 'Exporting';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    default:
      return 'Idle';
  }
}

/**
 * Get color class for generation stage
 */
function getStageColorClass(stage: GenerationStatus['stage']): string {
  switch (stage) {
    case 'grid':
    case 'comfyui':
    case 'promotion':
    case 'qa':
    case 'export':
      return 'bg-blue-500';
    case 'complete':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * GenerationStatusIndicator - Shows ongoing background generation status
 * Requirements: 10.5
 */
export const GenerationStatusIndicator: React.FC<GenerationStatusIndicatorProps> = ({
  onViewProject,
  className = '',
  compact = false,
}) => {
  const [activeGenerations, setActiveGenerations] = useState<PersistedGenerationState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================================
  // Load Active Generations
  // ============================================================================

  useEffect(() => {
    // Load active generations on mount
    loadActiveGenerations();

    // Poll for updates every 2 seconds
    const pollInterval = setInterval(() => {
      loadActiveGenerations();
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  /**
   * Load active generations from persistence
   */
  const loadActiveGenerations = async () => {
    try {
      const generations = await generationStatePersistence.getAllActiveGenerations();
      setActiveGenerations(generations);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load active generations:', error);
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle click to view project
   */
  const handleViewProject = (projectId: string) => {
    if (onViewProject) {
      onViewProject(projectId);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  // Don't render if no active generations
  if (!isLoading && activeGenerations.length === 0) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`generation-status-indicator ${className}`}>
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          {!compact && <span className="text-sm text-gray-500">Loading...</span>}
        </div>
      </div>
    );
  }

  // Compact mode - show icon with count
  if (compact) {
    return (
      <div className={`generation-status-indicator-compact ${className}`}>
        <button
          onClick={() => activeGenerations.length > 0 && handleViewProject(activeGenerations[0].projectId)}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
          title={`${activeGenerations.length} generation(s) in progress`}
        >
          {/* Animated spinner */}
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          
          {/* Count badge */}
          {activeGenerations.length > 1 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {activeGenerations.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Full mode - show detailed status for each generation
  return (
    <div className={`generation-status-indicator ${className}`}>
      <div className="space-y-2">
        {activeGenerations.map((generation) => (
          <div
            key={generation.projectId}
            className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => handleViewProject(generation.projectId)}
          >
            {/* Status indicator */}
            <div className="flex-shrink-0">
              <div className={`w-3 h-3 rounded-full ${getStageColorClass(generation.status.stage)} animate-pulse`}></div>
            </div>

            {/* Generation info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {generation.projectId}
                </p>
                <span className="text-xs text-gray-500">
                  {generation.status.progress}%
                </span>
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-gray-600">
                  {getStageDisplayText(generation.status.stage)}
                </p>
                
                {generation.status.currentShot && generation.status.totalShots && (
                  <span className="text-xs text-gray-500">
                    ({generation.status.currentShot}/{generation.status.totalShots})
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${getStageColorClass(generation.status.stage)} transition-all duration-300`}
                  style={{ width: `${generation.status.progress}%` }}
                ></div>
              </div>
            </div>

            {/* View arrow */}
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenerationStatusIndicator;
