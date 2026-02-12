/**
 * LocationEditor Component
 * 
 * Tabbed interface for editing location properties including info, cube textures,
 * skybox configuration, and scene placement.
 * Supports keyboard shortcuts: Ctrl+Enter to save, Ctrl+S to save, Arrow keys to navigate faces.
 * 
 * File: creative-studio-ui/src/components/location/LocationEditor.tsx
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Save, X, Info, Box, Image as ImageIcon, Map, Layers, Eye, Keyboard, Images } from 'lucide-react';
import type { Location, LocationType, CubeFace } from '@/types/location';
import { useLocationStore } from '@/stores/locationStore';
import { CubeProgressBar } from './editor/CubeProgressBar';
import { LocationImagesSection } from './editor/LocationImagesSection';
import './LocationEditor.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the LocationEditor component
 */
export interface LocationEditorProps {
  /** Location to edit (undefined for new location) */
  location?: Location;
  
  /** Handler for save */
  onSave: (data: Partial<Location>) => void;
  
  /** Handler for cancel */
  onCancel: () => void;
  
  /** Editor mode */
  mode?: 'full';
  
  /** Handler for preview toggle */
  onPreviewToggle?: (enabled: boolean) => void;
  
  /** Handler for face generation request */
  onGenerateFace?: (face: CubeFace) => void;
  
  /** Handler for generate all faces */
  onGenerateAllFaces?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function LocationEditor({
  location,
  onSave,
  onCancel,
  mode,
  onPreviewToggle,
  onGenerateFace,
  onGenerateAllFaces,
}: LocationEditorProps) {
  const { textureDirection, setTextureDirection } = useLocationStore();
  
  // Form state
  const [name, setName] = useState(location?.name || '');
  const [locationType, setLocationType] = useState<LocationType>(location?.location_type || 'exterior');
  const [description, setDescription] = useState(location?.metadata?.description || '');
  const [atmosphere, setAtmosphere] = useState(location?.metadata?.atmosphere || '');
  const [genreTags, setGenreTags] = useState<string>(location?.metadata?.genre_tags?.join(', ') || '');
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'info' | 'cube' | 'skybox' | 'assets' | 'scene' | 'images'>('info');
  
  // Preview mode
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Dirty state
  const [isDirty, setIsDirty] = useState(false);
  
  // Cube face navigation
  const cubeFaces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  const [activeCubeFace, setActiveCubeFace] = useState<CubeFace>('front');
  
  const handleInputChange = useCallback(() => {
    setIsDirty(true);
  }, []);
  
  const handleSave = useCallback(() => {
    const updates: Partial<Location> = {
      name,
      location_type: locationType,
      metadata: {
        ...location?.metadata,
        description,
        atmosphere,
        genre_tags: genreTags.split(',').map((tag) => tag.trim()).filter(Boolean),
      },
    };
    onSave(updates);
    setIsDirty(false);
  }, [name, locationType, description, atmosphere, genreTags, location?.metadata, onSave]);
  
  const handlePreviewToggle = useCallback(() => {
    setIsPreviewMode(!isPreviewMode);
    onPreviewToggle?.(!isPreviewMode);
  }, [isPreviewMode, onPreviewToggle]);
  
  const handleGenerateFace = useCallback((face: CubeFace) => {
    setActiveCubeFace(face);
    onGenerateFace?.(face);
  }, [onGenerateFace]);
  
  const handleGenerateAllFaces = useCallback(() => {
    onGenerateAllFaces?.();
  }, [onGenerateAllFaces]);
  
  const handleUpdateLocation = useCallback((updates: Partial<Location>) => {
    onSave(updates);
    setIsDirty(true);
  }, [onSave]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) {
        e.preventDefault();
        handleSave();
      }
      
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      
      // Arrow keys to navigate cube faces (when in cube tab)
      if (activeTab === 'cube') {
        const currentIndex = cubeFaces.indexOf(activeCubeFace);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % cubeFaces.length;
          setActiveCubeFace(cubeFaces[nextIndex]);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + cubeFaces.length) % cubeFaces.length;
          setActiveCubeFace(cubeFaces[prevIndex]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeCubeFace, handleSave, onCancel]);
  
  const tabs = [
    { id: 'info', label: 'Info', icon: Info },
    { id: 'cube', label: 'Cube', icon: Box },
    { id: 'skybox', label: 'Skybox', icon: ImageIcon },
    { id: 'assets', label: 'Assets', icon: Layers },
    { id: 'scene', label: 'Scene', icon: Map },
    { id: 'images', label: 'Images', icon: Images },
  ];
  
