/**
 * Professional Inspector Panel Component - Rightmost Zone (Point 4)
 * 
 * High-end cinematic inspector inspired by DaVinci Resolve.
 * Features specialized tabs for:
 * 1. Style (Visual parameters, intensity)
 * 2. Scene (Asset configurations, environments)
 * 3. Camera (Presets, focal length, movement)
 * 4. Lighting (Rigs, intensity, mood)
 * 5. Animation (Puppet controls, movement)
 * 6. Audio (Volume, pan, EQ)
 */

import React, { useState, useCallback } from 'react';
import { 
  Palette, Camera, Sun, Zap, Music, 
  Settings2, Box, Info,
  Volume2, SlidersHorizontal, BarChart2,
  GitMerge, Sparkles, MessageSquare
} from 'lucide-react';
import { useSelectedShot } from '../../store/hooks/useSelectedShot';
import { useAppDispatch } from '../../store';
import { updateAudioSettings, updateShot } from '../../store/slices/timelineSlice';

// Specialized Controls
import { StyleControls } from './StyleControls';
import { CameraPresetControls } from './CameraPresetControls';
import { LightingRigControls } from './LightingRigControls';
import { NarrativeControls } from './NarrativeControls';
import { ConsistencyAssetBrowser } from './ConsistencyAssetBrowser';
import { KritaPresetControls } from './KritaPresetControls';
import { PuppetAnimationControls } from '../PreviewFrame/PuppetAnimationControls';
import { TransitionsPanel } from '../TransitionsPanel/TransitionsPanel';
import { EffectsPanel } from '../EffectsPanel/EffectsPanel';
import { AISurroundAssistant } from '../../../components/AISurroundAssistant';
import { NarrativeLayerMapper } from '../../../services/NarrativeLayerMapper';

import { CINEMATIC_SHOT_PRESETS } from '../../../constants/presets/shotPresets';
import { ScrollArea } from '../../../components/ui/scroll-area';

import './inspector.css';

type InspectorTab = 'narrative' | 'style' | 'scene' | 'camera' | 'lighting' | 'animation' | 'audio' | 'transitions' | 'effects';

