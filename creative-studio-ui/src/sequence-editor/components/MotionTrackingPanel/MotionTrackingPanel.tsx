import React, { useState, useCallback } from 'react';
import { motionTrackingService, TrackingOptions, TrackingData, TrackingProgress } from '../../services/motionTrackingService';
import './motionTrackingPanel.css';

interface MotionTrackingPanelProps {
  shotId: string;
  onTrackingComplete?: () => void;
}

export const MotionTrackingPanel: React.FC<MotionTrackingPanelProps> = ({
  shotId,
  onTrackingComplete
}) => {
  const [trackingPoint, setTrackingPoint] = useState<{ x: number; y: number }>({ x: 960, y: 540 });
  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(100);
  const [options, setOptions] = useState<TrackingOptions>({
    method: 'point',
    algorithm: 'optical-flow',
    sensitivity: 0.7,
    adaptiveTracking: true
  });
  const [isTracking, setIsTracking] = useState(false);
  const [progress, setProgress] = useState<TrackingProgress | null>(null);
  const [activeTracks, setActiveTracks] = useState<TrackingData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const handleStartTracking = useCallback(async () => {
    setIsTracking(true);
    setProgress(null);

    try {
      const trackData = await motionTrackingService.startTracking(
        shotId,
        startFrame,
        endFrame,
        trackingPoint,
        options,
        (prog) => setProgress(prog)
      );

      setActiveTracks([...motionTrackingService.getActiveTracks()]);

      if (onTrackingComplete) {
        onTrackingComplete();
      }
    } catch (error) {
      console.error('Motion tracking failed:', error);
    } finally {
      setIsTracking(false);
    }
  }, [shotId, startFrame, endFrame, trackingPoint, options, onTrackingComplete]);

  const handleExportTrack = useCallback((trackId: string, format: 'json' | 'csv' | 'after-effects' | 'nuke') => {
    try {
      const exportData = motionTrackingService.exportTrackingData(trackId, format);
      
      // Create download
      const blob = new Blob([exportData.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `track-${trackId}.${format === 'after-effects' ? 'txt' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  const handleDeleteTrack = useCallback((trackId: string) => {
    motionTrackingService.deleteTrack(trackId);
    setActiveTracks([...motionTrackingService.getActiveTracks()]);
    if (selectedTrack === trackId) {
      setSelectedTrack(null);
    }
  }, [selectedTrack]);

  const handleUpdateTrackName = useCallback((trackId: string, newName: string) => {
    motionTrackingService.updateTrackName(trackId, newName);
    setActiveTracks([...motionTrackingService.getActiveTracks()]);
  }, []);

  return (
    <div className="motion-tracking-panel">
      <div className="tracking-header">
        <h3>AI Motion Tracking</h3>
      </div>

      <div className="tracking-setup">
        <h4>Tracking Setup</h4>
        
        <div className="tracking-point">
          <label>Tracking Point:</label>
          <div className="point-inputs">
            <input
              type="number"
              placeholder="X"
              value={trackingPoint.x}
              onChange={(e) => setTrackingPoint({ ...trackingPoint, x: parseInt(e.target.value) })}
            />
            <input
              type="number"
              placeholder="Y"
              value={trackingPoint.y}
              onChange={(e) => setTrackingPoint({ ...trackingPoint, y: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="frame-range">
          <div className="range-input">
            <label>Start Frame:</label>
            <input
              type="number"
              value={startFrame}
              onChange={(e) => setStartFrame(parseInt(e.target.value))}
              min={0}
            />
          </div>
          <div className="range-input">
            <label>End Frame:</label>
            <input
              type="number"
              value={endFrame}
              onChange={(e) => setEndFrame(parseInt(e.target.value))}
              min={startFrame}
            />
          </div>
        </div>

        <div className="tracking-options">
          <div className="option-group">
            <label>Method:</label>
            <select
              value={options.method}
              onChange={(e) => setOptions({
                ...options,
                method: e.target.value as 'point' | 'object' | 'feature'
              })}
            >
              <option value="point">Point Tracking</option>
              <option value="object">Object Tracking</option>
              <option value="feature">Feature Tracking</option>
            </select>
          </div>

          <div className="option-group">
            <label>Algorithm:</label>
            <select
              value={options.algorithm}
              onChange={(e) => setOptions({
                ...options,
                algorithm: e.target.value as 'optical-flow' | 'feature-matching' | 'deep-learning'
              })}
            >
              <option value="optical-flow">Optical Flow</option>
              <option value="feature-matching">Feature Matching</option>
              <option value="deep-learning">Deep Learning</option>
            </select>
          </div>

          <div className="option-group">
            <label>Sensitivity: {(options.sensitivity * 100).toFixed(0)}%</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={options.sensitivity}
              onChange={(e) => setOptions({
                ...options,
                sensitivity: parseFloat(e.target.value)
              })}
            />
          </div>

          <div className="option-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={options.adaptiveTracking}
                onChange={(e) => setOptions({
                  ...options,
                  adaptiveTracking: e.target.checked
                })}
              />
              Adaptive Tracking
            </label>
          </div>
        </div>

        <button
          className="start-tracking-btn"
          onClick={handleStartTracking}
          disabled={isTracking}
        >
          {isTracking ? 'Tracking...' : 'Start Tracking'}
        </button>

        {progress && (
          <div className="tracking-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="progress-info">
              <span>Frame {progress.currentFrame} / {progress.totalFrames}</span>
              <span className={`status-${progress.status}`}>{progress.status}</span>
            </div>
            {progress.error && (
              <div className="error-message">{progress.error}</div>
            )}
          </div>
        )}
      </div>

      <div className="active-tracks">
        <h4>Active Tracks ({activeTracks.length})</h4>
        
        {activeTracks.length === 0 ? (
          <div className="no-tracks">No active tracks. Start tracking to create one.</div>
        ) : (
          <div className="tracks-list">
            {activeTracks.map((track) => (
              <div
                key={track.trackId}
                className={`track-item ${selectedTrack === track.trackId ? 'selected' : ''}`}
                onClick={() => setSelectedTrack(track.trackId)}
              >
                <div className="track-info">
                  <input
                    type="text"
                    value={track.objectName}
                    onChange={(e) => handleUpdateTrackName(track.trackId, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="track-stats">
                    <span>{track.frames.size} frames</span>
                    <span>Confidence: {(track.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="track-actions">
                  <button
                    className="export-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportTrack(track.trackId, 'json');
                    }}
                    title="Export as JSON"
                  >
                    JSON
                  </button>
                  <button
                    className="export-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportTrack(track.trackId, 'csv');
                    }}
                    title="Export as CSV"
                  >
                    CSV
                  </button>
                  <button
                    className="export-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportTrack(track.trackId, 'after-effects');
                    }}
                    title="Export for After Effects"
                  >
                    AE
                  </button>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrack(track.trackId);
                    }}
                    title="Delete track"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
