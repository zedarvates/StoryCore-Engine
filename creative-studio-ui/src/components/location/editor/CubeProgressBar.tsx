/**
 * CubeProgressBar Component
 * 
 * Displays cube face completion progress with visual indicators.
 * Shows which faces have textures and which still need generation.
 * 
 * File: creative-studio-ui/src/components/location/editor/CubeProgressBar.tsx
 */

import React, { useMemo } from 'react';
import { Check, Circle, Dices } from 'lucide-react';
import type { CubeFace, CubeTextureMapping } from '@/types/location';
import './CubeProgressBar.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Cube face labels
 */
const CUBE_FACE_LABELS: Record<CubeFace, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

/**
 * Props for the CubeProgressBar component
 */
export interface CubeProgressBarProps {
  /** Cube textures object */
  cubeTextures: Partial<CubeTextureMapping> | null | undefined;
  
  /** Handler for face click */
  onFaceClick?: (face: CubeFace) => void;
  
  /** Handler for generate all click */
  onGenerateAll?: () => void;
  
  /** Currently editing face (for highlighting) */
  activeFace?: CubeFace | null;
}

// ============================================================================
// Component
// ============================================================================

export function CubeProgressBar({
  cubeTextures,
  onFaceClick,
  onGenerateAll,
  activeFace,
}: CubeProgressBarProps) {
  // Calculate completion stats
  const stats = useMemo(() => {
    const faces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    const completed = faces.filter((face) => cubeTextures?.[face]?.image_path);
    const total = faces.length;
    const percentage = Math.round((completed.length / total) * 100);
    
    return {
      completed,
      total,
      percentage,
      isComplete: completed.length === total,
    };
  }, [cubeTextures]);

  const faces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

  return (
    <div className="cube-progress-bar">
      {/* Header */}
      <div className="cube-progress-bar__header">
        <div className="cube-progress-bar__title">
          <Dices size={18} />
          <span>Cube Completion</span>
        </div>
        <div className="cube-progress-bar__stats">
          <span className="cube-progress-bar__count">
            {stats.completed.length}/{stats.total} faces
          </span>
          <span className={`cube-progress-bar__percentage ${stats.isComplete ? 'cube-progress-bar__percentage--complete' : ''}`}>
            {stats.percentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="cube-progress-bar__progress">
        <div
          className="cube-progress-bar__fill"
          style={{ width: `${stats.percentage}%` }}
        />
      </div>

      {/* Face Grid */}
      <div className="cube-progress-bar__faces">
        {faces.map((face) => {
          const texture = cubeTextures?.[face];
          const hasTexture = !!texture?.image_path;
          const isActive = activeFace === face;

          return (
            <button
              key={face}
              className={`cube-progress-bar__face ${hasTexture ? 'cube-progress-bar__face--complete' : ''} ${isActive ? 'cube-progress-bar__face--active' : ''}`}
              onClick={() => onFaceClick?.(face)}
              title={`${CUBE_FACE_LABELS[face]}: ${hasTexture ? 'Generated' : 'Not yet generated'}`}
            >
              <span className="cube-progress-bar__face-icon">
                {hasTexture ? (
                  <Check size={14} />
                ) : (
                  <Circle size={14} />
                )}
              </span>
              <span className="cube-progress-bar__face-label">
                {CUBE_FACE_LABELS[face]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      {!stats.isComplete && (
        <div className="cube-progress-bar__actions">
          <button
            className="cube-progress-bar__generate-all"
            onClick={onGenerateAll}
          >
            <Dices size={14} />
            Generate Missing Faces
          </button>
        </div>
      )}

      {/* Complete indicator */}
      {stats.isComplete && (
        <div className="cube-progress-bar__complete">
          <Check size={16} />
          <span>All faces generated!</span>
        </div>
      )}
    </div>
  );
}

export default CubeProgressBar;