  return (
    <div className={`location-editor ${mode === 'full' ? 'location-editor--full' : ''}`}>
      {/* Tab Navigation */}
      <div className="location-editor__tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`location-editor__tab ${activeTab === tab.id ? 'location-editor__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Tab Content */}
      <div className="location-editor__content">
        {activeTab === 'info' && (
          <div className="location-editor__panel">
            <h3 className="location-editor__panel-title">Basic Information</h3>
            
            <div className="location-editor__form-group">
              <label className="location-editor__label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  handleInputChange();
                }}
                placeholder="Enter location name"
                className="location-editor__input"
              />
            </div>
            
            <div className="location-editor__form-group">
              <label className="location-editor__label">Type</label>
              <div className="location-editor__type-selector">
                <button
                  className={`location-editor__type-btn ${locationType === 'exterior' ? 'location-editor__type-btn--active' : ''}`}
                  onClick={() => {
                    setLocationType('exterior');
                    handleInputChange();
                  }}
                >
                  Exterior
                </button>
                <button
                  className={`location-editor__type-btn ${locationType === 'interior' ? 'location-editor__type-btn--active' : ''}`}
                  onClick={() => {
                    setLocationType('interior');
                    handleInputChange();
                  }}
                >
                  Interior
                </button>
              </div>
            </div>
            
            <div className="location-editor__form-group">
              <label className="location-editor__label">Description</label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  handleInputChange();
                }}
                placeholder="Describe the location..."
                className="location-editor__textarea"
                rows={4}
              />
            </div>
            
            <div className="location-editor__form-group">
              <label className="location-editor__label">Atmosphere</label>
              <input
                type="text"
                value={atmosphere}
                onChange={(e) => {
                  setAtmosphere(e.target.value);
                  handleInputChange();
                }}
                placeholder="e.g., Dark, Mysterious, Bright"
                className="location-editor__input"
              />
            </div>
            
            <div className="location-editor__form-group">
              <label className="location-editor__label">Genre Tags</label>
              <input
                type="text"
                value={genreTags}
                onChange={(e) => {
                  setGenreTags(e.target.value);
                  handleInputChange();
                }}
                placeholder="fantasy, medieval, forest (comma-separated)"
                className="location-editor__input"
              />
            </div>
          </div>
        )}
        
        {activeTab === 'cube' && location && (
          <div className="location-editor__cube-panel">
            {/* Cube Progress Bar */}
            <CubeProgressBar
              cubeTextures={location.cube_textures}
              activeFace={activeCubeFace}
              onFaceClick={handleGenerateFace}
              onGenerateAll={handleGenerateAllFaces}
            />
            
            {/* Cube Face Navigation */}
            <div className="location-editor__cube-faces">
              <span className="location-editor__cube-faces-label">Active Face:</span>
              <div className="location-editor__cube-face-nav">
                {cubeFaces.map((face) => (
                  <button
                    key={face}
                    className={`location-editor__cube-face-btn ${activeCubeFace === face ? 'location-editor__cube-face-btn--active' : ''}`}
                    onClick={() => setActiveCubeFace(face)}
                  >
                    {face.charAt(0).toUpperCase() + face.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <p className="location-editor__hint">
              Use arrow keys to navigate between faces when this panel is focused.
            </p>
          </div>
        )}
        
        {activeTab === 'skybox' && location && (
          <div className="location-editor__skybox-panel">
            <p className="location-editor__hint">Skybox Panel Placeholder - SkyboxPanel.tsx coming in Phase 4</p>
          </div>
        )}
        
        {activeTab === 'assets' && location && (
          <div className="location-editor__assets-panel">
            <p className="location-editor__hint">Assets Panel Placeholder - LocationAssetsPanel.tsx coming in Phase 4</p>
          </div>
        )}
        
        {activeTab === 'scene' && location && (
          <div className="location-editor__scene-panel">
            <h3 className="location-editor__panel-title">Scene Placement</h3>
            <p className="location-editor__hint">
              Place this location in the 3D scene using the Scene Editor.
            </p>
            {location.scene_transform ? (
              <div className="location-editor__transform">
                <h4>Current Transform</h4>
                <pre>{JSON.stringify(location.scene_transform, null, 2)}</pre>
              </div>
            ) : (
              <p className="location-editor__hint">Not placed in scene yet.</p>
            )}
          </div>
        )}
        
        {activeTab === 'images' && location && (
          <LocationImagesSection
            location={location}
            onImageGenerated={(tileUrl) => {
              handleUpdateLocation({
                metadata: {
                  ...location.metadata,
                  tile_image_path: tileUrl
                }
              });
            }}
          />
        )}
      </div>
      
      {/* Actions */}
      <div className="location-editor__actions">
        {/* Preview Mode Toggle */}
        <button 
          className={`location-editor__btn location-editor__btn--preview ${isPreviewMode ? 'location-editor__btn--preview--active' : ''}`}
          onClick={handlePreviewToggle}
          title="Toggle preview mode (Ctrl+P)"
        >
          <Eye size={16} />
          {isPreviewMode ? 'Exit Preview' : 'Preview'}
        </button>
        
        {/* Cancel Button */}
        <button className="location-editor__btn location-editor__btn--cancel" onClick={onCancel}>
          <X size={16} />
          Cancel
        </button>
        
        {/* Save Button */}
        <button 
          className="location-editor__btn location-editor__btn--save" 
          onClick={handleSave}
          disabled={!isDirty && !!location}
        >
          <Save size={16} />
          Save
        </button>
      </div>
      
      {/* Keyboard Shortcuts Hint */}
      <div className="location-editor__shortcuts">
        <Keyboard size={14} />
        <span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> Save</span>
        <span><kbd>Esc</kbd> Cancel</span>
        <span><kbd>↑</kbd><kbd>↓</kbd> Navigate faces</span>
      </div>
    </div>
  );
}

export default LocationEditor;
