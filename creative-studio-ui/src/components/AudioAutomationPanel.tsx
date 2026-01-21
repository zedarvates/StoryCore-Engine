import React, { useState } from 'react';
import { useStore } from '../store';
import type { AudioEffect, AutomationCurve, AudioKeyframe } from '../types';
import { AudioCurveEditor } from './AudioCurveEditor';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';

interface AudioAutomationPanelProps {
  shotId: string;
  trackId: string;
  effectId: string;
}

export const AudioAutomationPanel: React.FC<AudioAutomationPanelProps> = ({
  shotId,
  trackId,
  effectId,
}) => {
  const shot = useStore((state) => state.shots.find((s) => s.id === shotId));
  const updateAudioTrack = useStore((state) => state.updateAudioTrack);
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);

  const track = shot?.audioTracks.find((t) => t.id === trackId);
  const effect = track?.effects.find((e) => e.id === effectId);

  if (!effect || !track) {
    return null;
  }

  // Get automatable parameters for this effect
  const automatableParams = getAutomatableParameters(effect);

  // Get or create automation curve for parameter
  const getAutomationCurve = (parameter: string): AutomationCurve | null => {
    return effect.automationCurve?.parameter === parameter ? effect.automationCurve : null;
  };

  // Create new automation curve
  const createAutomationCurve = (parameter: string) => {
    const paramInfo = automatableParams.find((p) => p.name === parameter);
    if (!paramInfo) return;

    const newCurve: AutomationCurve = {
      id: `curve-${Date.now()}`,
      parameter,
      keyframes: [
        {
          id: `kf-${Date.now()}-1`,
          time: 0,
          value: paramInfo.default,
          easing: 'linear',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: track.duration,
          value: paramInfo.default,
          easing: 'linear',
        },
      ],
      interpolation: 'smooth',
    };

    updateEffect({ automationCurve: newCurve });
    setSelectedParameter(parameter);
  };

  // Update automation curve
  const updateAutomationCurve = (curve: AutomationCurve) => {
    updateEffect({ automationCurve: curve });
  };

  // Delete automation curve
  const deleteAutomationCurve = () => {
    updateEffect({ automationCurve: undefined });
    setSelectedParameter(null);
  };

  // Update effect
  const updateEffect = (updates: Partial<AudioEffect>) => {
    const updatedEffects = track.effects.map((e) =>
      e.id === effectId ? { ...e, ...updates } : e
    );
    updateAudioTrack(shotId, trackId, { effects: updatedEffects });
  };

  // Change interpolation mode
  const setInterpolation = (interpolation: AutomationCurve['interpolation']) => {
    if (effect.automationCurve) {
      updateAutomationCurve({ ...effect.automationCurve, interpolation });
    }
  };

  const currentCurve = selectedParameter ? getAutomationCurve(selectedParameter) : null;
  const currentParamInfo = automatableParams.find((p) => p.name === selectedParameter);

  return (
    <div className="p-4 space-y-4 border-t">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Automation
          </h4>
          <p className="text-xs text-gray-600">Automate effect parameters over time</p>
        </div>
      </div>

      {/* Parameter Selector */}
      <div>
        <label htmlFor="parameter-select" className="text-xs text-gray-600 block mb-1">Parameter</label>
        <select
          id="parameter-select"
          value={selectedParameter || ''}
          onChange={(e) => {
            console.log('Select element accessed with label association');
            setSelectedParameter(e.target.value || null);
          }}
          className="w-full px-2 py-1 text-sm border rounded"
          aria-label="Select parameter for automation"
          title="Select parameter for automation"
        >
          <option value="">Select parameter...</option>
          {automatableParams.map((param) => (
            <option key={param.name} value={param.name}>
              {param.label}
            </option>
          ))}
        </select>
      </div>

      {/* Automation Controls */}
      {selectedParameter && (
        <div className="space-y-3">
          {currentCurve ? (
            <>
              {/* Interpolation Mode */}
              <div>
                <label className="text-xs text-gray-600 block mb-1">Interpolation</label>
                <div className="flex gap-2">
                  {(['linear', 'smooth', 'step', 'bezier'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setInterpolation(mode)}
                      className={`px-3 py-1 text-xs rounded border ${
                        currentCurve.interpolation === mode
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curve Editor */}
              {currentParamInfo && (
                <AudioCurveEditor
                  curve={currentCurve}
                  duration={track.duration}
                  parameterRange={currentParamInfo.range}
                  parameterLabel={currentParamInfo.label}
                  onUpdate={updateAutomationCurve}
                />
              )}

              {/* Delete Button */}
              <button
                onClick={deleteAutomationCurve}
                className="w-full px-3 py-2 text-sm border rounded text-red-600 border-red-300 hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove Automation
              </button>
            </>
          ) : (
            <button
              onClick={() => createAutomationCurve(selectedParameter)}
              className="w-full px-3 py-2 text-sm border-2 border-dashed rounded text-blue-600 border-blue-300 hover:bg-blue-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Automation Curve
            </button>
          )}
        </div>
      )}

      {/* Curve Presets */}
      {selectedParameter && currentCurve && currentParamInfo && (
        <div className="border-t pt-3">
          <label className="text-xs text-gray-600 block mb-2">Quick Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {CURVE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyCurvePreset(preset, currentCurve, currentParamInfo, track.duration, updateAutomationCurve)}
                className="px-3 py-2 text-xs border rounded hover:bg-gray-50"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Get automatable parameters for an effect
function getAutomatableParameters(effect: AudioEffect): Array<{
  name: string;
  label: string;
  range: { min: number; max: number };
  default: number;
}> {
  switch (effect.type) {
    case 'gain':
      return [
        { name: 'gain', label: 'Gain (dB)', range: { min: -60, max: 60 }, default: 0 },
      ];
    case 'distortion':
      return [
        { name: 'distortion', label: 'Amount', range: { min: 0, max: 100 }, default: 50 },
      ];
    case 'bass-boost':
      return [
        { name: 'bassGain', label: 'Bass Gain (dB)', range: { min: -12, max: 12 }, default: 6 },
      ];
    case 'treble-boost':
      return [
        { name: 'trebleGain', label: 'Treble Gain (dB)', range: { min: -12, max: 12 }, default: 6 },
      ];
    case 'voice-clarity':
      return [
        { name: 'intensity', label: 'Intensity', range: { min: 0, max: 100 }, default: 70 },
      ];
    case 'eq':
      return [
        { name: 'lowGain', label: 'Low Gain (dB)', range: { min: -12, max: 12 }, default: 0 },
        { name: 'midGain', label: 'Mid Gain (dB)', range: { min: -12, max: 12 }, default: 0 },
        { name: 'highGain', label: 'High Gain (dB)', range: { min: -12, max: 12 }, default: 0 },
      ];
    default:
      return [];
  }
}

// Curve presets
const CURVE_PRESETS = [
  { name: 'Fade In', type: 'fade-in' },
  { name: 'Fade Out', type: 'fade-out' },
  { name: 'Pulse', type: 'pulse' },
  { name: 'Wave', type: 'wave' },
];

// Apply curve preset
function applyCurvePreset(
  preset: { name: string; type: string },
  currentCurve: AutomationCurve,
  paramInfo: { range: { min: number; max: number }; default: number },
  duration: number,
  onUpdate: (curve: AutomationCurve) => void
) {
  const { min, max } = paramInfo.range;
  const mid = (min + max) / 2;

  let keyframes: AudioKeyframe[] = [];

  switch (preset.type) {
    case 'fade-in':
      keyframes = [
        { id: `kf-${Date.now()}-1`, time: 0, value: min, easing: 'ease-out' },
        { id: `kf-${Date.now()}-2`, time: duration, value: max, easing: 'linear' },
      ];
      break;
    case 'fade-out':
      keyframes = [
        { id: `kf-${Date.now()}-1`, time: 0, value: max, easing: 'ease-in' },
        { id: `kf-${Date.now()}-2`, time: duration, value: min, easing: 'linear' },
      ];
      break;
    case 'pulse':
      keyframes = [
        { id: `kf-${Date.now()}-1`, time: 0, value: mid, easing: 'ease-in-out' },
        { id: `kf-${Date.now()}-2`, time: duration * 0.25, value: max, easing: 'ease-in-out' },
        { id: `kf-${Date.now()}-3`, time: duration * 0.5, value: mid, easing: 'ease-in-out' },
        { id: `kf-${Date.now()}-4`, time: duration * 0.75, value: max, easing: 'ease-in-out' },
        { id: `kf-${Date.now()}-5`, time: duration, value: mid, easing: 'linear' },
      ];
      break;
    case 'wave':
      keyframes = [
        { id: `kf-${Date.now()}-1`, time: 0, value: mid, easing: 'ease-in-out' },
        { id: `kf-${Date.now()}-2`, time: duration * 0.25, value: max, easing: 'ease-in-out' },
        { id: `kf-${Date.now()}-3`, time: duration * 0.5, value: mid, easing: 'ease-in-out' },
        { id: `kf-${Date.now()}-4`, time: duration * 0.75, value: min, easing: 'ease-in-out' },
        { id: `kf-${Date.now()}-5`, time: duration, value: mid, easing: 'linear' },
      ];
      break;
  }

  onUpdate({ ...currentCurve, keyframes });
}
