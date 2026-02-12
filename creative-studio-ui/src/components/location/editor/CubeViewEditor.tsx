/**
 * CubeViewEditor Component
 * 
 * 6-panel grid showing each cube face with generation controls.
 * Allows selecting faces, generating textures via ComfyUI, and previewing results.
 * 
 * File: creative-studio-ui/src/components/location/editor/CubeViewEditor.tsx
 */

import React, { useState, useCallback } from 'react';
import { RefreshCw, Eye, EyeOff, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Grid } from 'lucide-react';
import type { Location, CubeFace, CubeFaceTexture } from '@/types/location';
import { useLocationStore } from '@/stores/locationStore';
import { CubeFaceGenerator } from './CubeFaceGenerator';
import { CUBE_FACES } from '@/types/location';
import './CubeViewEditor.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the CubeViewEditor component
 */
export interface CubeViewEditorProps {
  /** Location being edited */
  location: Location;
  
  /** Current texture direction */
  textureDirection: 'inward' | 'outward';
  
  /** Handler for texture direction change */
  onTextureDirectionChange: (direction: 'inward' | 'outward') => void;
}

// ============================================================================
// Component
// ============================================================================

export function CubeViewEditor({
  location,
  textureDirection,
  onTextureDirectionChange,
}: CubeViewEditorProps) {
  const { updateCubeTexture, updateLocation, selectCubeFace, selectedCubeFace } = useLocationStore();
  
  const [editingFace, setEditingFace] = useState<CubeFace | null>(null);
  
  const faceLabels: Record<CubeFace, string> = {
    front: 'Front (Z+)',
    back: 'Back (Z-)',
    left: 'Left (X-)',
    right: 'Right (X+)',
    top: 'Top (Y+)',
    bottom: 'Bottom (Y-)',
  };
  
  const faceIcons: Record<CubeFace, React.ReactNode> = {
    front: <ArrowRight size={20} />,
    back: <ArrowLeft size={20} />,
    left: <ArrowLeft size={20} />,
    right: <ArrowRight size={20} />,
    top: <ArrowUp size={20} />,
    bottom: <ArrowDown size={20} />,
  };
  
  const handleGenerate = useCallback((face: CubeFace) => {
    setEditingFace(face);
    selectCubeFace(face);
  }, [selectCubeFace]);
  
  const handleTextureUpdate = useCallback((face: CubeFace, texture: CubeFaceTexture) => {
    updateCubeTexture(location.location_id, face, texture);
    setEditingFace(null);
  }, [location.location_id, updateCubeTexture]);
  
  const handleCloseGenerator = useCallback(() => {
    setEditingFace(null);
    selectCubeFace(null);
  }, [selectCubeFace]);
  
  const getFaceProgress = (face: CubeFace): number => {
    const totalFaces = CUBE_FACES.length;
    const generatedFaces = CUBE_FACES.filter((f) => location.cube_textures[f]?.image_path).length;
    return (generatedFaces / totalFaces) * 100;
  };
  
  return (
    <div className="cube-view-editor">
      {/* Header */}
      <div className="cube-view-editor__header">
        <div className="cube-view-editor__title">
          <Grid size={20} />
          <h3>Cube Texture Mapping</h3>
        </div>
        
        <div className="cube-view-editor__direction-toggle">
          <span className="cube-view-editor__direction-label">Texture Direction:</span>
          <button
            className={`cube-view-editor__direction-btn ${textureDirection === 'outward' ? 'cube-view-editor__direction-btn--active' : ''}`}
            onClick={() => onTextureDirectionChange('outward')}
          >
            Outward (Exterior)
          </button>
          <button
            className={`cube-view-editor__direction-btn ${textureDirection === 'inward' ? 'cube-view-editor__direction-btn--active' : ''}`}
            onClick={() => onTextureDirectionChange('inward')}
          >
            Inward (Interior)
          </button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="cube-view-editor__progress">
        <div className="cube-view-editor__progress-bar">
          <div 
            className="cube-view-editor__progress-fill" 
            style={{ width: `${getFaceProgress('front')}%` }}
          />
        </div>
        <span className="cube-view-editor__progress-text">
          {CUBE_FACES.filter((f) => location.cube_textures[f]?.image_path).length} / {CUBE_FACES.length} faces generated
        </span>
      </div>
      
      {/* 6-Panel Grid */}
      <div className="cube-view-editor__grid">
        {CUBE_FACES.map((face) => {
          const texture = location.cube_textures[face];
          const isEditing = editingFace === face;
          
          return (
            <div 
              key={face}
              className={`cube-view-editor__face ${texture?.image_path ? 'cube-view-editor__face--generated' : ''} ${isEditing ? 'cube-view-editor__face--editing' : ''}`}
            >
              <div className="cube-view-editor__face-header">
                <span className="cube-view-editor__face-icon">{faceIcons[face]}</span>
                <span className="cube-view-editor__face-label">{faceLabels[face]}</span>
              </div>
              
              <div className="cube-view-editor__face-preview">
                {texture?.image_path ? (
                  <img src={texture.image_path} alt={`${face} face`} />
                ) : (
                  <div className="cube-view-editor__face-placeholder">
                    <span>No texture</span>
                  </div>
                )}
              </div>
              
              <div className="cube-view-editor__face-actions">
                {texture?.image_path ? (
                  <>
                    <button
                      className="cube-view-editor__face-action cube-view-editor__face-action--view"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="cube-view-editor__face-action cube-view-editor__face-action--regenerate"
                      title="Regenerate"
                      onClick={() => handleGenerate(face)}
                    >
                      <RefreshCw size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    className="cube-view-editor__face-action cube-view-editor__face-action--generate"
                    onClick={() => handleGenerate(face)}
                  >
                    Generate
                  </button>
                )}
              </div>
              
              {texture?.generated_at && (
                <div className="cube-view-editor__face-meta">
                  Generated: {new Date(texture.generated_at).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Face Generator Modal */}
      {editingFace && (
        <div className="cube-view-editor__modal-overlay" onClick={handleCloseGenerator}>
          <div className="cube-view-editor__modal" onClick={(e) => e.stopPropagation()}>
            <CubeFaceGenerator
              face={editingFace}
              existingTexture={location.cube_textures[editingFace]}
              onGenerate={(texture) => handleTextureUpdate(editingFace, texture)}
              onCancel={handleCloseGenerator}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CubeViewEditor;
