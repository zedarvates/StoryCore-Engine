/**
 * Audio Visualization Hooks for StoryCore
 * React hooks for audio analysis and visualization
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioContextService, createAudioContextService } from '../services/audio/AudioContextService';
import {
  AudioVisualizerConfig,
  WaveformData,
  FrequencyData,
  AudioAnalyzerState,
  VisualizationType,
  VisualizationPreset,
} from '../services/audio-visualization/AudioVisualizerTypes';

// Default visualization presets
export const DEFAULT_PRESETS: VisualizationPreset[] = [
  {
    id: 'waveform-default',
    name: 'Waveform',
    type: 'waveform',
    config: { fftSize: 2048, smoothingTimeConstant: 0.8 },
    colors: ['#00d4ff', '#0099cc'],
    gpuAccelerated: false,
  },
  {
    id: 'spectrum-default',
    name: 'Spectrum',
    type: 'spectrum',
    config: { fftSize: 2048, smoothingTimeConstant: 0.85 },
    colors: ['#ff6b6b', '#feca57', '#48dbfb'],
    gpuAccelerated: true,
  },
  {
    id: 'circular-default',
    name: 'Circular',
    type: 'circular',
    config: { fftSize: 512, smoothingTimeConstant: 0.75 },
    colors: ['#a55eea', '#ff6b6b', '#feca57'],
    gpuAccelerated: true,
  },
  {
    id: 'bars-default',
    name: 'Frequency Bars',
    type: 'bar',
    config: { fftSize: 1024, smoothingTimeConstant: 0.8 },
    colors: ['#00d4ff', '#00ff88', '#ff6b6b'],
    gpuAccelerated: true,
  },
];

/**
 * Hook to manage audio context and analyzer
 */
export function useAudioContext(config?: Partial<AudioVisualizerConfig>) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioServiceRef = useRef<AudioContextService | null>(null);

  const initialize = useCallback(async () => {
    try {
      audioServiceRef.current = createAudioContextService(config);
      await audioServiceRef.current.initialize();
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize audio context');
      setIsInitialized(false);
    }
  }, [config]);

  useEffect(() => {
    initialize();

    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.dispose();
        audioServiceRef.current = null;
      }
    };
  }, [initialize]);

  const loadAudio = useCallback(async (url: string) => {
    if (!audioServiceRef.current) {
      throw new Error('Audio context not initialized');
    }
    await audioServiceRef.current.loadAudio(url);
  }, []);

  const attachAudioElement = useCallback((audioElement: HTMLAudioElement) => {
    if (!audioServiceRef.current) {
      throw new Error('Audio context not initialized');
    }
    audioServiceRef.current.attachAudioElement(audioElement);
  }, []);

  const play = useCallback(() => {
    audioServiceRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    audioServiceRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    audioServiceRef.current?.stop();
  }, []);

  const seek = useCallback((time: number) => {
    audioServiceRef.current?.seek(time);
  }, []);

  const setVolume = useCallback((volume: number) => {
    audioServiceRef.current?.setVolume(volume);
  }, []);

  const getState = useCallback(() => {
    return audioServiceRef.current?.getState() ?? null;
  }, []);

  return {
    isInitialized,
    error,
    audioService: audioServiceRef.current,
    loadAudio,
    attachAudioElement,
    play,
    pause,
    stop,
    seek,
    setVolume,
    getState,
  };
}

/**
 * Hook for spectrum analysis with real-time frequency data
 */
export function useSpectrumAnalysis(
  audioService: AudioContextService | null,
  options: {
    enabled?: boolean;
    updateInterval?: number;
  } = {}
) {
  const { enabled = true, updateInterval = 16 } = options;

  const [frequencyData, setFrequencyData] = useState<FrequencyData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const startAnalysis = useCallback(() => {
    if (!audioService || !enabled) return;

    setIsAnalyzing(true);

    const analyze = (timestamp: number) => {
      if (!enabled || !audioService) return;

      if (timestamp - lastUpdateRef.current >= updateInterval) {
        const data = audioService.getFrequencyData();
        setFrequencyData(data);
        lastUpdateRef.current = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [audioService, enabled, updateInterval]);

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startAnalysis();
    } else {
      stopAnalysis();
    }

    return () => {
      stopAnalysis();
    };
  }, [enabled, startAnalysis, stopAnalysis]);

  return {
    frequencyData,
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
  };
}

/**
 * Hook for waveform data analysis
 */
