import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Volume2,
  Filter,
  Waves,
  Zap,
  Music,
  RotateCcw,
  Play,
  Pause,
  Download,
  Upload,
  Settings,
  X,
  Plus,
  Trash2
} from 'lucide-react';

interface AudioEffect {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

interface AudioEffectsPanelProps {
  onApplyEffects?: (effects: AudioEffect[]) => void;
  onPreviewEffect?: (effect: AudioEffect) => void;
  className?: string;
}

const effectCategories = {
  basic: {
    name: 'Basic',
    icon: Volume2,
    effects: [
      { type: 'gain', name: 'Gain', params: { gain_db: 0 } },
      { type: 'normalize', name: 'Normalize', params: { target_peak: 0.95 } },
      { type: 'amplification', name: 'Amplify', params: { amplification: 1.0 } },
      { type: 'invert', name: 'Invert Phase', params: {} },
      { type: 'fade_in', name: 'Fade In', params: { duration_seconds: 1.0, curve: 'exponential' } },
      { type: 'fade_out', name: 'Fade Out', params: { duration_seconds: 1.0, curve: 'exponential' } }
    ]
  },
  filters: {
    name: 'Filters',
    icon: Filter,
    effects: [
      { type: 'low_pass', name: 'Low Pass', params: { cutoff_freq: 1000, order: 4 } },
      { type: 'high_pass', name: 'High Pass', params: { cutoff_freq: 100, order: 4 } },
      { type: 'band_pass', name: 'Band Pass', params: { low_freq: 300, high_freq: 3000, order: 4 } },
      { type: 'equalization', name: '3-Band EQ', params: { low_gain: 0, mid_gain: 0, high_gain: 0, low_freq: 100, mid_freq: 1000, high_freq: 5000, mid_q: 1.0 } }
    ]
  },
  dynamics: {
    name: 'Dynamics',
    icon: Waves,
    effects: [
      { type: 'compression', name: 'Compressor', params: { threshold_db: -20, ratio: 4, attack_time: 0.01, release_time: 0.1, knee_db: 2, makeup_gain_db: 0 } },
      { type: 'limiter', name: 'Limiter', params: { threshold_db: -6, release_time: 0.05 } }
    ]
  },
  timeBased: {
    name: 'Time-Based',
    icon: Music,
    effects: [
      { type: 'reverb', name: 'Reverb', params: { room_size: 0.5, damping: 0.5, wet_level: 0.3, dry_level: 0.7, width: 1.0, pre_delay: 0.01 } },
      { type: 'delay', name: 'Delay', params: { delay_time: 0.3, feedback: 0.4, wet_level: 0.3, dry_level: 0.7, high_cut: 8000 } },
      { type: 'phaser', name: 'Phaser', params: { rate: 0.5, depth: 0.7, feedback: 0.7, wet_level: 0.5, dry_level: 0.5 } }
    ]
  },
  pitch: {
    name: 'Pitch/Voice',
    icon: Zap,
    effects: [
      { type: 'pitch_shift', name: 'Pitch Shift', params: { semitones: 0, formant_preserve: true, quality: 'high' } },
      { type: 'auto_tune', name: 'Auto-Tune', params: { key: 'C', scale: 'major', correction_speed: 0.5, retune_amount: 1.0 } },
      { type: 'voice_modification', name: 'Voice Modify', params: { pitch_shift: 0, formant_shift: 0, gender_change: false } }
    ]
  },
  modulation: {
    name: 'Modulation',
    icon: Settings,
    effects: [
      { type: 'wah_wah', name: 'Wah-Wah', params: { rate: 2.0, depth: 0.7, resonance: 2.0, wet_level: 0.5, dry_level: 0.5 } },
      { type: 'vibrato', name: 'Vibrato', params: { rate: 5.0, depth: 0.5, wet_level: 0.5, dry_level: 0.5 } },
      { type: 'tremolo', name: 'Tremolo', params: { rate: 5.0, depth: 0.5, shape: 'sine', wet_level: 0.5, dry_level: 0.5 } }
    ]
  },
  creative: {
    name: 'Creative',
    icon: Plus,
    effects: [
      { type: 'distortion', name: 'Distortion', params: { drive: 5.0, tone: 0.5, wet_level: 0.5, dry_level: 0.5 } },
      { type: 'chorus', name: 'Chorus', params: { rate: 0.25, depth: 0.5, delay_time: 0.025, wet_level: 0.3, dry_level: 0.7 } },
      { type: 'doppler', name: 'Doppler', params: { speed: 10.0, direction: 'approaching' } }
    ]
  },
  utility: {
    name: 'Utility',
    icon: Settings,
    effects: [
      { type: 'dc_correction', name: 'DC Correction', params: {} },
      { type: 'swap_channels', name: 'Swap Channels', params: {} },
      { type: 'invert_channels', name: 'Invert Channels', params: {} },
      { type: 'noise_reduction', name: 'Noise Reduction', params: { reduction_db: -20, smoothing_factor: 0.8 } },
      { type: 'remove_clicks_pops', name: 'Remove Clicks', params: { threshold: 0.8, window_size: 512 } },
      { type: 'change_speed', name: 'Change Speed', params: { speed_ratio: 1.0 } }
    ]
  }
};

export function AudioEffectsPanel({
  onApplyEffects,
  onPreviewEffect,
  className = ''
}: AudioEffectsPanelProps) {
  const [activeCategory, setActiveCategory] = useState('basic');
  const [effectChain, setEffectChain] = useState<AudioEffect[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<AudioEffect | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const addEffectToChain = useCallback((effectType: string, name: string, params: Record<string, any>) => {
    const newEffect: AudioEffect = {
      id: `${effectType}_${Date.now()}`,
      type: effectType,
      name,
      parameters: { ...params },
      enabled: true
    };

    setEffectChain(prev => [...prev, newEffect]);
    setSelectedEffect(newEffect);
  }, []);

  const removeEffectFromChain = useCallback((effectId: string) => {
    setEffectChain(prev => prev.filter(effect => effect.id !== effectId));
    if (selectedEffect?.id === effectId) {
      setSelectedEffect(null);
    }
  }, [selectedEffect]);

  const updateEffectParameter = useCallback((effectId: string, paramName: string, value: any) => {
    setEffectChain(prev => prev.map(effect =>
      effect.id === effectId
        ? { ...effect, parameters: { ...effect.parameters, [paramName]: value } }
        : effect
    ));

    if (selectedEffect?.id === effectId) {
      setSelectedEffect(prev => prev ? {
        ...prev,
        parameters: { ...prev.parameters, [paramName]: value }
      } : null);
    }
  }, [selectedEffect]);

  const toggleEffect = useCallback((effectId: string) => {
    setEffectChain(prev => prev.map(effect =>
      effect.id === effectId
        ? { ...effect, enabled: !effect.enabled }
        : effect
    ));

    if (selectedEffect?.id === effectId) {
      setSelectedEffect(prev => prev ? { ...prev, enabled: !prev.enabled } : null);
    }
  }, [selectedEffect]);

  const renderParameterControl = (paramName: string, paramValue: any, paramType: string = 'number') => {
    const commonProps = {
      className: "flex-1"
    };

    switch (paramType) {
      case 'range':
        const { min = 0, max = 100, step = 1 } = paramValue as any;
        return (
          <Slider
            {...commonProps}
            value={[paramValue]}
            onValueChange={([value]) => updateEffectParameter(selectedEffect!.id, paramName, value)}
            min={min}
            max={max}
            step={step}
            className="flex-1"
          />
        );

      case 'select':
        const options = paramValue as string[];
        return (
          <Select
            value={paramValue}
            onValueChange={(value) => updateEffectParameter(selectedEffect!.id, paramName, value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <Switch
            checked={paramValue}
            onCheckedChange={(checked) => updateEffectParameter(selectedEffect!.id, paramName, checked)}
          />
        );

      default:
        return (
          <input
            type="number"
            value={paramValue}
            onChange={(e) => updateEffectParameter(selectedEffect!.id, paramName, parseFloat(e.target.value))}
            className="flex-1 px-2 py-1 border rounded text-sm"
            step="0.1"
          />
        );
    }
  };

  const getParameterConfig = (effectType: string, paramName: string) => {
    const configs: Record<string, Record<string, any>> = {
      gain: {
        gain_db: { type: 'range', min: -20, max: 20, step: 0.1 }
      },
      normalize: {
        target_peak: { type: 'range', min: 0.1, max: 1.0, step: 0.01 }
      },
      amplification: {
        amplification: { type: 'range', min: 0.1, max: 10.0, step: 0.1 }
      },
      fade_in: {
        duration_seconds: { type: 'range', min: 0.1, max: 10.0, step: 0.1 },
        curve: { type: 'select', options: ['linear', 'exponential', 'logarithmic'] }
      },
      fade_out: {
        duration_seconds: { type: 'range', min: 0.1, max: 10.0, step: 0.1 },
        curve: { type: 'select', options: ['linear', 'exponential', 'logarithmic'] }
      },
      low_pass: {
        cutoff_freq: { type: 'range', min: 20, max: 20000, step: 10 },
        order: { type: 'select', options: [2, 4, 6, 8] }
      },
      high_pass: {
        cutoff_freq: { type: 'range', min: 20, max: 20000, step: 10 },
        order: { type: 'select', options: [2, 4, 6, 8] }
      },
      band_pass: {
        low_freq: { type: 'range', min: 20, max: 20000, step: 10 },
        high_freq: { type: 'range', min: 20, max: 20000, step: 10 },
        order: { type: 'select', options: [2, 4, 6, 8] }
      },
      equalization: {
        low_gain: { type: 'range', min: -20, max: 20, step: 0.1 },
        mid_gain: { type: 'range', min: -20, max: 20, step: 0.1 },
        high_gain: { type: 'range', min: -20, max: 20, step: 0.1 },
        mid_q: { type: 'range', min: 0.1, max: 10.0, step: 0.1 }
      },
      compression: {
        threshold_db: { type: 'range', min: -60, max: 0, step: 0.1 },
        ratio: { type: 'range', min: 1, max: 20, step: 0.1 },
        attack_time: { type: 'range', min: 0.001, max: 1.0, step: 0.001 },
        release_time: { type: 'range', min: 0.01, max: 5.0, step: 0.01 },
        knee_db: { type: 'range', min: 0, max: 20, step: 0.1 },
        makeup_gain_db: { type: 'range', min: -20, max: 20, step: 0.1 }
      },
      limiter: {
        threshold_db: { type: 'range', min: -20, max: 0, step: 0.1 },
        release_time: { type: 'range', min: 0.01, max: 1.0, step: 0.01 }
      },
      reverb: {
        room_size: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        damping: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        wet_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        dry_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        width: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        pre_delay: { type: 'range', min: 0.0, max: 0.1, step: 0.001 }
      },
      delay: {
        delay_time: { type: 'range', min: 0.01, max: 5.0, step: 0.01 },
        feedback: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        wet_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        dry_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        high_cut: { type: 'range', min: 1000, max: 20000, step: 100 }
      },
      phaser: {
        rate: { type: 'range', min: 0.1, max: 10.0, step: 0.1 },
        depth: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        feedback: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        wet_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        dry_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 }
      },
      pitch_shift: {
        semitones: { type: 'range', min: -24, max: 24, step: 0.1 },
        quality: { type: 'select', options: ['low', 'medium', 'high'] }
      },
      auto_tune: {
        key: { type: 'select', options: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] },
        scale: { type: 'select', options: ['major', 'minor', 'chromatic'] },
        correction_speed: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        retune_amount: { type: 'range', min: 0.0, max: 1.0, step: 0.01 }
      },
      voice_modification: {
        pitch_shift: { type: 'range', min: -12, max: 12, step: 0.1 },
        formant_shift: { type: 'range', min: 0.5, max: 2.0, step: 0.01 },
        gender_change: { type: 'boolean' }
      },
      wah_wah: {
        rate: { type: 'range', min: 0.1, max: 10.0, step: 0.1 },
        depth: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        resonance: { type: 'range', min: 0.1, max: 10.0, step: 0.1 },
        wet_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        dry_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 }
      },
      vibrato: {
        rate: { type: 'range', min: 0.1, max: 10.0, step: 0.1 },
        depth: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        wet_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        dry_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 }
      },
      tremolo: {
        rate: { type: 'range', min: 0.1, max: 20.0, step: 0.1 },
        depth: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        shape: { type: 'select', options: ['sine', 'square', 'triangle'] },
        wet_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        dry_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 }
      },
      distortion: {
        drive: { type: 'range', min: 1.0, max: 20.0, step: 0.1 },
        tone: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        wet_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        dry_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 }
      },
      chorus: {
        rate: { type: 'range', min: 0.01, max: 5.0, step: 0.01 },
        depth: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        delay_time: { type: 'range', min: 0.005, max: 0.05, step: 0.001 },
        wet_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 },
        dry_level: { type: 'range', min: 0.0, max: 1.0, step: 0.01 }
      },
      doppler: {
        speed: { type: 'range', min: 1.0, max: 50.0, step: 0.1 },
        direction: { type: 'select', options: ['approaching', 'receding'] }
      },
      noise_reduction: {
        reduction_db: { type: 'range', min: -40, max: 0, step: 0.1 },
        smoothing_factor: { type: 'range', min: 0.0, max: 1.0, step: 0.01 }
      },
      remove_clicks_pops: {
        threshold: { type: 'range', min: 0.1, max: 5.0, step: 0.1 },
        window_size: { type: 'range', min: 128, max: 2048, step: 64 }
      },
      change_speed: {
        speed_ratio: { type: 'range', min: 0.25, max: 4.0, step: 0.01 }
      }
    };

    return configs[effectType]?.[paramName] || { type: 'number' };
  };

  return (
    <div className={`audio-effects-panel ${className}`}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Audio Effects
          </CardTitle>
          <CardDescription>
            Apply professional audio effects to your project
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(effectCategories).map(([key, category]) => (
              <Button
                key={key}
                variant={activeCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(key)}
                className="flex items-center gap-1"
              >
                <category.icon className="w-4 h-4" />
                {category.name}
              </Button>
            ))}
          </div>

          {/* Effects Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {effectCategories[activeCategory as keyof typeof effectCategories].effects.map((effect) => (
              <Button
                key={effect.type}
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-accent"
                onClick={() => addEffectToChain(effect.type, effect.name, effect.params)}
              >
                <span className="text-sm font-medium">{effect.name}</span>
                <Plus className="w-4 h-4" />
              </Button>
            ))}
          </div>

          <Separator />

          {/* Effect Chain */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Effect Chain ({effectChain.length})</h3>
            <div className="space-y-2">
              {effectChain.map((effect, index) => (
                <div
                  key={effect.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEffect?.id === effect.id ? 'bg-accent border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedEffect(effect)}
                >
                  <span className="text-sm font-medium w-8">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{effect.name}</span>
                      <Badge variant={effect.enabled ? "default" : "secondary"}>
                        {effect.enabled ? "On" : "Off"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEffect(effect.id);
                      }}
                      className="w-8 h-8 p-0"
                    >
                      {effect.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewEffect?.(effect);
                      }}
                      className="w-8 h-8 p-0"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEffectFromChain(effect.id);
                      }}
                      className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Effect Parameters */}
          {selectedEffect && (
            <div>
              <Separator className="mb-4" />
              <h3 className="text-lg font-semibold mb-3">
                {selectedEffect.name} Parameters
              </h3>
              <div className="space-y-4">
                {Object.entries(selectedEffect.parameters).map(([paramName, paramValue]) => {
                  const config = getParameterConfig(selectedEffect.type, paramName);
                  return (
                    <div key={paramName} className="flex items-center gap-4">
                      <label className="text-sm font-medium w-32 capitalize">
                        {paramName.replace(/_/g, ' ')}:
                      </label>
                      <div className="flex-1">
                        {renderParameterControl(paramName, paramValue, config.type)}
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {typeof paramValue === 'number' ? paramValue.toFixed(2) : String(paramValue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => onApplyEffects?.(effectChain)}
              disabled={effectChain.length === 0}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Apply Effects ({effectChain.filter(e => e.enabled).length})
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEffectChain([]);
                setSelectedEffect(null);
              }}
              disabled={effectChain.length === 0}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
