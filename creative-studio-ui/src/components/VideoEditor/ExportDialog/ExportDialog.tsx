/**
 * Export Dialog Component
 * Export video with presets for different platforms
 */

import React, { useState } from 'react';
import { useVideoEditor } from '../../../contexts/VideoEditorContext';
import {
  ExportFormat,
  ExportCodec,
  ExportPreset,
  Resolution,
  ExportSettings,
} from '../../../types/video-editor';
import './ExportDialog.css';

interface ExportDialogProps {
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ onClose, onExport }) => {
  const { project } = useVideoEditor();
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.MP4);
  const [preset, setPreset] = useState<ExportPreset>(ExportPreset.YOUTUBE_1080P);
  const [resolution, setResolution] = useState<Resolution>({ width: 1920, height: 1080 });
  const [frameRate, setFrameRate] = useState(30);
  const [quality, setQuality] = useState(80);
  const [includeAudio, setIncludeAudio] = useState(true);

  const presets = [
    {
      id: ExportPreset.YOUTUBE_1080P,
      name: 'YouTube 1080p',
      icon: '📺',
      resolution: { width: 1920, height: 1080 },
      description: 'Best for YouTube upload',
    },
    {
      id: ExportPreset.YOUTUBE_4K,
      name: 'YouTube 4K',
      icon: '📺',
      resolution: { width: 3840, height: 2160 },
      description: 'High quality for YouTube',
    },
    {
      id: ExportPreset.TIKTOK,
      name: 'TikTok',
      icon: '📱',
      resolution: { width: 1080, height: 1920 },
      description: 'Vertical video format',
    },
    {
      id: ExportPreset.INSTAGRAM_FEED,
      name: 'Instagram Feed',
      icon: '📷',
      resolution: { width: 1080, height: 1080 },
      description: 'Square format',
    },
    {
      id: ExportPreset.INSTAGRAM_STORY,
      name: 'Instagram Story',
      icon: '📱',
      resolution: { width: 1080, height: 1920 },
      description: 'Story format',
    },
    {
      id: ExportPreset.FACEBOOK,
      name: 'Facebook',
      icon: '📘',
      resolution: { width: 1920, height: 1080 },
      description: 'Best for Facebook',
    },
  ];

  const handlePresetSelect = (presetInfo: typeof presets[0]) => {
    setPreset(presetInfo.id);
    setResolution(presetInfo.resolution);
  };

  const handleExport = () => {
    const settings: ExportSettings = {
      format,
      codec: format === ExportFormat.MP4 ? ExportCodec.H264 : ExportCodec.VP9,
      resolution,
      frameRate,
      quality,
      preset,
      includeAudio,
    };
    onExport(settings);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">Export Video</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <div className="dialog-content">
          <div className="export-section">
            <h4>Select Preset</h4>
            <div className="export-presets">
              {presets.map((presetInfo) => {
                const isSelected = preset === presetInfo.id;
                return (
                  <div
                    key={presetInfo.id}
                    className={`export-preset ${isSelected ? 'selected' : ''}`}
                    onClick={() => handlePresetSelect(presetInfo)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePresetSelect(presetInfo);
                      }
                    }}
                  >
                    <div className="export-preset-icon">{presetInfo.icon}</div>
                    <div className="export-preset-name">{presetInfo.name}</div>
                    <div className="export-preset-details">
                      {presetInfo.resolution.width}x{presetInfo.resolution.height}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="export-section">
            <h4>Format</h4>
            <div className="format-options">
              <label className={format === ExportFormat.MP4 ? 'selected' : ''} htmlFor="format-mp4">
                <input
                  id="format-mp4"
                  type="radio"
                  name="format"
                  value={ExportFormat.MP4}
                  checked={format === ExportFormat.MP4}
                  onChange={() => setFormat(ExportFormat.MP4)}
                />
                MP4
              </label>
              <label className={format === ExportFormat.WEBM ? 'selected' : ''} htmlFor="format-webm">
                <input
                  id="format-webm"
                  type="radio"
                  name="format"
                  value={ExportFormat.WEBM}
                  checked={format === ExportFormat.WEBM}
                  onChange={() => setFormat(ExportFormat.WEBM)}
                />
                WebM
              </label>
              <label className={format === ExportFormat.MOV ? 'selected' : ''} htmlFor="format-mov">
                <input
                  id="format-mov"
                  type="radio"
                  name="format"
                  value={ExportFormat.MOV}
                  checked={format === ExportFormat.MOV}
                  onChange={() => setFormat(ExportFormat.MOV)}
                />
                MOV
              </label>
            </div>
          </div>

          <div className="export-section">
            <h4>Resolution</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="resolution-width">Width</label>
                <input
                  id="resolution-width"
                  type="number"
                  className="form-input"
                  value={resolution.width}
                  onChange={(e) =>
                    setResolution({ ...resolution, width: Number.parseInt(e.target.value) || 0 })
                  }
                  aria-label="Video width in pixels"
                />
              </div>
              <div className="form-group">
                <label htmlFor="resolution-height">Height</label>
                <input
                  id="resolution-height"
                  type="number"
                  className="form-input"
                  value={resolution.height}
                  onChange={(e) =>
                    setResolution({ ...resolution, height: Number.parseInt(e.target.value) || 0 })
                  }
                  aria-label="Video height in pixels"
                />
              </div>
            </div>
          </div>

          <div className="export-section">
            <h4>Frame Rate</h4>
            <div className="form-group">
              <label htmlFor="frame-rate">Frame Rate</label>
              <select
                id="frame-rate"
                className="form-select"
                value={frameRate}
                onChange={(e) => setFrameRate(Number.parseInt(e.target.value))}
                aria-label="Video frame rate"
              >
                <option value={24}>24 fps (Cinema)</option>
                <option value={25}>25 fps (PAL)</option>
                <option value={30}>30 fps (NTSC)</option>
                <option value={60}>60 fps (High)</option>
              </select>
            </div>
          </div>

          <div className="export-section">
            <h4>Quality</h4>
            <div className="quality-slider">
              <label htmlFor="quality-slider" className="sr-only">Video quality</label>
              <input
                id="quality-slider"
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number.parseInt(e.target.value))}
                aria-label={`Video quality: ${quality}%`}
              />
              <span>{quality}%</span>
            </div>
          </div>

          <div className="export-section">
            <label className="checkbox-label" htmlFor="include-audio">
              <input
                id="include-audio"
                type="checkbox"
                checked={includeAudio}
                onChange={(e) => setIncludeAudio(e.target.checked)}
              />
              Include Audio
            </label>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