export const ShotConfigPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { selectedShot } = useSelectedShot();
  const [activeTab, setActiveTab] = useState<InspectorTab>('narrative');

  const tabs: { id: InspectorTab; icon: React.ElementType; label: string }[] = [
    { id: 'narrative', icon: MessageSquare, label: 'Narrative' },
    { id: 'style', icon: Palette, label: 'Style' },
    { id: 'scene', icon: Box, label: 'Scene' },
    { id: 'camera', icon: Camera, label: 'Camera' },
    { id: 'lighting', icon: Sun, label: 'Lighting' },
    { id: 'animation', icon: Zap, label: 'Animation' },
    { id: 'audio', icon: Music, label: 'Audio' },
    { id: 'transitions', icon: GitMerge, label: 'Transitions' },
    { id: 'effects', icon: Sparkles, label: 'Effects' }
  ];

  // Audio Handlers (Local for the Audio tab fallback)
  const handleVolumeChange = useCallback((value: number) => {
    if (selectedShot) {
      dispatch(updateAudioSettings({ 
        shotId: selectedShot.id, 
        settings: { volume: value } 
      }));
    }
  }, [selectedShot, dispatch]);

  const handlePanChange = useCallback((value: number) => {
    if (selectedShot) {
      dispatch(updateAudioSettings({ 
        shotId: selectedShot.id, 
        settings: { pan: value } 
      }));
    }
  }, [selectedShot, dispatch]);

  // --- Render Functions ---
  
  const renderEmptyState = () => (
    <div className="inspector-empty-state">
      <div className="empty-state-content">
        <Info className="w-8 h-8 opacity-20 mb-4" />
        <h5>No Clip Selected</h5>
        <p>Select a shot on the timeline to inspect its parameters.</p>
      </div>
    </div>
  );

  const renderContent = () => {
    if (!selectedShot) return renderEmptyState();

    switch (activeTab) {
      case 'narrative':
        return <NarrativeControls shot={selectedShot} />;
      case 'style': {
        const detectedKeywords = NarrativeLayerMapper.getNarrativeKeywords(selectedShot.prompt || '');
        const suggestedPresetId = NarrativeLayerMapper.suggestPresetId(selectedShot.prompt || '');
        const suggestedPreset = CINEMATIC_SHOT_PRESETS.find(p => p.id === suggestedPresetId);

        return (
          <ScrollArea className="h-full">
            <div className="tab-content style-tab p-4 pt-0">
              {/* Narrative Analysis Section */}
              {(detectedKeywords.length > 0 || suggestedPreset) && (
                <div className="narrative-suggestion-box mb-6 bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="suggestion-header flex items-center gap-2 mb-2">
                    <span className="suggestion-icon">🧠</span>
                    <span className="suggestion-title text-[10px] font-bold uppercase tracking-wider opacity-60">Narrative Intelligence</span>
                  </div>
                  
                  {detectedKeywords.length > 0 && (
                    <div className="detected-keywords flex flex-wrap gap-1 mb-3">
                      {detectedKeywords.map(kw => (
                        <span key={kw} className="keyword-badge bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded border border-primary/30">{kw}</span>
                      ))}
                    </div>
                  )}
                  
                  {suggestedPreset && (!selectedShot.presetId || selectedShot.presetId !== suggestedPresetId) && (
                    <div className="preset-recommendation bg-black/20 p-2 rounded border border-white/5">
                      <p className="text-[11px] mb-2 opacity-80">Suggested Preset: <strong className="text-primary">{suggestedPreset.label}</strong></p>
                      <button 
                        className="apply-recommendation-btn w-full bg-primary text-primary-foreground text-[10px] py-1 rounded font-medium hover:brightness-110 transition-all"
                        onClick={() => dispatch(updateShot({ id: selectedShot.id, updates: { presetId: suggestedPresetId ?? undefined } }))}
                      >
                        Apply Recommendation
                      </button>
                    </div>
                  )}
                </div>
              )}

              <StyleControls shot={selectedShot} />
              <KritaPresetControls shot={selectedShot} />
            </div>
          </ScrollArea>
        );
      }
      case 'scene':
        return (
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4 pt-0">
               <ConsistencyAssetBrowser 
                 onSelectAsset={(asset, type) => {
                   console.log(`[Inspector] Asset Selected: ${asset.name} (${type})`);
                 }} 
               />
               <KritaPresetControls shot={selectedShot} />
            </div>
          </ScrollArea>
        );
      case 'camera':
        return <CameraPresetControls shot={selectedShot} />;
      case 'lighting':
        return (
          <LightingRigControls 
            shotId={selectedShot.id} 
            onRigApply={() => {}} 
            onParametersChange={() => {}} 
          />
        );
      case 'animation':
        return (
          <PuppetAnimationControls 
            currentFrame={0} 
            puppetId={selectedShot.id} 
            keyframes={[]} 
            onKeyframeAdd={() => {}} 
            onKeyframeRemove={() => {}} 
          />
        );
      case 'audio':
        return (
          <div className="audio-inspector-v2">
             <header className="section-header">
                <Volume2 className="w-4 h-4 mr-2" />
                <span>Audio Mixer</span>
             </header>
             <div className="mixer-controls-grid">
                <div className="control-row">
                   <label>Volume</label>
                   <input 
                     type="range" min="-60" max="12" step="0.1" 
                     title="Volume Level (dB)"
                     value={selectedShot.audioSettings?.volume || 0}
                     onChange={(e) => handleVolumeChange(Number(e.target.value))}
                   />
                   <span className="value-badge">{selectedShot.audioSettings?.volume || 0} dB</span>
                </div>
                <div className="control-row">
                   <label>Pan</label>
                   <input 
                     type="range" min="-100" max="100" 
                     title="Pan (Left/Right)"
                     value={selectedShot.audioSettings?.pan || 0}
                     onChange={(e) => handlePanChange(Number(e.target.value))}
                   />
                   <span className="value-badge">{(selectedShot.audioSettings?.pan || 0) > 0 ? 'R' : 'L'}{Math.abs(selectedShot.audioSettings?.pan || 0)}</span>
                </div>
             </div>
             
             <div className="eq-preview-block">
                <span className="text-[9px] uppercase font-bold opacity-30 mb-2 block">Spectral Analysis</span>
                <div className="eq-mock-canvas">
                   <BarChart2 className="w-full h-12 opacity-10" />
                </div>
             </div>

             <div className="mt-6 border-t border-white/5 pt-6">
                <AISurroundAssistant 
                  shot={selectedShot}
                  currentConfig={selectedShot.audioSettings?.surroundConfig || { mode: 'stereo', channels: {} }}
                  onApplyPreset={(preset) => {
                    dispatch(updateAudioSettings({
                      shotId: selectedShot.id,
                      settings: {
                        surroundConfig: {
                          mode: preset.mode,
                          channels: preset.channels
                        }
                      }
                    }));
                  }}
                />
             </div>
          </div>
        );
      case 'transitions':
        return <TransitionsPanel clipId={selectedShot.id} />;
      case 'effects':
        return <EffectsPanel />;
      default:
        return <div className="p-4 opacity-50">Coming Soon</div>;
    }
  };

  return (
    <aside className="inspector-panel-v2">
      {/* Top Header Section */}
      <header className="inspector-global-header">
        <div className="active-shot-indicator">
          <div className="shot-dot" />
          <span className="shot-name">{selectedShot ? `Shot: ${selectedShot.id.slice(-6)}` : 'Inspector'}</span>
        </div>
        <div className="header-actions">
           <button className="icon-btn-sm" title="Pin Inspector"><SlidersHorizontal className="w-3.5 h-3.5" /></button>
           <button className="icon-btn-sm" title="More Settings"><Settings2 className="w-3.5 h-3.5" /></button>
        </div>
      </header>

      {/* Tab Navigation Area */}
      <nav className="inspector-pro-tabs">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            className={`inspector-pro-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as InspectorTab)}
            title={tab.label}
          >
            <tab.icon className="w-4 h-4" />
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <div className="inspector-tab-content">
        {renderContent()}
      </div>

      {/* Bottom Lock / State Indicator */}
      <footer className="inspector-footer">
          <div className="lock-indicator"><Info className="w-3 h-3 mr-1" /> Dynamic Link Active</div>
          <div className="engine-status">Render Engine: StoryCore v1.0</div>
      </footer>
    </aside>
  );
};

export default ShotConfigPanel;
