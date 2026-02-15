/**
 * Export Panel Component
 * 
 * Provides UI for video export with:
 * - Full preset selection (YouTube, TikTok, Instagram, Twitter)
 * - Custom resolution/quality settings
 * - Progress tracking
 * - Download management
 * 
 * Requirements: Phase 3 - Enhance export functionality
 */

import React, { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import './exportPanel.css';

// =============================================================================
// Types
// =============================================================================

interface ExportPreset {
  id: string;
  name: string;
  platform: string;
  resolution: string;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  quality: string;
  description: string;
}

const EXPORT_PRESETS: ExportPreset[] = [
  { id: 'youtube_1080p', name: 'YouTube 1080p', platform: 'YouTube', resolution: '1920x1080', width: 1920, height: 1080, aspectRatio: '16:9', format: 'mp4', quality: 'high', description: 'Best for YouTube, standard HD' },
  { id: 'youtube_4k', name: 'YouTube 4K', platform: 'YouTube', resolution: '3840x2160', width: 3840, height: 2160, aspectRatio: '16:9', format: 'mp4', quality: 'ultra', description: '4K Ultra HD for YouTube' },
  { id: 'youtube_720p', name: 'YouTube 720p', platform: 'YouTube', resolution: '1280x720', width: 1280, height: 720, aspectRatio: '16:9', format: 'mp4', quality: 'medium', description: 'HD, faster upload' },
  { id: 'tiktok', name: 'TikTok/Reels', platform: 'TikTok', resolution: '1080x1920', width: 1080, height: 1920, aspectRatio: '9:16', format: 'mp4', quality: 'high', description: 'Vertical video for TikTok, Instagram Reels' },
  { id: 'instagram_feed', name: 'Instagram Feed', platform: 'Instagram', resolution: '1080x1080', width: 1080, height: 1080, aspectRatio: '1:1', format: 'mp4', quality: 'high', description: 'Square format for Instagram Feed' },
  { id: 'instagram_story', name: 'Instagram Story', platform: 'Instagram', resolution: '1080x1920', width: 1080, height: 1920, aspectRatio: '9:16', format: 'mp4', quality: 'high', description: 'Vertical for Instagram Stories' },
  { id: 'instagram_portrait', name: 'Instagram Portrait', platform: 'Instagram', resolution: '1080x1350', width: 1080, height: 1350, aspectRatio: '4:5', format: 'mp4', quality: 'high', description: 'Portrait for Instagram Feed' },
  { id: 'twitter', name: 'Twitter/X', platform: 'Twitter', resolution: '1280x720', width: 1280, height: 720, aspectRatio: '16:9', format: 'mp4', quality: 'medium', description: 'Standard Twitter video' },
  { id: 'facebook', name: 'Facebook', platform: 'Facebook', resolution: '1920x1080', width: 1920, height: 1080, aspectRatio: '16:9', format: 'mp4', quality: 'high', description: 'Best for Facebook' },
  { id: 'linkedin', name: 'LinkedIn', platform: 'LinkedIn', resolution: '1920x1080', width: 1920, height: 1080, aspectRatio: '16:9', format: 'mp4', quality: 'high', description: 'Professional content' },
  { id: 'custom', name: 'Custom', platform: 'Custom', resolution: 'Custom', width: 1920, height: 1080, aspectRatio: 'custom', format: 'mp4', quality: 'custom', description: 'Custom settings' },
];

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'mp4', name: 'MP4 (H.264)', extension: '.mp4' },
  { id: 'webm', name: 'WebM (VP9)', extension: '.webm' },
  { id: 'mov', name: 'MOV (QuickTime)', extension: '.mov' },
  { id: 'avi', name: 'AVI', extension: '.avi' },
];

interface ExportQuality {
  id: string;
  name: string;
  bitrate: string;
}

const QUALITY_LEVELS: ExportQuality[] = [
  { id: 'low', name: 'Low', bitrate: '2 Mbps' },
  { id: 'medium', name: 'Medium', bitrate: '5 Mbps' },
  { id: 'high', name: 'High', bitrate: '10 Mbps' },
  { id: 'ultra', name: 'Ultra', bitrate: '20 Mbps' },
];

// =============================================================================
// Component
// =============================================================================

