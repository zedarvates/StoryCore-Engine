/**
 * LocationEditor Component
 * 
 * Tabbed interface for editing location properties including info, cube textures,
 * skybox configuration, and scene placement.
 * 
 * File: creative-studio-ui/src/components/location/LocationEditor.tsx
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Save, X, Info, Box, Image as ImageIcon, Map, Layers, Eye, Images, MessageSquare, RefreshCw } from 'lucide-react';
import type { Location, LocationType, CubeFace } from '@/types/location';
import { useLocationStore } from '@/stores/locationStore';
import { CubeProgressBar } from './editor/CubeProgressBar';
import { LocationImagesSection } from './editor/LocationImagesSection';
import { SkyboxPanel } from './SkyboxPanel';
import { PromptsManager } from '../common/PromptsManager';
import { assetCreatorService } from '@/services/assetCreatorService';
import { notificationService } from '@/services/NotificationService';
import { buildVisualPromptForLocation } from '@/lib/promptUtils';
import './LocationEditor.css';

export interface LocationEditorProps {
  location?: Location;
  onSave: (data: Partial<Location>) => void;
  onCancel: () => void;
  mode?: 'full';
  onPreviewToggle?: (enabled: boolean) => void;
  onGenerateFace?: (face: CubeFace) => void;
  onGenerateAllFaces?: () => void;
}

export function LocationEditor({
  location,
  onSave,
  onCancel,
  mode,
  onPreviewToggle,
  onGenerateFace,
  onGenerateAllFaces,
}: LocationEditorProps) {
  const { setTextureDirection } = useLocationStore();

  const [name, setName] = useState(location?.name || '');
  const [locationType, setLocationType] = useState<LocationType>(location?.location_type || 'exterior');
  const [description, setDescription] = useState(location?.metadata?.description || '');
  const [atmosphere, setAtmosphere] = useState(location?.metadata?.atmosphere || '');
  const [genreTags, setGenreTags] = useState<string>(location?.metadata?.genre_tags?.join(', ') || '');
  const [prompts, setPrompts] = useState<string[]>(location?.prompts || []);
  const [activeTab, setActiveTab] = useState<'info' | 'cube' | 'skybox' | 'assets' | 'scene' | 'images' | 'prompts'>('info');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeCubeFace, setActiveCubeFace] = useState<CubeFace>('front');
  const [isLoading, setIsLoading] = useState(false);

  const cubeFaces: CubeFace[] = useMemo(() => ['front', 'back', 'left', 'right', 'top', 'bottom'], []);

  useEffect(() => {
    if (location && (location.prompts || []).length === 0) {
      const basePrompt = buildVisualPromptForLocation(location);
      if (basePrompt) setPrompts([basePrompt]);
    }
  }, [location]);

  const handleInputChange = useCallback(() => setIsDirty(true), []);

  const handleSave = useCallback(() => {
    onSave({
      name,
      location_type: locationType,
      metadata: {
        ...location?.metadata,
        description,
        atmosphere,
        genre_tags: genreTags.split(',').map(t => t.trim()).filter(Boolean),
      },
      prompts,
    });
    setIsDirty(false);
  }, [name, locationType, description, atmosphere, genreTags, location?.metadata, prompts, onSave]);

  const handleUpdateLocation = useCallback((updates: Partial<Location>) => {
    onSave(updates);
    setIsDirty(true);
  }, [onSave]);

  const currentLocation = useMemo((): Location | undefined => location ? {
    ...location,
    name,
    location_type: locationType,
    metadata: {
      ...location.metadata,
      description,
      atmosphere,
      genre_tags: genreTags.split(',').map(t => t.trim()).filter(Boolean),
    },
    prompts,
  } : undefined, [location, name, locationType, description, atmosphere, genreTags, prompts]);

  const handleGenerateLayout = useCallback(async () => {
    if (!currentLocation) return;
    setIsLoading(true);
    try {
      const type = locationType === 'interior' ? 'room' : 'corridor';
      const result = await assetCreatorService.generateBoxScene(type as any, {
        name,
        dimensions: [10, 4, 10],
      });
      if (result.success && result.script) {
        const blob = new Blob([result.script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name || 'location'}_layout.py`;
        a.click();
        notificationService.success('3D Layout Generated', 'Blender script downloaded.');
      }
    } catch {
      notificationService.error('Generation Failed', 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, name, locationType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      if (activeTab === 'cube') {
        const idx = cubeFaces.indexOf(activeCubeFace);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setActiveCubeFace(cubeFaces[(idx + 1) % cubeFaces.length]); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setActiveCubeFace(cubeFaces[(idx - 1 + cubeFaces.length) % cubeFaces.length]); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeCubeFace, handleSave, onCancel, cubeFaces]);

  const tabs = [
    { id: 'info', label: 'Info', icon: Info },
    { id: 'cube', label: 'Cube', icon: Box },
    { id: 'skybox', label: 'Skybox', icon: ImageIcon },
    { id: 'assets', label: 'Assets', icon: Layers },
    { id: 'scene', label: 'Scene', icon: Map },
    { id: 'images', label: 'Images', icon: Images },
    { id: 'prompts', label: 'Prompts', icon: MessageSquare },
  ];

  return (
    <div className={`location-editor ${mode === 'full' ? 'location-editor--full' : ''}`}>
      <div className="location-editor__tabs">
        {tabs.map((tab) => (
          <button key={tab.id} className={`location-editor__tab ${activeTab === tab.id ? 'location-editor__tab--active' : ''}`} onClick={() => setActiveTab(tab.id as any)}>
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="location-editor__content">
        {activeTab === 'info' && (
          <div className="location-editor__panel">
            <h3 className="location-editor__panel-title">Basic Information</h3>
            <div className="location-editor__form-group">
              <label className="location-editor__label">Name</label>
              <input type="text" value={name} onChange={e => { setName(e.target.value); handleInputChange(); }} className="location-editor__input" />
            </div>
            <div className="location-editor__form-group">
              <label className="location-editor__label">Type</label>
              <div className="location-editor__type-selector">
                <button className={`location-editor__type-btn ${locationType === 'exterior' ? 'location-editor__type-btn--active' : ''}`} onClick={() => { setLocationType('exterior'); setTextureDirection('outward'); handleInputChange(); }}>Exterior</button>
                <button className={`location-editor__type-btn ${locationType === 'interior' ? 'location-editor__type-btn--active' : ''}`} onClick={() => { setLocationType('interior'); setTextureDirection('inward'); handleInputChange(); }}>Interior</button>
              </div>
            </div>
            <div className="location-editor__form-group">
              <label className="location-editor__label">Description</label>
              <textarea value={description} onChange={e => { setDescription(e.target.value); handleInputChange(); }} className="location-editor__textarea" rows={4} />
            </div>
            <div className="location-editor__form-group">
              <label className="location-editor__label">Atmosphere</label>
              <input type="text" value={atmosphere} onChange={e => { setAtmosphere(e.target.value); handleInputChange(); }} placeholder="e.g., Dark, Mysterious, Bright" className="location-editor__input" />
            </div>
            <div className="location-editor__form-group">
              <label className="location-editor__label">Genre Tags</label>
              <input type="text" value={genreTags} onChange={e => { setGenreTags(e.target.value); handleInputChange(); }} placeholder="fantasy, medieval, forest (comma-separated)" className="location-editor__input" />
            </div>
          </div>
        )}

        {activeTab === 'cube' && location && (
          <div className="location-editor__cube-panel">
            <CubeProgressBar cubeTextures={location.cube_textures} activeFace={activeCubeFace} onFaceClick={f => { setActiveCubeFace(f); onGenerateFace?.(f); }} onGenerateAll={() => onGenerateAllFaces?.()} />
            <div className="location-editor__cube-face-nav">
              {cubeFaces.map(f => (
                <button key={f} className={`location-editor__cube-face-btn ${activeCubeFace === f ? 'location-editor__cube-face-btn--active' : ''}`} onClick={() => setActiveCubeFace(f)}>{f}</button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skybox' && currentLocation && (
          <SkyboxPanel location={currentLocation} onUpdate={handleUpdateLocation} />
        )}

        {activeTab === 'scene' && currentLocation && (
          <div className="location-editor__scene-panel">
            <h3>3D Layout Generation</h3>
            <button onClick={handleGenerateLayout} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: '#00d4ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isLoading ? <RefreshCw size={16} className="spin" /> : <Box size={16} />}
              Generate Blender Layout
            </button>
          </div>
        )}

        {activeTab === 'images' && currentLocation && (
          <LocationImagesSection location={currentLocation} onImageGenerated={(url, prompt) => {
            const updates: Partial<Location> = { metadata: { ...currentLocation.metadata, tile_image_path: url } };
            if (prompt) { const newPrompts = [...prompts, prompt]; setPrompts(newPrompts); updates.prompts = newPrompts; }
            handleUpdateLocation(updates);
          }} />
        )}

        {activeTab === 'prompts' && (
          <PromptsManager prompts={prompts} onUpdate={p => { setPrompts(p); handleInputChange(); }} entityName={name} />
        )}
      </div>

      <div className="location-editor__actions">
        <button className="location-editor__btn" onClick={() => { setIsPreviewMode(!isPreviewMode); onPreviewToggle?.(!isPreviewMode); }}><Eye size={16} /> {isPreviewMode ? 'Exit Preview' : 'Preview'}</button>
        <button className="location-editor__btn" onClick={onCancel}><X size={16} /> Cancel</button>
        <button className="location-editor__btn location-editor__btn--save" onClick={handleSave} disabled={!isDirty && !!location}><Save size={16} /> Save</button>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default LocationEditor;
