/**
 * LocationEditor Component
 * 
 * Tabbed interface for editing location properties including info, cube textures,
 * skybox configuration, and scene placement.
 * 
 * File: creative-studio-ui/src/components/location/LocationEditor.tsx
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Scene3DGenerationPipeline, Scene3DGenerationState } from '@/services/ai/Scene3DGenerationPipeline';
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
  const [pipelineState, setPipelineState] = useState<Scene3DGenerationState | null>(null);
  const [isGenerating3DScene, setIsGenerating3DScene] = useState(false);

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
      const result = await assetCreatorService.generateBoxScene(type as 'room' | 'corridor', {
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

  const handleGenerate3DScene = useCallback(async () => {
    if (!currentLocation) return;
    setIsGenerating3DScene(true);
    setPipelineState({ status: 'idle', progress: 0, message: 'Initialisation...' });

    try {
      const result = await Scene3DGenerationPipeline.buildSceneFromLocation(
        currentLocation,
        { mode: 'isometric', extractBuildingsIndividually: true },
        (state) => setPipelineState(state)
      );
      
      notificationService.success('Scène 3D générée', 'La scène a été composée avec succès dans la vue 3D.');
      console.log('Generated Scene Elements:', result);
      // À l'avenir, on pourrait stocker ces infos dans location.metadata.scene3d_data
      
    } catch (err) {
      console.error('Failed to generate 3D scene:', err);
      notificationService.error('Erreur', 'Impossible de générer la scène 3D.');
      setPipelineState({ status: 'error', progress: 0, message: 'Erreur lors de la génération' });
    } finally {
      setIsGenerating3DScene(false);
    }
  }, [currentLocation]);

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
  ] as const;

  return (
    <div className={`location-editor ${mode === 'full' ? 'location-editor--full' : ''}`}>
      <div className="location-editor__tabs">
        {tabs.map((tab) => (
          <button key={tab.id} className={`location-editor__tab ${activeTab === tab.id ? 'location-editor__tab--active' : ''}`} onClick={() => setActiveTab(tab.id)}>
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
          <div className="location-editor__scene-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3>3D Layout Generation (Old Method)</h3>
              <button onClick={handleGenerateLayout} disabled={isLoading || isGenerating3DScene} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
                {isLoading ? <RefreshCw size={16} className="spin" /> : <Box size={16} />}
                Generate Blender Layout
              </button>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#1e1e24', borderRadius: '8px', border: '1px solid #333' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#4A90E2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} /> Pipeline Avancé : Génération Scène 3D (Iso)
              </h3>
              <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '15px' }}>
                Ce pipeline génère un décor top-down avec splat mapping, détecte les bâtiments et arbres, efface les éléments mobiles, et recompose tout en 3D.
              </p>
              
              <button 
                onClick={handleGenerate3DScene} 
                disabled={isGenerating3DScene} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: isGenerating3DScene ? '#555' : '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: isGenerating3DScene ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isGenerating3DScene ? <RefreshCw size={16} className="spin" /> : <Map size={16} />}
                {isGenerating3DScene ? 'Génération en cours...' : 'Créer la Scène du Lieu'}
              </button>

              {pipelineState && (
                <div style={{ marginTop: '20px', background: '#111', padding: '15px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#ddd' }}>
                    <span>{pipelineState.message}</span>
                    <span>{pipelineState.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pipelineState.progress}%`, height: '100%', background: pipelineState.status === 'error' ? '#e74c3c' : '#2ecc71', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              )}
            </div>
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