export function useWaveformData(
  audioService: AudioContextService | null,
  options: {
    enabled?: boolean;
    updateInterval?: number;
  } = {}
) {
  const { enabled = true, updateInterval = 16 } = options;

  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const startAnalysis = useCallback(() => {
    if (!audioService || !enabled) return;

    setIsAnalyzing(true);

    const analyze = (timestamp: number) => {
      if (!enabled || !audioService) return;

      if (timestamp - lastUpdateRef.current >= updateInterval) {
        const data = audioService.getWaveformData();
        setWaveformData(data);
        lastUpdateRef.current = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [audioService, enabled, updateInterval]);

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startAnalysis();
    } else {
      stopAnalysis();
    }

    return () => {
      stopAnalysis();
    };
  }, [enabled, startAnalysis, stopAnalysis]);

  return {
    waveformData,
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
  };
}

/**
 * Hook for combined audio visualization
 */
export function useAudioVisualization(
  audioService: AudioContextService | null,
  options: {
    enabled?: boolean;
    updateInterval?: number;
    visualizationType?: VisualizationType;
  } = {}
) {
  const { enabled = true, updateInterval = 16, visualizationType = 'spectrum' } = options;

  const [frequencyData, setFrequencyData] = useState<FrequencyData | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [state, setState] = useState<AudioAnalyzerState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const startVisualization = useCallback(() => {
    if (!audioService || !enabled) return;

    setIsAnalyzing(true);

    const update = (timestamp: number) => {
      if (!enabled || !audioService) return;

      if (timestamp - lastUpdateRef.current >= updateInterval) {
        const freqData = audioService.getFrequencyData();
        const waveData = audioService.getWaveformData();
        const audioState = audioService.getState();

        setFrequencyData(freqData);
        setWaveformData(waveData);
        setState(audioState);

        lastUpdateRef.current = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);
  }, [audioService, enabled, updateInterval]);

  const stopVisualization = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startVisualization();
    } else {
      stopVisualization();
    }

    return () => {
      stopVisualization();
    };
  }, [enabled, startVisualization, stopVisualization]);

  // Sync with audio service state changes
  useEffect(() => {
    if (audioService) {
      audioService.setStateChangeCallback((newState) => {
        setState(newState);
      });
    }
  }, [audioService]);

  return {
    frequencyData,
    waveformData,
    state,
    isAnalyzing,
    visualizationType,
    startVisualization,
    stopVisualization,
  };
}

/**
 * Hook for beat detection
 */
export function useBeatDetection(
  audioService: AudioContextService | null,
  options: {
    enabled?: boolean;
    threshold?: number;
    minInterval?: number;
  } = {}
) {
  const { enabled = true, threshold = 0.7, minInterval = 200 } = options;

  const [isBeat, setIsBeat] = useState(false);
  const [beatIntensity, setBeatIntensity] = useState(0);
  const lastBeatTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const detectBeat = useCallback(() => {
    if (!audioService || !enabled) return;

    const frequencyData = audioService.getFrequencyData();
    const now = performance.now();

    // Calculate bass energy (low frequencies)
    const bassEndIndex = Math.floor((250 / (audioService.getAudioContext()?.sampleRate || 44100)) * (frequencyData.frequencyData.length * 2));
    let bassEnergy = 0;
    for (let i = 0; i < bassEndIndex; i++) {
      bassEnergy += frequencyData.frequencyData[i];
    }
    bassEnergy /= bassEndIndex * 255;

    // Check for beat
    if (bassEnergy > threshold && now - lastBeatTimeRef.current > minInterval) {
      setIsBeat(true);
      setBeatIntensity(bassEnergy);
      lastBeatTimeRef.current = now;

      // Reset beat flag after short delay
      setTimeout(() => setIsBeat(false), 50);
    }
  }, [audioService, enabled, threshold, minInterval]);

  useEffect(() => {
    if (!enabled) return;

    const loop = () => {
      detectBeat();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, detectBeat]);

  return { isBeat, beatIntensity };
}

/**
 * Hook for managing visualization presets
 */
export function useVisualizationPresets() {
  const [presets, setPresets] = useState<VisualizationPreset[]>(DEFAULT_PRESETS);
  const [activePreset, setActivePreset] = useState<VisualizationPreset | null>(null);

  const addPreset = useCallback((preset: VisualizationPreset) => {
    setPresets((prev) => [...prev, preset]);
  }, []);

  const removePreset = useCallback((presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  const updatePreset = useCallback((presetId: string, updates: Partial<VisualizationPreset>) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === presetId ? { ...p, ...updates } : p))
    );
  }, []);

  const selectPreset = useCallback((presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setActivePreset(preset);
    }
  }, [presets]);

  return {
    presets,
    activePreset,
    addPreset,
    removePreset,
    updatePreset,
    selectPreset,
  };
}