export const ExportPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const projectId = useAppSelector((state) => state.project.metadata?.id);
  const shots = useAppSelector((state) => state.timeline.shots);
  
  // Selected preset
  const [selectedPreset, setSelectedPreset] = useState<string>('youtube_1080p');
  
  // Custom settings
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customFormat, setCustomFormat] = useState('mp4');
  const [customQuality, setCustomQuality] = useState('high');
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Get selected preset details
  const currentPreset = EXPORT_PRESETS.find(p => p.id === selectedPreset) || EXPORT_PRESETS[0];
  
  // =============================================================================
  // Handlers
  // =============================================================================
  
  const handleStartExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    
    const resolution = selectedPreset === 'custom' 
      ? `${customWidth}x${customHeight}`
      : currentPreset.resolution;
    
    try {
      const response = await fetch('/api/video-editor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId || 'default',
          format: customFormat,
          preset: selectedPreset,
          resolution,
          quality: customQuality,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExportJobId(data.job_id);
        
        // Poll for progress
        const pollProgress = async () => {
          const statusResponse = await fetch(`/api/video-editor/export/${data.job_id}/status`);
          const statusData = await statusResponse.json();
          
          setExportProgress(statusData.progress);
          
          if (statusData.status === 'completed') {
            setIsExporting(false);
          } else if (statusData.status === 'failed') {
            setExportError(statusData.error || 'Export failed');
            setIsExporting(false);
          } else {
            setTimeout(pollProgress, 1000);
          }
        };
        
        setTimeout(pollProgress, 1000);
      } else {
        setExportError('Failed to start export');
        setIsExporting(false);
      }
    } catch (error) {
      setExportError('Export error: ' + (error as Error).message);
      setIsExporting(false);
    }
  }, [projectId, selectedPreset, currentPreset, customWidth, customHeight, customFormat, customQuality]);
  
  const handleCancelExport = useCallback(() => {
    if (exportJobId) {
      fetch(`/api/video-editor/export/${exportJobId}/cancel`, { method: 'POST' });
    }
    setIsExporting(false);
    setExportProgress(0);
    setExportJobId(null);
  }, [exportJobId]);
  
  const handleDownload = useCallback(() => {
    if (exportJobId) {
      window.open(`/api/video-editor/export/${exportJobId}/download`, '_blank');
    }
  }, [exportJobId]);
  
  // =============================================================================
  // Render
  // =============================================================================
  
  // Group presets by platform
  const presetsByPlatform = EXPORT_PRESETS.reduce((acc, preset) => {
    if (!acc[preset.platform]) {
      acc[preset.platform] = [];
    }
    acc[preset.platform].push(preset);
    return acc;
  }, {} as Record<string, ExportPreset[]>);
  
  return (
    <div className="export-panel">
      <div className="export-panel-header">
        <h3>Export Video</h3>
      </div>
      
      {/* Preset Selection */}
      <div className="export-section">
        <h4>Platform Presets</h4>
        
        {Object.entries(presetsByPlatform).map(([platform, presets]) => (
          <div key={platform} className="platform-group">
            <div className="platform-label">{platform}</div>
            <div className="preset-grid">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  className={`preset-btn ${selectedPreset === preset.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset(preset.id)}
                  disabled={isExporting}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-resolution">{preset.resolution}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Custom Settings (if custom selected) */}
      {selectedPreset === 'custom' && (
        <div className="export-section">
          <h4>Custom Settings</h4>
          
          <div className="custom-row">
            <div className="custom-field">
              <label>Width</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                min={320}
                max={7680}
                className="custom-input"
                disabled={isExporting}
                title="Video width in pixels"
              />
            </div>
            <span className="custom-separator">×</span>
            <div className="custom-field">
              <label>Height</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                min={240}
                max={4320}
                className="custom-input"
                disabled={isExporting}
                title="Video height in pixels"
              />
            </div>
          </div>
          
          <div className="custom-field">
            <label>Format</label>
            <select
              value={customFormat}
              onChange={(e) => setCustomFormat(e.target.value)}
              className="custom-select"
              disabled={isExporting}
              title="Select output video format"
            >
              {EXPORT_FORMATS.map(fmt => (
                <option key={fmt.id} value={fmt.id}>{fmt.name}</option>
              ))}
            </select>
          </div>
          
          <div className="custom-field">
            <label>Quality</label>
            <select
              value={customQuality}
              onChange={(e) => setCustomQuality(e.target.value)}
              className="custom-select"
              disabled={isExporting}
              title="Select output video quality"
            >
              {QUALITY_LEVELS.map(q => (
                <option key={q.id} value={q.id}>{q.name} ({q.bitrate})</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Export Summary */}
      <div className="export-summary">
        <div className="summary-row">
          <span className="summary-label">Resolution</span>
          <span className="summary-value">
            {selectedPreset === 'custom' ? `${customWidth}×${customHeight}` : currentPreset.resolution}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Aspect Ratio</span>
          <span className="summary-value">{currentPreset.aspectRatio}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Format</span>
          <span className="summary-value">{customFormat.toUpperCase()}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Quality</span>
          <span className="summary-value">{customQuality.charAt(0).toUpperCase() + customQuality.slice(1)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Shots</span>
          <span className="summary-value">{shots.length}</span>
        </div>
      </div>
      
      {/* Progress */}
      {isExporting && (
        <div className="export-progress">
          <div className="progress-header">
            <span>Exporting...</span>
            <span>{exportProgress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ '--progress-width': `${exportProgress}%` } as React.CSSProperties}
            />
          </div>
        </div>
      )}
      
      {/* Error */}
      {exportError && (
        <div className="export-error">
          {exportError}
        </div>
      )}
      
      {/* Actions */}
      <div className="export-actions">
        {!isExporting ? (
          <button
            className="export-btn"
            onClick={handleStartExport}
            disabled={shots.length === 0}
          >
            Start Export
          </button>
        ) : (
          <button
            className="cancel-btn"
            onClick={handleCancelExport}
          >
            Cancel
          </button>
        )}
        
        {exportProgress === 100 && (
          <button
            className="download-btn"
            onClick={handleDownload}
          >
            Download
          </button>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;

