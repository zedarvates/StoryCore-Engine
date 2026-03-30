import React, { useState } from 'react';
import { Sparkles, Save, Trash2 } from 'lucide-react';
import type { SurroundConfig } from '../types';
import './surroundPresetsPanel.css';

interface SurroundPresetsPanelProps {
  config: SurroundConfig;
  onApplyPreset: (preset: SurroundPreset) => void;
}

export interface SurroundPreset {
  id: string;
  name: string;
  description: string;
  mode: 'stereo' | '5.1' | '7.1';
  channels: SurroundConfig['channels'];
  spatialPosition?: { x: number; y: number; z: number };
}

const BUILTIN_PRESETS: SurroundPreset[] = [
  {
    id: 'dialogue',
    name: 'Dialogue',
    description: 'Center-focused for clear speech',
    mode: '5.1',
    channels: { frontLeft: 30, frontRight: 30, center: 100, lfe: 20, surroundLeft: 10, surroundRight: 10 },
    spatialPosition: { x: 0, y: 1, z: 0 },
  },
  {
    id: 'action',
    name: 'Action',
    description: 'Full surround for immersive action',
    mode: '7.1',
    channels: { frontLeft: 100, frontRight: 100, center: 80, lfe: 100, sideLeft: 90, sideRight: 90, surroundLeft: 100, surroundRight: 100 },
    spatialPosition: { x: 0, y: 0, z: 0 },
  },
  {
    id: 'ambient',
    name: 'Ambient',
    description: 'Surround-heavy for atmosphere',
    mode: '5.1',
    channels: { frontLeft: 40, frontRight: 40, center: 20, lfe: 30, surroundLeft: 100, surroundRight: 100 },
    spatialPosition: { x: 0, y: -0.5, z: 0 },
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Balanced stereo with subtle surround',
    mode: '5.1',
    channels: { frontLeft: 100, frontRight: 100, center: 50, lfe: 60, surroundLeft: 40, surroundRight: 40 },
    spatialPosition: { x: 0, y: 0.8, z: 0 },
  },
  {
    id: 'voiceover',
    name: 'Voiceover',
    description: 'Center-only for narration',
    mode: '5.1',
    channels: { frontLeft: 0, frontRight: 0, center: 100, lfe: 0, surroundLeft: 0, surroundRight: 0 },
    spatialPosition: { x: 0, y: 1, z: 0 },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Wide soundstage for film',
    mode: '7.1',
    channels: { frontLeft: 90, frontRight: 90, center: 70, lfe: 80, sideLeft: 60, sideRight: 60, surroundLeft: 70, surroundRight: 70 },
    spatialPosition: { x: 0, y: 0.5, z: 0 },
  },
];

export const SurroundPresetsPanel: React.FC<SurroundPresetsPanelProps> = ({ config, onApplyPreset }) => {
  const [customPresets, setCustomPresets] = useState<SurroundPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSavePreset = () => {
    if (!presetName.trim()) { alert('Please enter a preset name'); return; }
    const newPreset: SurroundPreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      description: presetDescription || 'Custom preset',
      mode: config.mode === 'stereo' ? '5.1' : (config.mode as '5.1' | '7.1'),
      channels: { ...config.channels },
      spatialPosition: config.spatialPosition,
    };
    setCustomPresets([...customPresets, newPreset]);
    setPresetName('');
    setPresetDescription('');
    setShowSaveDialog(false);
  };

  return (
    <div className="surround-presets-panel">
      <div className="presets-header">
        <div className="header-title-group">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3>Presets</h3>
        </div>
        <button className="save-current-btn" onClick={() => setShowSaveDialog(!showSaveDialog)}>
          <Save className="w-4 h-4" /> Save Current
        </button>
      </div>

      {showSaveDialog && (
        <div className="save-preset-dialog">
          <h4>New Preset</h4>
          <div className="dialog-inputs">
            <input className="dialog-input" type="text" placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
            <input className="dialog-input" type="text" placeholder="Description" value={presetDescription} onChange={(e) => setPresetDescription(e.target.value)} />
          </div>
          <div className="dialog-actions">
            <button className="dialog-btn primary" onClick={handleSavePreset}>Save</button>
            <button className="dialog-btn secondary" onClick={() => setShowSaveDialog(false)}>Cancel</button>
          </div>
        </div>
      )}

      <section>
        <span className="section-label">Default Presets</span>
        <div className="presets-grid">
          {BUILTIN_PRESETS.map((p) => (
            <PresetCard key={p.id} preset={p} onApply={onApplyPreset} isActive={false} />
          ))}
        </div>
      </section>

      {customPresets.length > 0 && (
        <section>
          <span className="section-label">User Presets</span>
          <div className="presets-grid">
            {customPresets.map((p) => (
              <PresetCard key={p.id} preset={p} onApply={onApplyPreset} onDelete={(id) => setCustomPresets(customPresets.filter(p => p.id !== id))} isActive={false} isCustom />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

interface PresetCardProps {
  preset: SurroundPreset;
  onApply: (preset: SurroundPreset) => void;
  onDelete?: (presetId: string) => void;
  isActive: boolean;
  isCustom?: boolean;
}

const PresetCard: React.FC<PresetCardProps> = ({ preset, onApply, onDelete, isActive, isCustom }) => {
  return (
    <div className={`preset-card ${isActive ? 'active' : ''}`} onClick={() => onApply(preset)}>
      {isCustom && onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(preset.id); }} 
          className="delete-preset-btn"
          title={`Delete ${preset.name} preset`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      <div className="preset-info">
        <div className="preset-name-row">
          <h4>{preset.name}</h4>
          <span className="preset-mode-badge">{preset.mode}</span>
        </div>
        <p className="preset-desc">{preset.description}</p>

        <div className="channels-preview">
          {Object.entries(preset.channels).map(([ch, level]) => (
            level !== undefined && (
              <div key={ch} className="channel-bar-bg" title={`${ch}: ${level}%`}>
                <div className="channel-bar-fill" style={{ '--level-percent': `${level}%` } as React.CSSProperties} />
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

export function getPresetById(presetId: string): SurroundPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === presetId);
}

export function getBuiltinPresets(): SurroundPreset[] {
  return BUILTIN_PRESETS;
}
