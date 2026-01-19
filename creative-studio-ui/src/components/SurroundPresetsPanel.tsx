import React, { useState } from 'react';
import { Sparkles, Save, Trash2 } from 'lucide-react';
import type { SurroundConfig } from '../types';

interface SurroundPresetsPanelProps {
  config: SurroundConfig;
  onApplyPreset: (preset: SurroundPreset) => void;
}

/**
 * Surround sound preset definition
 */
export interface SurroundPreset {
  id: string;
  name: string;
  description: string;
  mode: '5.1' | '7.1';
  channels: SurroundConfig['channels'];
  spatialPosition?: { x: number; y: number; z: number };
}

/**
 * Built-in surround sound presets
 */
const BUILTIN_PRESETS: SurroundPreset[] = [
  {
    id: 'dialogue',
    name: 'Dialogue',
    description: 'Center-focused for clear speech',
    mode: '5.1',
    channels: {
      frontLeft: 30,
      frontRight: 30,
      center: 100,
      lfe: 20,
      surroundLeft: 10,
      surroundRight: 10,
    },
    spatialPosition: { x: 0, y: 1, z: 0 },
  },
  {
    id: 'action',
    name: 'Action',
    description: 'Full surround for immersive action',
    mode: '7.1',
    channels: {
      frontLeft: 100,
      frontRight: 100,
      center: 80,
      lfe: 100,
      sideLeft: 90,
      sideRight: 90,
      surroundLeft: 100,
      surroundRight: 100,
    },
    spatialPosition: { x: 0, y: 0, z: 0 },
  },
  {
    id: 'ambient',
    name: 'Ambient',
    description: 'Surround-heavy for atmosphere',
    mode: '5.1',
    channels: {
      frontLeft: 40,
      frontRight: 40,
      center: 20,
      lfe: 30,
      surroundLeft: 100,
      surroundRight: 100,
    },
    spatialPosition: { x: 0, y: -0.5, z: 0 },
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Balanced stereo with subtle surround',
    mode: '5.1',
    channels: {
      frontLeft: 100,
      frontRight: 100,
      center: 50,
      lfe: 60,
      surroundLeft: 40,
      surroundRight: 40,
    },
    spatialPosition: { x: 0, y: 0.8, z: 0 },
  },
  {
    id: 'voiceover',
    name: 'Voiceover',
    description: 'Center-only for narration',
    mode: '5.1',
    channels: {
      frontLeft: 0,
      frontRight: 0,
      center: 100,
      lfe: 0,
      surroundLeft: 0,
      surroundRight: 0,
    },
    spatialPosition: { x: 0, y: 1, z: 0 },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Wide soundstage for film',
    mode: '7.1',
    channels: {
      frontLeft: 90,
      frontRight: 90,
      center: 70,
      lfe: 80,
      sideLeft: 60,
      sideRight: 60,
      surroundLeft: 70,
      surroundRight: 70,
    },
    spatialPosition: { x: 0, y: 0.5, z: 0 },
  },
];

/**
 * SurroundPresetsPanel - Manage and apply surround sound presets
 * 
 * Features:
 * - Built-in presets (Dialogue, Action, Ambient, Music, Voiceover)
 * - Save custom presets
 * - Load custom presets
 * - Delete custom presets
 * 
 * Requirements: 20.11
 */
export const SurroundPresetsPanel: React.FC<SurroundPresetsPanelProps> = ({
  config,
  onApplyPreset,
}) => {
  const [customPresets, setCustomPresets] = useState<SurroundPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleApplyPreset = (preset: SurroundPreset) => {
    onApplyPreset(preset);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    const newPreset: SurroundPreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      description: presetDescription || 'Custom preset',
      mode: config.mode === 'stereo' ? '5.1' : config.mode,
      channels: { ...config.channels },
      spatialPosition: config.spatialPosition,
    };

    setCustomPresets([...customPresets, newPreset]);
    setPresetName('');
    setPresetDescription('');
    setShowSaveDialog(false);
  };

  const handleDeletePreset = (presetId: string) => {
    setCustomPresets(customPresets.filter((p) => p.id !== presetId));
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Surround Presets</h3>
        </div>
        <button
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Current
        </button>
      </div>

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <h4 className="font-medium text-gray-900">Save Custom Preset</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSavePreset}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Built-in Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Built-in Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {BUILTIN_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              onApply={handleApplyPreset}
              isActive={false}
            />
          ))}
        </div>
      </div>

      {/* Custom Presets */}
      {customPresets.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Custom Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {customPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onApply={handleApplyPreset}
                onDelete={handleDeletePreset}
                isActive={false}
                isCustom
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Preset card component
 */
interface PresetCardProps {
  preset: SurroundPreset;
  onApply: (preset: SurroundPreset) => void;
  onDelete?: (presetId: string) => void;
  isActive: boolean;
  isCustom?: boolean;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  onApply,
  onDelete,
  isActive,
  isCustom,
}) => {
  return (
    <div
      className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isActive
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-400'
      }`}
      onClick={() => onApply(preset)}
    >
      {isCustom && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(preset.id);
          }}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 rounded"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 text-sm">{preset.name}</h4>
          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
            {preset.mode}
          </span>
        </div>
        <p className="text-xs text-gray-600">{preset.description}</p>

        {/* Channel levels preview */}
        <div className="mt-2 flex gap-1">
          {Object.entries(preset.channels).map(([channel, level]) => {
            if (typeof level !== 'number') return null;
            return (
              <div
                key={channel}
                className="flex-1 h-1 bg-gray-200 rounded overflow-hidden"
                title={`${channel}: ${level}%`}
              >
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${level}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Get preset by ID
 */
export function getPresetById(presetId: string): SurroundPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === presetId);
}

/**
 * Get all built-in presets
 */
export function getBuiltinPresets(): SurroundPreset[] {
  return BUILTIN_PRESETS;
}
