import React, { useEffect, useRef, useState } from 'react';
import type { AudioTrack } from '../types';

interface WaveformDisplayProps {
  track: AudioTrack;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  onGenerate?: (waveformData: number[]) => void;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  track,
  width = 300,
  height = 60,
  color = '#3b82f6',
  backgroundColor = '#f3f4f6',
  onGenerate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (track.waveformData) {
      // Use existing waveform data
      drawWaveform(track.waveformData);
    } else if (track.url) {
      // Generate waveform from audio file
      generateWaveform();
    }
  }, [track.waveformData, track.url, width, height]);

  const generateWaveform = async () => {
    if (!track.url || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Fetch audio file
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error('Failed to fetch audio file');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Generate waveform data using Web Worker for better performance
      const samples = Math.min(width, 500); // Reduced samples for better performance
      const waveformData = await generateWaveformWithWorker(audioBuffer, samples);
      
      // Draw waveform
      drawWaveform(waveformData);
      
      // Notify parent component
      if (onGenerate) {
        onGenerate(waveformData);
      }
      
      // Close audio context to free resources
      await audioContext.close();
    } catch (err) {
      console.error('Error generating waveform:', err);
      setError('Failed to generate waveform');
      drawPlaceholder();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWaveformWithWorker = (
    audioBuffer: AudioBuffer,
    samples: number
  ): Promise<number[]> => {
    return new Promise((resolve, reject) => {
      // Fallback to synchronous generation if Worker is not available
      if (typeof Worker === 'undefined') {
        resolve(extractWaveformData(audioBuffer, samples));
        return;
      }

      try {
        // Create worker from inline code (avoids separate file issues)
        const workerCode = `
          self.onmessage = (event) => {
            const { audioData, samples } = event.data;
            const blockSize = Math.floor(audioData.length / samples);
            const waveform = [];

            for (let i = 0; i < samples; i++) {
              const start = i * blockSize;
              const end = start + blockSize;
              let sum = 0;

              for (let j = start; j < end && j < audioData.length; j++) {
                sum += audioData[j] * audioData[j];
              }

              const rms = Math.sqrt(sum / blockSize);
              waveform.push(rms);
            }

            const max = Math.max(...waveform);
            const normalized = waveform.map((value) => (max > 0 ? value / max : 0));
            
            self.postMessage({ waveformData: normalized });
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);

        worker.onmessage = (event) => {
          resolve(event.data.waveformData);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
        };

        worker.onerror = (error) => {
          reject(error);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
        };

        // Send audio data to worker
        const channelData = audioBuffer.getChannelData(0);
        worker.postMessage({
          audioData: channelData,
          samples,
        });
      } catch (error) {
        // Fallback to synchronous generation
        resolve(extractWaveformData(audioBuffer, samples));
      }
    });
  };

  const extractWaveformData = (audioBuffer: AudioBuffer, samples: number): number[] => {
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const blockSize = Math.floor(channelData.length / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let sum = 0;

      // Calculate RMS (Root Mean Square) for better visualization
      for (let j = start; j < end && j < channelData.length; j++) {
        sum += channelData[j] * channelData[j];
      }

      const rms = Math.sqrt(sum / blockSize);
      waveform.push(rms);
    }

    // Normalize waveform data
    const max = Math.max(...waveform);
    return waveform.map((value) => (max > 0 ? value / max : 0));
  };

  const drawWaveform = (waveformData: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    const barWidth = width / waveformData.length;
    const centerY = height / 2;

    ctx.fillStyle = color;

    waveformData.forEach((value, index) => {
      const barHeight = value * centerY * 0.9; // 90% of half height
      const x = index * barWidth;
      const y = centerY - barHeight;

      // Draw bar from center
      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight * 2);
    });
  };

  const drawPlaceholder = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw placeholder text
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(error || 'No audio', width / 2, height / 2);
  };

  useEffect(() => {
    if (!track.url && !track.waveformData) {
      drawPlaceholder();
    }
  }, [track.url, track.waveformData]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border border-gray-300"
      />
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded">
          <div className="text-sm text-gray-600">Generating waveform...</div>
        </div>
      )}
      {error && !isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-75 rounded">
          <div className="text-xs text-red-600">{error}</div>
        </div>
      )}
    </div>
  );
};

// Utility function to generate waveform data from audio URL
export async function generateWaveformData(
  audioUrl: string,
  samples: number = 1000
): Promise<number[]> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let sum = 0;

      for (let j = start; j < end && j < channelData.length; j++) {
        sum += channelData[j] * channelData[j];
      }

      const rms = Math.sqrt(sum / blockSize);
      waveform.push(rms);
    }

    // Normalize
    const max = Math.max(...waveform);
    const normalized = waveform.map((value) => (max > 0 ? value / max : 0));

    await audioContext.close();
    return normalized;
  } catch (error) {
    console.error('Error generating waveform data:', error);
    await audioContext.close();
    throw error;
  }
}
