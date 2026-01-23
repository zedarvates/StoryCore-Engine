import React, { useState } from 'react';
import { Volume2, Radio, Speaker } from 'lucide-react';
import type { SurroundConfig } from '../types';

interface SurroundSoundPanelProps {
  config: SurroundConfig;
  onChange: (config: SurroundConfig) => void;
}

/**
 * SurroundSoundPanel - Configure surround sound settings
 * 
 * Features:
 * - Mode selector (Stereo, 5.1, 7.1)
 * - Visual speaker layout
 * - Channel level sliders
 * 
 * Requirements: 20.9
 */
export const SurroundSoundPanel: React.FC<SurroundSoundPanelProps> = ({ config, onChange }) => {
  const [mode, setMode] = useState<'stereo' | '5.1' | '7.1'>(config.mode);

  const handleModeChange = (newMode: 'stereo' | '5.1' | '7.1') => {
    setMode(newMode);
    
    // Initialize default channel levels based on mode
    const defaultChannels = getDefaultChannels(newMode);
    
    onChange({
      ...config,
      mode: newMode,
      channels: defaultChannels,
    });
  };

  const handleChannelChange = (channel: string, value: number) => {
    onChange({
      ...config,
      channels: {
        ...config.channels,
        [channel]: value,
      },
    });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Speaker className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Surround Sound</h3>
      </div>

      {/* Mode Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange('stereo')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'stereo'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Radio className="w-4 h-4 inline mr-2" />
            Stereo
          </button>
          <button
            onClick={() => handleModeChange('5.1')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === '5.1'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Speaker className="w-4 h-4 inline mr-2" />
            5.1
          </button>
          <button
            onClick={() => handleModeChange('7.1')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === '7.1'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Speaker className="w-4 h-4 inline mr-2" />
            7.1
          </button>
        </div>
      </div>

      {/* Visual Speaker Layout */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Speaker Layout</label>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          {mode === 'stereo' && <StereoLayout config={config} />}
          {mode === '5.1' && <Surround51Layout config={config} />}
          {mode === '7.1' && <Surround71Layout config={config} />}
        </div>
      </div>

      {/* Channel Level Sliders */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Channel Levels</label>
        {mode === 'stereo' && (
          <>
            <ChannelSlider
              label="Left"
              value={config.channels.left ?? 100}
              onChange={(value) => handleChannelChange('left', value)}
            />
            <ChannelSlider
              label="Right"
              value={config.channels.right ?? 100}
              onChange={(value) => handleChannelChange('right', value)}
            />
          </>
        )}
        {mode === '5.1' && (
          <>
            <ChannelSlider
              label="Front Left"
              value={config.channels.frontLeft ?? 100}
              onChange={(value) => handleChannelChange('frontLeft', value)}
            />
            <ChannelSlider
              label="Front Right"
              value={config.channels.frontRight ?? 100}
              onChange={(value) => handleChannelChange('frontRight', value)}
            />
            <ChannelSlider
              label="Center"
              value={config.channels.center ?? 100}
              onChange={(value) => handleChannelChange('center', value)}
            />
            <ChannelSlider
              label="LFE (Subwoofer)"
              value={config.channels.lfe ?? 100}
              onChange={(value) => handleChannelChange('lfe', value)}
            />
            <ChannelSlider
              label="Surround Left"
              value={config.channels.surroundLeft ?? 100}
              onChange={(value) => handleChannelChange('surroundLeft', value)}
            />
            <ChannelSlider
              label="Surround Right"
              value={config.channels.surroundRight ?? 100}
              onChange={(value) => handleChannelChange('surroundRight', value)}
            />
          </>
        )}
        {mode === '7.1' && (
          <>
            <ChannelSlider
              label="Front Left"
              value={config.channels.frontLeft ?? 100}
              onChange={(value) => handleChannelChange('frontLeft', value)}
            />
            <ChannelSlider
              label="Front Right"
              value={config.channels.frontRight ?? 100}
              onChange={(value) => handleChannelChange('frontRight', value)}
            />
            <ChannelSlider
              label="Center"
              value={config.channels.center ?? 100}
              onChange={(value) => handleChannelChange('center', value)}
            />
            <ChannelSlider
              label="LFE (Subwoofer)"
              value={config.channels.lfe ?? 100}
              onChange={(value) => handleChannelChange('lfe', value)}
            />
            <ChannelSlider
              label="Side Left"
              value={config.channels.sideLeft ?? 100}
              onChange={(value) => handleChannelChange('sideLeft', value)}
            />
            <ChannelSlider
              label="Side Right"
              value={config.channels.sideRight ?? 100}
              onChange={(value) => handleChannelChange('sideRight', value)}
            />
            <ChannelSlider
              label="Surround Left"
              value={config.channels.surroundLeft ?? 100}
              onChange={(value) => handleChannelChange('surroundLeft', value)}
            />
            <ChannelSlider
              label="Surround Right"
              value={config.channels.surroundRight ?? 100}
              onChange={(value) => handleChannelChange('surroundRight', value)}
            />
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Channel level slider component
 */
interface ChannelSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const ChannelSlider: React.FC<ChannelSliderProps> = ({ label, value, onChange }) => {
  const inputId = `channel-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={inputId} className="text-sm text-gray-600">{label}</label>
        <span className="text-sm font-medium text-gray-900">{value}%</span>
      </div>
      <input
        id={inputId}
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
};

/**
 * Stereo speaker layout visualization
 */
const StereoLayout: React.FC<{ config: SurroundConfig }> = ({ config }) => {
  const leftLevel = config.channels.left ?? 100;
  const rightLevel = config.channels.right ?? 100;

  return (
    <div className="relative h-48 flex items-center justify-center">
      {/* Listener position */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
          <Volume2 className="w-4 h-4 text-white" />
        </div>
        <div className="text-xs text-center mt-1 text-gray-600">You</div>
      </div>

      {/* Left speaker */}
      <div className="absolute top-8 left-12">
        <Speaker
          className="w-12 h-12"
          style={{ opacity: leftLevel / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">L</div>
      </div>

      {/* Right speaker */}
      <div className="absolute top-8 right-12">
        <Speaker
          className="w-12 h-12"
          style={{ opacity: rightLevel / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">R</div>
      </div>
    </div>
  );
};

/**
 * 5.1 surround speaker layout visualization
 */
const Surround51Layout: React.FC<{ config: SurroundConfig }> = ({ config }) => {
  const { frontLeft, frontRight, center, lfe, surroundLeft, surroundRight } = config.channels;

  return (
    <div className="relative h-64">
      {/* Listener position */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
          <Volume2 className="w-4 h-4 text-white" />
        </div>
        <div className="text-xs text-center mt-1 text-gray-600">You</div>
      </div>

      {/* Front Left */}
      <div className="absolute top-8 left-12">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (frontLeft ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">FL</div>
      </div>

      {/* Front Right */}
      <div className="absolute top-8 right-12">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (frontRight ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">FR</div>
      </div>

      {/* Center */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (center ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">C</div>
      </div>

      {/* LFE (Subwoofer) */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 translate-x-8">
        <Speaker
          className="w-8 h-8"
          style={{ opacity: (lfe ?? 100) / 100, color: '#8b5cf6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">LFE</div>
      </div>

      {/* Surround Left */}
      <div className="absolute bottom-16 left-8">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (surroundLeft ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">SL</div>
      </div>

      {/* Surround Right */}
      <div className="absolute bottom-16 right-8">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (surroundRight ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">SR</div>
      </div>
    </div>
  );
};

/**
 * 7.1 surround speaker layout visualization
 */
const Surround71Layout: React.FC<{ config: SurroundConfig }> = ({ config }) => {
  const {
    frontLeft,
    frontRight,
    center,
    lfe,
    sideLeft,
    sideRight,
    surroundLeft,
    surroundRight,
  } = config.channels;

  return (
    <div className="relative h-64">
      {/* Listener position */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
          <Volume2 className="w-4 h-4 text-white" />
        </div>
        <div className="text-xs text-center mt-1 text-gray-600">You</div>
      </div>

      {/* Front Left */}
      <div className="absolute top-8 left-12">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (frontLeft ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">FL</div>
      </div>

      {/* Front Right */}
      <div className="absolute top-8 right-12">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (frontRight ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">FR</div>
      </div>

      {/* Center */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (center ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">C</div>
      </div>

      {/* LFE (Subwoofer) */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 translate-x-8">
        <Speaker
          className="w-8 h-8"
          style={{ opacity: (lfe ?? 100) / 100, color: '#8b5cf6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">LFE</div>
      </div>

      {/* Side Left */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (sideLeft ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">SL</div>
      </div>

      {/* Side Right */}
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (sideRight ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">SR</div>
      </div>

      {/* Surround Left */}
      <div className="absolute bottom-16 left-8">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (surroundLeft ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">BL</div>
      </div>

      {/* Surround Right */}
      <div className="absolute bottom-16 right-8">
        <Speaker
          className="w-10 h-10"
          style={{ opacity: (surroundRight ?? 100) / 100, color: '#3b82f6' }}
        />
        <div className="text-xs text-center mt-1 text-gray-600">BR</div>
      </div>
    </div>
  );
};

/**
 * Get default channel levels for a given mode
 */
function getDefaultChannels(mode: 'stereo' | '5.1' | '7.1'): SurroundConfig['channels'] {
  if (mode === 'stereo') {
    return {
      left: 100,
      right: 100,
    };
  }

  if (mode === '5.1') {
    return {
      frontLeft: 100,
      frontRight: 100,
      center: 100,
      lfe: 80,
      surroundLeft: 100,
      surroundRight: 100,
    };
  }

  // 7.1
  return {
    frontLeft: 100,
    frontRight: 100,
    center: 100,
    lfe: 80,
    sideLeft: 100,
    sideRight: 100,
    surroundLeft: 100,
    surroundRight: 100,
  };
}
