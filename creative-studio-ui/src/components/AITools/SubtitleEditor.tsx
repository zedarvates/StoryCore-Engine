/**
 * Subtitle Editor Component
 * 
 * AI-powered subtitle generation with styling options.
 * Phase 8: UI Integration
 */

import React, { useState, useEffect } from 'react';
import './SubtitleEditor.css';

interface SubtitleStyle {
  id: string;
  description: string;
  font_size: number;
}

interface SubtitleSegment {
  index: number;
  start: number;
  end: number;
  text: string;
}

interface SubtitleEditorProps {
  videoPath: string;
  outputPath?: string;
  onSubtitlesGenerated?: (srtPath: string) => void;
  onSubtitlesApplied?: (videoPath: string) => void;
}

const API_BASE = 'http://localhost:8001/api/ai/advanced';

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  videoPath,
  outputPath,
  onSubtitlesGenerated,
  onSubtitlesApplied
}) => {
  const [styles, setStyles] = useState<SubtitleStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('default');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('white');
  const [outlineColor, setOutlineColor] = useState('black');
  const [outlineWidth, setOutlineWidth] = useState(2);
  const [language, setLanguage] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [srtPath, setSrtPath] = useState<string | null>(null);
  const [translateTo, setTranslateTo] = useState<string>('');
  const [editingSegment, setEditingSegment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const languages = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' },
  ];

  const colors = [
    { id: 'white', hex: '#FFFFFF' },
    { id: 'black', hex: '#000000' },
    { id: 'yellow', hex: '#FFFF00' },
    { id: 'cyan', hex: '#00FFFF' },
    { id: 'red', hex: '#FF0000' },
    { id: 'green', hex: '#00FF00' },
  ];

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const response = await fetch(`${API_BASE}/subtitle-styles`);
      const data = await response.json();
      setStyles(data.styles);
    } catch (error) {
      console.error('Failed to fetch styles:', error);
      setStyles([
        { id: 'default', description: 'Standard white text', font_size: 24 },
        { id: 'netflix', description: 'Netflix-style', font_size: 28 },
        { id: 'youtube', description: 'YouTube-style', font_size: 22 },
      ]);
    }
  };

  const generateSubtitles = async () => {
    if (!videoPath) return;

    setIsLoading(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 95));
      }, 1000);

      // First transcribe
      const transcribeResponse = await fetch(`${API_BASE}/subtitles/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoPath,
          output_srt: outputPath || videoPath.replace(/\.[^.]+$/, '.srt'),
          language
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await transcribeResponse.json();

      if (result.success) {
        setSrtPath(result.srt_path || null);
        // Parse SRT to segments for preview
        parseSRT(result.srt_path);
        onSubtitlesGenerated?.(result.srt_path);
      }
    } catch (error) {
      console.error('Failed to generate subtitles:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const burnSubtitles = async () => {
    if (!videoPath || !srtPath) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/subtitles/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoPath,
          output_path: outputPath || videoPath.replace(/\.[^.]+$/, '_subtitled.mp4'),
          style: selectedStyle,
          font_size: fontSize,
          font_color: fontColor,
          outline_color: outlineColor,
          outline_width: outlineWidth,
          language
        })
      });

      const result = await response.json();

      if (result.success) {
        onSubtitlesApplied?.(result.output_path);
      }
    } catch (error) {
      console.error('Failed to burn subtitles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const translateSubtitles = async () => {
    if (!srtPath || !translateTo) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/subtitles/translate?srt_path=${srtPath}&output_path=${srtPath.replace('.srt', `_${translateTo}.srt`)}&target_language=${translateTo}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        setSrtPath(result.output_path);
      }
    } catch (error) {
      console.error('Failed to translate subtitles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseSRT = async (_srtPath: string) => {
    // Simple SRT parsing for preview
    // In real implementation, fetch and parse the actual file from _srtPath
    const sampleSegments: SubtitleSegment[] = [
      { index: 1, start: 0, end: 3.5, text: 'Sample subtitle text here' },
      { index: 2, start: 3.5, end: 7.2, text: 'Another subtitle line' },
    ];
    setSegments(sampleSegments);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const startEdit = (index: number, text: string) => {
    setEditingSegment(index);
    setEditText(text);
  };

  const saveEdit = () => {
    if (editingSegment !== null) {
      setSegments(prev => prev.map(seg => 
        seg.index === editingSegment ? { ...seg, text: editText } : seg
      ));
      setEditingSegment(null);
      setEditText('');
    }
  };

  return (
    <div className="subtitle-editor">
      <div className="editor-header">
        <h3>📝 Subtitle Editor</h3>
        <p className="subtitle">AI-powered subtitle generation</p>
      </div>

      {/* Language Selection */}
      <div className="config-section">
        <label>Video Language:</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      {/* Generate Button */}
      <button
        className="generate-btn"
        onClick={generateSubtitles}
        disabled={isLoading || !videoPath}
      >
        {isLoading ? `⏳ Processing... ${progress}%` : '🎤 Generate Subtitles'}
      </button>

      {isLoading && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {/* Style Selection */}
      <div className="style-section">
        <h4>Style</h4>
        <div className="style-grid">
          {styles.map(style => (
            <button
              key={style.id}
              className={`style-btn ${selectedStyle === style.id ? 'selected' : ''}`}
              onClick={() => {
                setSelectedStyle(style.id);
                setFontSize(style.font_size);
              }}
            >
              {style.id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Color Options */}
      <div className="color-section">
        <div className="color-row">
          <label>Font Color:</label>
          <div className="color-buttons">
            {colors.map(color => (
              <button
                key={color.id}
                className={`color-btn ${fontColor === color.id ? 'selected' : ''}`}
                style={{ backgroundColor: color.hex }}
                onClick={() => setFontColor(color.id)}
              />
            ))}
          </div>
        </div>

        <div className="color-row">
          <label>Outline:</label>
          <div className="color-buttons">
            {colors.map(color => (
              <button
                key={color.id}
                className={`color-btn ${outlineColor === color.id ? 'selected' : ''}`}
                style={{ backgroundColor: color.hex }}
                onClick={() => setOutlineColor(color.id)}
              />
            ))}
          </div>
        </div>

        <div className="slider-row">
          <label>Font Size: {fontSize}px</label>
          <input
            type="range"
            min="16"
            max="48"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
          />
        </div>

        <div className="slider-row">
          <label>Outline: {outlineWidth}px</label>
          <input
            type="range"
            min="0"
            max="6"
            value={outlineWidth}
            onChange={(e) => setOutlineWidth(parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Preview */}
      {segments.length > 0 && (
        <div className="segments-preview">
          <h4>Preview & Edit</h4>
          <div className="segments-list">
            {segments.map(seg => (
              <div key={seg.index} className="segment-item">
                <span className="segment-time">
                  {formatTime(seg.start)} → {formatTime(seg.end)}
                </span>
                {editingSegment === seg.index ? (
                  <div className="edit-input">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                    />
                    <button onClick={saveEdit}>✓</button>
                    <button onClick={() => setEditingSegment(null)}>✗</button>
                  </div>
                ) : (
                  <span 
                    className="segment-text"
                    onClick={() => startEdit(seg.index, seg.text)}
                  >
                    {seg.text}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Translation */}
      {srtPath && (
        <div className="translate-section">
          <h4>Translate</h4>
          <div className="translate-row">
            <select value={translateTo} onChange={(e) => setTranslateTo(e.target.value)}>
              <option value="">Select language...</option>
              {languages.filter(l => l.code !== 'auto').map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
            <button
              onClick={translateSubtitles}
              disabled={!translateTo || isLoading}
            >
              🌐 Translate
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {srtPath && (
        <div className="actions-section">
          <button className="secondary-btn">💾 Save SRT</button>
          <button className="secondary-btn">📋 Copy</button>
          <button
            className="primary-btn"
            onClick={burnSubtitles}
            disabled={isLoading}
          >
            🔥 Burn to Video
          </button>
        </div>
      )}

      {/* Preview Style */}
      <div className="style-preview">
        <div 
          className="preview-text"
          style={{
            fontSize: `${fontSize}px`,
            color: fontColor,
            textShadow: `-${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}, ${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}, -${outlineWidth}px ${outlineWidth}px 0 ${outlineColor}, ${outlineWidth}px ${outlineWidth}px 0 ${outlineColor}`
          }}
        >
          Sample subtitle text
        </div>
      </div>
    </div>
  );
};

export default SubtitleEditor;