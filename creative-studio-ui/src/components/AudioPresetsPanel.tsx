import React from 'react';
import { useStore } from '../store';
import type { AudioEffect } from '../types';
import { Sparkles, Music, Film, Mic2, Headphones } from 'lucide-react';

interface AudioPresetsPanelProps {
  shotId: string;
  trackId: string;
}

export const AudioPresetsPanel: React.FC<AudioPresetsPanelProps> = ({ shotId, trackId }) => {
  const shot = useStore((state) => state.shots.find((s) => s.id === shotId));
  const updateAudioTrack = useStore((state) => state.updateAudioTrack);

  const track = shot?.audioTracks.find((t) => t.id === trackId);

  if (!track) {
    return null;
  }

  const applyPreset = (presetName: string) => {
    const preset = AUDIO_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    // Replace all effects with preset effects
    const newEffects: AudioEffect[] = preset.effects.map((effect, index) => ({
      ...effect,
      id: `effect-${Date.now()}-${index}`,
    }));

    updateAudioTrack(shotId, trackId, { effects: newEffects });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Audio Presets</h3>
        <p className="text-sm text-gray-600">
          Apply professional audio presets with one click
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {AUDIO_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset.name)}
            className="text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="text-blue-600 mt-1">{preset.icon}</div>
              <div className="flex-1">
                <div className="font-medium mb-1">{preset.name}</div>
                <div className="text-sm text-gray-600 mb-2">{preset.description}</div>
                <div className="flex flex-wrap gap-1">
                  {preset.effects.map((effect, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                    >
                      {getEffectName(effect.type)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-4 border-t">
        <button
          onClick={() => updateAudioTrack(shotId, trackId, { effects: [] })}
          className="w-full px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
        >
          Clear All Effects
        </button>
      </div>
    </div>
  );
};

// Audio Presets Configuration
const AUDIO_PRESETS: Array<{
  name: string;
  description: string;
  icon: React.ReactNode;
  effects: Omit<AudioEffect, 'id'>[];
}> = [
  {
    name: 'Podcast',
    description: 'Optimized for voice clarity with noise reduction and compression',
    icon: <Mic2 className="w-5 h-5" />,
    effects: [
      {
        type: 'noise-reduction',
        enabled: true,
        parameters: { noiseFloor: -45 },
      },
      {
        type: 'voice-clarity',
        enabled: true,
        parameters: { intensity: 80 },
      },
      {
        type: 'compressor',
        enabled: true,
        parameters: { ratio: 6, attack: 5 },
      },
      {
        type: 'limiter',
        enabled: true,
        parameters: { threshold: -12, ceiling: -1, release: 200 },
      },
    ],
  },
  {
    name: 'Music Video',
    description: 'Enhanced bass and treble for music with dynamic range',
    icon: <Music className="w-5 h-5" />,
    effects: [
      {
        type: 'bass-boost',
        enabled: true,
        parameters: { bassFrequency: 80, bassGain: 4, bassQ: 1.2 },
      },
      {
        type: 'treble-boost',
        enabled: true,
        parameters: { trebleFrequency: 10000, trebleGain: 3, trebleQ: 0.8 },
      },
      {
        type: 'compressor',
        enabled: true,
        parameters: { ratio: 3, attack: 15 },
      },
      {
        type: 'limiter',
        enabled: true,
        parameters: { threshold: -8, ceiling: -0.5, release: 300 },
      },
    ],
  },
  {
    name: 'Cinematic',
    description: 'Wide dynamic range with subtle enhancement for film audio',
    icon: <Film className="w-5 h-5" />,
    effects: [
      {
        type: 'eq',
        enabled: true,
        parameters: { lowGain: 2, midGain: 0, highGain: 1 },
      },
      {
        type: 'compressor',
        enabled: true,
        parameters: { ratio: 2.5, attack: 20 },
      },
      {
        type: 'limiter',
        enabled: true,
        parameters: { threshold: -6, ceiling: -0.3, release: 400 },
      },
    ],
  },
  {
    name: 'Dialogue',
    description: 'Crystal clear dialogue with aggressive noise reduction',
    icon: <Headphones className="w-5 h-5" />,
    effects: [
      {
        type: 'noise-reduction',
        enabled: true,
        parameters: { noiseFloor: -50 },
      },
      {
        type: 'voice-clarity',
        enabled: true,
        parameters: { intensity: 90 },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: { lowGain: -2, midGain: 3, highGain: 1 },
      },
      {
        type: 'compressor',
        enabled: true,
        parameters: { ratio: 8, attack: 3 },
      },
      {
        type: 'limiter',
        enabled: true,
        parameters: { threshold: -10, ceiling: -0.5, release: 150 },
      },
    ],
  },
  {
    name: 'Warm & Rich',
    description: 'Warm, full-bodied sound with enhanced low-mids',
    icon: <Sparkles className="w-5 h-5" />,
    effects: [
      {
        type: 'bass-boost',
        enabled: true,
        parameters: { bassFrequency: 120, bassGain: 5, bassQ: 1.5 },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: { lowGain: 3, midGain: 2, highGain: -1 },
      },
      {
        type: 'compressor',
        enabled: true,
        parameters: { ratio: 4, attack: 10 },
      },
    ],
  },
  {
    name: 'Bright & Crisp',
    description: 'Enhanced high frequencies for clarity and presence',
    icon: <Sparkles className="w-5 h-5" />,
    effects: [
      {
        type: 'treble-boost',
        enabled: true,
        parameters: { trebleFrequency: 8000, trebleGain: 6, trebleQ: 1 },
      },
      {
        type: 'eq',
        enabled: true,
        parameters: { lowGain: -2, midGain: 1, highGain: 4 },
      },
      {
        type: 'limiter',
        enabled: true,
        parameters: { threshold: -10, ceiling: -1, release: 250 },
      },
    ],
  },
];

// Helper function to get effect display name
function getEffectName(type: AudioEffect['type']): string {
  const names: Record<AudioEffect['type'], string> = {
    'limiter': 'Limiter',
    'gain': 'Gain',
    'distortion': 'Distortion',
    'bass-boost': 'Bass',
    'treble-boost': 'Treble',
    'voice-clarity': 'Voice',
    'eq': 'EQ',
    'compressor': 'Comp',
    'noise-reduction': 'Noise',
    'reverb': 'Reverb',
  };
  return names[type] || type;
}
