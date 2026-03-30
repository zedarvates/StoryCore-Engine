import React, { useMemo } from 'react';
import { useAppDispatch } from '../../store';
import { updateShot } from '../../store/slices/timelineSlice';
import { CINEMATIC_SHOT_PRESETS } from '../../../constants/presets/shotPresets';
import { Palette, CheckCircle2, ChevronRight, FileCode } from 'lucide-react';
import { Shot } from '../../types';
import './shotConfig.css';

interface KritaPresetControlsProps {
  shot: Shot;
}

export const KritaPresetControls: React.FC<KritaPresetControlsProps> = ({ shot }) => {
  const dispatch = useAppDispatch();
  
  const currentPreset = useMemo(() => {
    return CINEMATIC_SHOT_PRESETS.find(p => p.id === shot.presetId);
  }, [shot.presetId]);

  const handlePresetSelect = (presetId: string) => {
    dispatch(updateShot({ id: shot.id, updates: { presetId } }));
  };

  const dynamicLayers = [
    { name: 'Ciel / Sky', role: 'Dynamic Tinting (Day/Night)' },
    { name: 'Sol / Ground', role: 'Biome Adaptation' },
    { name: 'Perso1 / Actors', role: 'Subject Placement' },
    { name: 'Vegetation', role: 'Nature / Seasonal' },
    { name: 'Architecture', role: 'Urban / Structures' },
    { name: 'Liquids', size: 10, role: 'Sea / Lake / Rain' },
    { name: 'SFX', role: 'Explosions / Magic' }
  ];

  return (
    <div className="krita-preset-controls">
      <div className="browser-section-header">
        <div className="header-label-group">
          <Palette className="text-[#ec4899]" size={16} />
          <h3 className="header-title">Production Precepts</h3>
        </div>
        {currentPreset?.templatePath && (
          <div className="status-badge-mini">
            <CheckCircle2 size={10} />
            <span>.KRA LINKED</span>
          </div>
        )}
      </div>

      {/* Linked Preset Info */}
      <div className="preset-info-block">
        <div className="preset-info-header">
          <div className="preset-icon-box">
            {currentPreset ? (
              <FileCode className="text-[#ec4899]/50" size={20} />
            ) : (
              <Palette className="text-[#475569]" size={20} />
            )}
          </div>
          <div className="preset-text-box">
            <h4>{currentPreset?.label || 'No Preset Linked'}</h4>
            <p>{currentPreset?.description || 'Select a template to guide the generation engine.'}</p>
          </div>
        </div>
        
        {currentPreset?.templatePath && (
          <div className="preset-metadata">
            <span className="metadata-path font-mono text-[9px] opacity-40">
              {currentPreset.templatePath.split('/').pop()}
            </span>
            <span className="metadata-active-label text-[9px] text-[#ec4899] font-bold uppercase">
              Active Template
            </span>
          </div>
        )}
      </div>

      {/* Layer Mapping Visualization */}
      <div className="mapping-section">
        <label className="section-subtitle">Dynamic Layer Mapping</label>
        <div className="layer-mapping-grid">
          {dynamicLayers.map(layer => (
            <div key={layer.name} className="layer-item">
              <div className="layer-label-box">
                <div className="layer-dot" />
                <span className="layer-name">{layer.name}</span>
              </div>
              <span className="layer-role">{layer.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preset Action Grid */}
      <div className="recommendations-section">
        <label className="section-subtitle">Recommended Presets</label>
        <div className="preset-selection-list">
           {CINEMATIC_SHOT_PRESETS.slice(0, 4).map(preset => (
             <div 
               key={preset.id}
               onClick={() => handlePresetSelect(preset.id)}
               className={`preset-pill-item ${shot.presetId === preset.id ? 'active' : ''}`}
             >
               <div className="flex items-center gap-2">
                 <div className="preset-status-dot" />
                 <span className="preset-label">{preset.label}</span>
               </div>
               <ChevronRight className="text-[#475569]" size={12} />
             </div>
           ))}
        </div>
      </div>

      <div className="browser-footer-hint">
        💡 <strong>Krita Engine:</strong> Use layers matching the names above in your <code>.kra</code> templates for automatic narrative adaptation.
      </div>
    </div>
  );
};
