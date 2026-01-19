import React, { useState } from 'react';
import { useStore } from '../store';
import type { AudioEffect, AudioEffectParameters } from '../types';
import { Plus, Trash2, Settings, ChevronDown, ChevronUp, Sparkles, TrendingUp } from 'lucide-react';
import { AudioPresetsPanel } from './AudioPresetsPanel';
import { AudioAutomationPanel } from './AudioAutomationPanel';

interface AudioEffectsPanelProps {
  shotId: string;
  trackId: string;
}

export const AudioEffectsPanel: React.FC<AudioEffectsPanelProps> = ({ shotId, trackId }) => {
  const shot = useStore((state) => state.shots.find((s) => s.id === shotId));
  const updateAudioTrack = useStore((state) => state.updateAudioTrack);
  const [showAddEffect, setShowAddEffect] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [expandedEffects, setExpandedEffects] = useState<Set<string>>(new Set());

  const track = shot?.audioTracks.find((t) => t.id === trackId);

  if (!track) {
    return (
      <div className="p-4 text-gray-500">
        No track selected. Select a track to manage audio effects.
      </div>
    );
  }

  const handleAddEffect = (type: AudioEffect['type']) => {
    const newEffect: AudioEffect = {
      id: `effect-${Date.now()}`,
      type,
      enabled: true,
      parameters: getDefaultParameters(type),
    };

    const updatedEffects = [...track.effects, newEffect];
    updateAudioTrack(shotId, trackId, { effects: updatedEffects });
    setShowAddEffect(false);
  };

  const handleDeleteEffect = (effectId: string) => {
    if (confirm('Are you sure you want to delete this effect?')) {
      const updatedEffects = track.effects.filter((e) => e.id !== effectId);
      updateAudioTrack(shotId, trackId, { effects: updatedEffects });
    }
  };

  const handleToggleEffect = (effectId: string) => {
    const updatedEffects = track.effects.map((e) =>
      e.id === effectId ? { ...e, enabled: !e.enabled } : e
    );
    updateAudioTrack(shotId, trackId, { effects: updatedEffects });
  };

  const handleUpdateEffect = (effectId: string, updates: Partial<AudioEffect>) => {
    const updatedEffects = track.effects.map((e) =>
      e.id === effectId ? { ...e, ...updates } : e
    );
    updateAudioTrack(shotId, trackId, { effects: updatedEffects });
  };

  const toggleExpanded = (effectId: string) => {
    const newExpanded = new Set(expandedEffects);
    if (newExpanded.has(effectId)) {
      newExpanded.delete(effectId);
    } else {
      newExpanded.add(effectId);
    }
    setExpandedEffects(newExpanded);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Audio Effects</h3>
          <p className="text-sm text-gray-600">
            Apply and configure audio effects for this track
          </p>
        </div>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Presets
        </button>
      </div>

      {/* Presets Panel */}
      {showPresets && (
        <div className="border rounded-lg bg-purple-50">
          <AudioPresetsPanel shotId={shotId} trackId={trackId} />
        </div>
      )}

      {/* Effects List */}
      <div className="space-y-2">
        {track.effects.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded">
            <Settings className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 mb-4">No effects applied</p>
            <button
              onClick={() => setShowAddEffect(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Effect
            </button>
          </div>
        ) : (
          <>
            {track.effects.map((effect) => (
              <AudioEffectCard
                key={effect.id}
                effect={effect}
                isExpanded={expandedEffects.has(effect.id)}
                shotId={shotId}
                trackId={trackId}
                onToggle={() => handleToggleEffect(effect.id)}
                onDelete={() => handleDeleteEffect(effect.id)}
                onUpdate={(updates) => handleUpdateEffect(effect.id, updates)}
                onToggleExpanded={() => toggleExpanded(effect.id)}
              />
            ))}

            <button
              onClick={() => setShowAddEffect(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-500 hover:text-blue-600"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Effect
            </button>
          </>
        )}
      </div>

      {/* Add Effect Modal */}
      {showAddEffect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Audio Effect</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select an effect to add to this track:
            </p>

            <div className="space-y-2">
              {EFFECT_TYPES.map((effectType) => (
                <button
                  key={effectType.type}
                  onClick={() => handleAddEffect(effectType.type)}
                  className="w-full text-left px-4 py-3 border rounded hover:bg-gray-50 hover:border-blue-500"
                >
                  <div className="font-medium">{effectType.name}</div>
                  <div className="text-xs text-gray-600">{effectType.description}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddEffect(false)}
              className="w-full mt-4 px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Audio Effect Card Component
interface AudioEffectCardProps {
  effect: AudioEffect;
  isExpanded: boolean;
  shotId: string;
  trackId: string;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<AudioEffect>) => void;
  onToggleExpanded: () => void;
}

const AudioEffectCard: React.FC<AudioEffectCardProps> = ({
  effect,
  isExpanded,
  shotId,
  trackId,
  onToggle,
  onDelete,
  onUpdate,
  onToggleExpanded,
}) => {
  const effectInfo = EFFECT_TYPES.find((e) => e.type === effect.type);
  const [showAutomation, setShowAutomation] = useState(false);

  return (
    <div className="border rounded bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="checkbox"
            checked={effect.enabled}
            onChange={onToggle}
            className="w-4 h-4"
          />
          <div className="flex-1">
            <div className="font-medium">{effectInfo?.name || effect.type}</div>
            <div className="text-xs text-gray-600">{effectInfo?.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleExpanded}
            className="p-1 hover:bg-gray-200 rounded"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title="Delete effect"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Parameters */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          <EffectParameters
            effect={effect}
            onUpdate={(parameters) => onUpdate({ parameters })}
          />

          {/* Automation Button */}
          <button
            onClick={() => setShowAutomation(!showAutomation)}
            className={`w-full px-3 py-2 text-sm rounded border flex items-center justify-center gap-2 ${
              effect.automationCurve
                ? 'bg-purple-100 text-purple-700 border-purple-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {showAutomation ? 'Hide' : 'Show'} Automation
            {effect.automationCurve && ' ✓'}
          </button>

          {/* Automation Panel */}
          {showAutomation && (
            <AudioAutomationPanel
              shotId={shotId}
              trackId={trackId}
              effectId={effect.id}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Effect Parameters Component
interface EffectParametersProps {
  effect: AudioEffect;
  onUpdate: (parameters: AudioEffectParameters) => void;
}

const EffectParameters: React.FC<EffectParametersProps> = ({ effect, onUpdate }) => {
  const updateParameter = (key: keyof AudioEffectParameters, value: any) => {
    onUpdate({ ...effect.parameters, [key]: value });
  };

  switch (effect.type) {
    case 'limiter':
      return (
        <>
          <ParameterSlider
            label="Threshold (dB)"
            value={effect.parameters.threshold ?? -10}
            min={-60}
            max={0}
            step={1}
            onChange={(v) => updateParameter('threshold', v)}
          />
          <ParameterSlider
            label="Ceiling (dB)"
            value={effect.parameters.ceiling ?? -1}
            min={-20}
            max={0}
            step={0.1}
            onChange={(v) => updateParameter('ceiling', v)}
          />
          <ParameterSlider
            label="Release (ms)"
            value={effect.parameters.release ?? 250}
            min={10}
            max={1000}
            step={10}
            onChange={(v) => updateParameter('release', v)}
          />
        </>
      );

    case 'gain':
      return (
        <ParameterSlider
          label="Gain (dB)"
          value={effect.parameters.gain ?? 0}
          min={-60}
          max={60}
          step={0.5}
          onChange={(v) => updateParameter('gain', v)}
        />
      );

    case 'distortion':
      return (
        <>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Type</label>
            <select
              value={effect.parameters.distortionType ?? 'soft'}
              onChange={(e) => updateParameter('distortionType', e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
            >
              <option value="soft">Soft</option>
              <option value="hard">Hard</option>
              <option value="tube">Tube</option>
              <option value="fuzz">Fuzz</option>
            </select>
          </div>
          <ParameterSlider
            label="Amount"
            value={effect.parameters.distortion ?? 50}
            min={0}
            max={100}
            step={1}
            onChange={(v) => updateParameter('distortion', v)}
          />
        </>
      );

    case 'bass-boost':
      return (
        <>
          <ParameterSlider
            label="Frequency (Hz)"
            value={effect.parameters.bassFrequency ?? 100}
            min={20}
            max={500}
            step={10}
            onChange={(v) => updateParameter('bassFrequency', v)}
          />
          <ParameterSlider
            label="Gain (dB)"
            value={effect.parameters.bassGain ?? 6}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => updateParameter('bassGain', v)}
          />
          <ParameterSlider
            label="Q Factor"
            value={effect.parameters.bassQ ?? 1}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => updateParameter('bassQ', v)}
          />
        </>
      );

    case 'treble-boost':
      return (
        <>
          <ParameterSlider
            label="Frequency (Hz)"
            value={effect.parameters.trebleFrequency ?? 8000}
            min={2000}
            max={16000}
            step={100}
            onChange={(v) => updateParameter('trebleFrequency', v)}
          />
          <ParameterSlider
            label="Gain (dB)"
            value={effect.parameters.trebleGain ?? 6}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => updateParameter('trebleGain', v)}
          />
          <ParameterSlider
            label="Q Factor"
            value={effect.parameters.trebleQ ?? 1}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => updateParameter('trebleQ', v)}
          />
        </>
      );

    case 'voice-clarity':
      return (
        <ParameterSlider
          label="Intensity"
          value={effect.parameters.intensity ?? 70}
          min={0}
          max={100}
          step={1}
          onChange={(v) => updateParameter('intensity', v)}
        />
      );

    case 'eq':
      return (
        <>
          <ParameterSlider
            label="Low Gain (dB)"
            value={effect.parameters.lowGain ?? 0}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => updateParameter('lowGain', v)}
          />
          <ParameterSlider
            label="Mid Gain (dB)"
            value={effect.parameters.midGain ?? 0}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => updateParameter('midGain', v)}
          />
          <ParameterSlider
            label="High Gain (dB)"
            value={effect.parameters.highGain ?? 0}
            min={-12}
            max={12}
            step={0.5}
            onChange={(v) => updateParameter('highGain', v)}
          />
        </>
      );

    case 'compressor':
      return (
        <>
          <ParameterSlider
            label="Ratio"
            value={effect.parameters.ratio ?? 4}
            min={1}
            max={20}
            step={0.5}
            onChange={(v) => updateParameter('ratio', v)}
          />
          <ParameterSlider
            label="Attack (ms)"
            value={effect.parameters.attack ?? 10}
            min={0}
            max={100}
            step={1}
            onChange={(v) => updateParameter('attack', v)}
          />
        </>
      );

    case 'noise-reduction':
      return (
        <ParameterSlider
          label="Noise Floor (dB)"
          value={effect.parameters.noiseFloor ?? -40}
          min={-60}
          max={-20}
          step={1}
          onChange={(v) => updateParameter('noiseFloor', v)}
        />
      );

    default:
      return <div className="text-xs text-gray-500">No parameters available</div>;
  }
};

// Parameter Slider Component
interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const ParameterSlider: React.FC<ParameterSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-600">{label}</label>
        <span className="text-xs text-gray-500">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
};

// Effect Types Configuration
const EFFECT_TYPES: Array<{
  type: AudioEffect['type'];
  name: string;
  description: string;
}> = [
  {
    type: 'limiter',
    name: 'Limiter',
    description: 'Prevent audio clipping and maintain consistent volume',
  },
  {
    type: 'gain',
    name: 'Gain',
    description: 'Adjust overall volume level (-60dB to +60dB)',
  },
  {
    type: 'distortion',
    name: 'Distortion',
    description: 'Add harmonic distortion (soft, hard, tube, fuzz)',
  },
  {
    type: 'bass-boost',
    name: 'Bass Boost',
    description: 'Enhance low frequencies',
  },
  {
    type: 'treble-boost',
    name: 'Treble Boost',
    description: 'Enhance high frequencies',
  },
  {
    type: 'voice-clarity',
    name: 'Voice Clarity',
    description: 'Automatic voice enhancement with EQ and compression',
  },
  {
    type: 'eq',
    name: 'Equalizer',
    description: '3-band EQ (low, mid, high)',
  },
  {
    type: 'compressor',
    name: 'Compressor',
    description: 'Dynamic range compression',
  },
  {
    type: 'noise-reduction',
    name: 'Noise Reduction',
    description: 'Reduce background noise',
  },
  {
    type: 'reverb',
    name: 'Reverb',
    description: 'Add spatial ambience',
  },
];

// Helper function to get default parameters for each effect type
function getDefaultParameters(type: AudioEffect['type']): AudioEffectParameters {
  switch (type) {
    case 'limiter':
      return { threshold: -10, ceiling: -1, release: 250 };
    case 'gain':
      return { gain: 0 };
    case 'distortion':
      return { distortion: 50, distortionType: 'soft' };
    case 'bass-boost':
      return { bassFrequency: 100, bassGain: 6, bassQ: 1 };
    case 'treble-boost':
      return { trebleFrequency: 8000, trebleGain: 6, trebleQ: 1 };
    case 'voice-clarity':
      return { intensity: 70 };
    case 'eq':
      return { lowGain: 0, midGain: 0, highGain: 0 };
    case 'compressor':
      return { ratio: 4, attack: 10 };
    case 'noise-reduction':
      return { noiseFloor: -40 };
    default:
      return {};
  }
}
