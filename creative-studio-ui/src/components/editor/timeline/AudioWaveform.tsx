import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import './AudioWaveform.css';

interface AudioWaveformProps {
  audioUrl?: string;
  duration: number;
  currentTime: number;
  volume?: number;
  isMuted?: boolean;
  onVolumeChange?: (volume: number) => void;
  onMuteToggle?: () => void;
  height?: number;
  className?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioUrl,
  duration,
  currentTime,
  volume = 1,
  isMuted = false,
  onVolumeChange,
  onMuteToggle,
  height = 60,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate mock waveform data (in a real implementation, this would analyze the audio file)
  const generateWaveformData = useCallback((samples: number = 200) => {
    const data: number[] = [];
    for (let i = 0; i < samples; i++) {
      // Create a more realistic waveform with some variation
      const baseHeight = Math.random() * 0.3 + 0.2; // Base height between 0.2 and 0.5
      const variation = Math.sin(i * 0.1) * 0.2; // Sine wave variation
      const noise = (Math.random() - 0.5) * 0.1; // Random noise
      data.push(Math.max(0.05, Math.min(1, baseHeight + variation + noise)));
    }
    return data;
  }, []);

  // Load and analyze audio file
  useEffect(() => {
    if (!audioUrl) {
      // Generate mock data if no audio URL provided
      setWaveformData(generateWaveformData());
      return;
    }

    setIsLoading(true);
    // In a real implementation, you would:
    // 1. Load the audio file
    // 2. Use Web Audio API to analyze the waveform
    // 3. Generate waveform data from the audio buffer
    // For now, we'll use mock data
    setTimeout(() => {
      setWaveformData(generateWaveformData());
      setIsLoading(false);
    }, 500);
  }, [audioUrl, generateWaveformData]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    // Draw waveform
    const barWidth = width / waveformData.length;
    const centerY = canvasHeight / 2;

    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * canvasHeight * 0.8; // Scale to 80% of canvas height

      // Calculate progress-based coloring
      const progress = currentTime / duration;
      const isPlayed = index / waveformData.length <= progress;

      // Color gradient: blue for unplayed, green for played
      ctx.fillStyle = isPlayed ? '#10b981' : '#3b82f6';

      // Draw the waveform bar (centered vertically)
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    });

    // Draw progress line
    if (duration > 0) {
      const progressX = (currentTime / duration) * width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, canvasHeight);
      ctx.stroke();
    }
  }, [waveformData, currentTime, duration]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickProgress = x / canvas.width;
    const newTime = clickProgress * duration;

    // In a real implementation, you would call onTimeChange here
    // For now, we'll just log it
    console.log('Waveform clicked at time:', newTime);
  }, [duration]);

  return (
    <div className={`audio-waveform ${className}`}>
      <div className="waveform-header">
        <div className="waveform-info">
          <span className="waveform-label">Audio Track</span>
          {audioUrl && <span className="waveform-duration">{formatTime(duration)}</span>}
        </div>

        <div className="waveform-controls">
          {/* Volume slider */}
          <div className="volume-control">
            <button
              className="volume-btn"
              onClick={onMuteToggle}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
              className="volume-slider"
            />
            <span className="volume-value">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="waveform-canvas-container">
        {isLoading ? (
          <div className="waveform-loading">
            <div className="loading-spinner"></div>
            <span>Loading audio...</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={800}
            height={height}
            className="waveform-canvas"
            onClick={handleCanvasClick}
            style={{ cursor: 'pointer' }}
          />
        )}
      </div>
    </div>
  );
};

// Utility function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}