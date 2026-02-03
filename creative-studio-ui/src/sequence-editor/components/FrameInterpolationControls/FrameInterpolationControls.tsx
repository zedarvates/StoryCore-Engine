import React, { useState, useCallback } from 'react';
import { frameInterpolationService, InterpolationOptions, InterpolationProgress } from '../../services/frameInterpolationService';
import './frameInterpolationControls.css';

interface FrameInterpolationControlsProps {
  shotId: string;
  onInterpolationComplete?: () => void;
}

export const FrameInterpolationControls: React.FC<FrameInterpolationControlsProps> = ({
  shotId,
  onInterpolationComplete
}) => {
  const [mode, setMode] = useState<'slow-motion' | 'frame-rate'>('slow-motion');
  const [slowMotionFactor, setSlowMotionFactor] = useState<number>(2);
  const [sourceFrameRate, setSourceFrameRate] = useState<number>(24);
  const [targetFrameRate, setTargetFrameRate] = useState<number>(60);
  const [options, setOptions] = useState<InterpolationOptions>({
    method: 'optical-flow',
    quality: 'balanced',
    targetFrameRate: 60,
    smoothness: 0.75
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<InterpolationProgress | null>(null);

  const handleSlowMotionInterpolation = useCallback(async () => {
    setIsProcessing(true);
    setProgress(null);

    try {
      await frameInterpolationService.interpolateForSlowMotion(
        shotId,
        0,
        100,
        slowMotionFactor,
        options,
        (prog) => setProgress(prog)
      );

      if (onInterpolationComplete) {
        onInterpolationComplete();
      }
    } catch (error) {
      console.error('Slow motion interpolation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [shotId, slowMotionFactor, options, onInterpolationComplete]);

  const handleFrameRateConversion = useCallback(async () => {
    setIsProcessing(true);
    setProgress(null);

    try {
      await frameInterpolationService.convertFrameRate(
        shotId,
        sourceFrameRate,
        targetFrameRate,
        options,
        (prog) => setProgress(prog)
      );

      if (onInterpolationComplete) {
        onInterpolationComplete();
      }
    } catch (error) {
      console.error('Frame rate conversion failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [shotId, sourceFrameRate, targetFrameRate, options, onInterpolationComplete]);

  const handleApplyPreset = useCallback((presetName: string) => {
    const presets = frameInterpolationService.getQualityPresets();
    if (presets[presetName]) {
      setOptions(presets[presetName]);
    }
  }, []);

  return (
    <div className="frame-interpolation-controls">
      <div className="interpolation-header">
        <h3>AI Frame Interpolation</h3>
      </div>

      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'slow-motion' ? 'active' : ''}`}
          onClick={() => setMode('slow-motion')}
        >
          Slow Motion
        </button>
        <button
          className={`mode-btn ${mode === 'frame-rate' ? 'active' : ''}`}
          onClick={() => setMode('frame-rate')}
        >
          Frame Rate Conversion
        </button>
      </div>

      {mode === 'slow-motion' && (
        <div className="slow-motion-controls">
          <div className="control-group">
            <label>Slow Motion Factor:</label>
            <select
              value={slowMotionFactor}
              onChange={(e) => setSlowMotionFactor(parseInt(e.target.value))}
            >
              <option value={2}>2x (50% speed)</option>
              <option value={4}>4x (25% speed)</option>
              <option value={8}>8x (12.5% speed)</option>
              <option value={16}>16x (6.25% speed)</option>
            </select>
          </div>
        </div>
      )}

      {mode === 'frame-rate' && (
        <div className="frame-rate-controls">
          <div className="control-group">
            <label>Source Frame Rate:</label>
            <input
              type="number"
              value={sourceFrameRate}
              onChange={(e) => setSourceFrameRate(parseInt(e.target.value))}
              min={1}
              max={240}
            />
          </div>
          <div className="control-group">
            <label>Target Frame Rate:</label>
            <input
              type="number"
              value={targetFrameRate}
              onChange={(e) => setTargetFrameRate(parseInt(e.target.value))}
              min={1}
              max={240}
            />
          </div>
        </div>
      )}

      <div className="interpolation-options">
        <div className="control-group">
          <label>Method:</label>
          <select
            value={options.method}
            onChange={(e) => setOptions({
              ...options,
              method: e.target.value as 'linear' | 'optical-flow' | 'ai-enhanced'
            })}
          >
            <option value="linear">Linear</option>
            <option value="optical-flow">Optical Flow</option>
            <option value="ai-enhanced">AI Enhanced</option>
          </select>
        </div>

        <div className="control-group">
          <label>Quality:</label>
          <select
            value={options.quality}
            onChange={(e) => setOptions({
              ...options,
              quality: e.target.value as 'fast' | 'balanced' | 'high'
            })}
          >
            <option value="fast">Fast</option>
            <option value="balanced">Balanced</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="control-group">
          <label>Smoothness: {(options.smoothness * 100).toFixed(0)}%</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={options.smoothness}
            onChange={(e) => setOptions({
              ...options,
              smoothness: parseFloat(e.target.value)
            })}
          />
        </div>
      </div>

      <div className="preset-buttons">
        <button onClick={() => handleApplyPreset('fast')}>Fast Preset</button>
        <button onClick={() => handleApplyPreset('balanced')}>Balanced Preset</button>
        <button onClick={() => handleApplyPreset('high')}>High Quality Preset</button>
      </div>

      <button
        className="interpolate-btn"
        onClick={mode === 'slow-motion' ? handleSlowMotionInterpolation : handleFrameRateConversion}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Apply Interpolation'}
      </button>

      {progress && (
        <div className="interpolation-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="progress-info">
            <span>Frame {progress.currentFrame} / {progress.totalFrames}</span>
            <span>{progress.percentage.toFixed(1)}%</span>
          </div>
          {progress.status === 'processing' && (
            <div className="time-remaining">
              Est. {Math.ceil(progress.estimatedTimeRemaining / 1000)}s remaining
            </div>
          )}
          {progress.status === 'error' && (
            <div className="error-message">{progress.error}</div>
          )}
        </div>
      )}
    </div>
  );
};
