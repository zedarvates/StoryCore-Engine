/**
 * AudioWaveformOverlay — Rendu de waveform audio dans un clip de la timeline
 * Utilise Web Audio API pour décoder et afficher les pics audio.
 * Inspiré de LTX-Desktop.
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';

interface AudioWaveformOverlayProps {
  /** URL de la source audio */
  audioUrl?: string;
  /** Largeur en pixels */
  width: number;
  /** Hauteur en pixels */
  height: number;
  /** Couleur de la waveform */
  color?: string;
  /** Opacité */
  opacity?: number;
  /** Résolution (nombre de barres/pics) */
  resolution?: number;
}

interface WaveformPeak {
  min: number;
  max: number;
}

export const AudioWaveformOverlay: React.FC<AudioWaveformOverlayProps> = ({
  audioUrl,
  width,
  height,
  color = '#10b981',
  opacity = 0.6,
  resolution = 100,
}) => {
  const [peaks, setPeaks] = useState<WaveformPeak[] | null>(null);
  const [error, setError] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    let cancelled = false;

    const loadAudio = async () => {
      try {
        // Créer l'AudioContext une seule fois
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;

        // Fetch et décodage
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        if (cancelled) return;

        // Extraire les pics
        const channelData = audioBuffer.getChannelData(0);
        const peaksPerBar = Math.floor(channelData.length / resolution);
        const computedPeaks: WaveformPeak[] = [];

        for (let i = 0; i < resolution; i++) {
          let min = 0;
          let max = 0;
          const start = i * peaksPerBar;
          const end = Math.min(start + peaksPerBar, channelData.length);

          for (let j = start; j < end; j++) {
            const val = channelData[j];
            if (val < min) min = val;
            if (val > max) max = val;
          }

          computedPeaks.push({ min, max });
        }

        setPeaks(computedPeaks);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    loadAudio();
    return () => { cancelled = true; };
  }, [audioUrl, resolution]);

  // Canvas drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    const barWidth = width / peaks.length;

    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;

    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const barH = Math.max(1, (peak.max - peak.min) * centerY);
      const halfH = Math.max(1, barH / 2);
      ctx.fillRect(x, centerY - halfH, Math.max(1, barWidth - 0.5), Math.max(1, halfH * 2));
    });

    ctx.globalAlpha = 1;
  }, [peaks, width, height, color, opacity]);

  if (!audioUrl || error) {
    // Fallback : ligne plate
    return (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center',
          padding: '0 4px', opacity: 0.3,
        }}
      >
        <div style={{ width: '100%', height: '2px', background: color, borderRadius: '1px' }} />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * Hook pour charger et mettre en cache les waveforms
 * Évite de re-décoder le même fichier audio plusieurs fois.
 */
const waveformCache = new Map<string, WaveformPeak[]>();

export function useAudioWaveform(audioUrl?: string, resolution: number = 100): {
  peaks: WaveformPeak[] | null;
  loading: boolean;
  error: boolean;
} {
  const [peaks, setPeaks] = useState<WaveformPeak[] | null>(() => {
    return audioUrl ? waveformCache.get(audioUrl) ?? null : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!audioUrl) return;
    if (waveformCache.has(audioUrl)) {
      setPeaks(waveformCache.get(audioUrl)!);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const ctx = new AudioContext();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        const channelData = audioBuffer.getChannelData(0);
        const peaksPerBar = Math.floor(channelData.length / resolution);
        const computedPeaks: WaveformPeak[] = [];

        for (let i = 0; i < resolution; i++) {
          let min = 0, max = 0;
          const start = i * peaksPerBar;
          const end = Math.min(start + peaksPerBar, channelData.length);
          for (let j = start; j < end; j++) {
            const val = channelData[j];
            if (val < min) min = val;
            if (val > max) max = val;
          }
          computedPeaks.push({ min, max });
        }

        waveformCache.set(audioUrl!, computedPeaks);
        if (!cancelled) {
          setPeaks(computedPeaks);
          setLoading(false);
        }
        ctx.close();
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [audioUrl, resolution]);

  return { peaks, loading, error };
}

export default AudioWaveformOverlay;
