/**
 * Text Panel Component
 * Title and subtitle editor
 */

import React, { useState, useCallback } from 'react';
import { useVideoEditor } from '../../../contexts/VideoEditorContext';
import { TextStyle, TextAnimation, TextLayer, Clip } from '../../../types/video-editor';
import './TextPanel.css';

const TEXT_PRESETS: { id: TextStyle; name: string; icon: string }[] = [
  { id: 'title', name: 'Title', icon: 'T' },
  { id: 'subtitle', name: 'Subtitle', icon: 'T' },
  { id: 'lower_third', name: 'Lower Third', icon: '3' },
  { id: 'caption', name: 'Caption', icon: 'C' },
  { id: 'credits', name: 'Credits', icon: '★' },
];

const ANIMATIONS: { id: TextAnimation; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'fade_in', name: 'Fade In' },
  { id: 'fade_out', name: 'Fade Out' },
  { id: 'slide_in_left', name: 'Slide In Left' },
  { id: 'slide_in_right', name: 'Slide In Right' },
  { id: 'slide_in_top', name: 'Slide In Top' },
  { id: 'slide_in_bottom', name: 'Slide In Bottom' },
  { id: 'typewriter', name: 'Typewriter' },
  { id: 'bounce', name: 'Bounce' },
];

export const TextPanel: React.FC = () => {
  const { clips, selectedClipIds, updateClip } = useVideoEditor();
  const [text, setText] = useState('Enter your text here');
  const [textStyle, setTextStyle] = useState<TextStyle>('title');
  const [animation, setAnimation] = useState<TextAnimation>('none');

  const selectedClip = clips.find((c: Clip) => selectedClipIds.includes(c.id));
  const textOverlay = selectedClip as TextLayer | undefined;

  const handleAddText = useCallback(() => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, {
      text: {
        content: text,
        style: textStyle,
        animation: animation,
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 'bold',
        color: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 2,
        shadowColor: '#000000',
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        positionX: 50,
        positionY: 50,
        rotation: 0,
        opacity: 100,
      },
    });
  }, [selectedClip, text, textStyle, animation, updateClip]);

  const handleUpdateText = useCallback(
    (updates: Partial<typeof textOverlay>) => {
      if (!selectedClip || !textOverlay) return;
      updateClip(selectedClip.id, {
        text: { ...textOverlay, ...updates },
      });
    },
    [selectedClip, textOverlay, updateClip]
  );

  const handleRemoveText = useCallback(() => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, { text: null });
  }, [selectedClip, updateClip]);

  return (
    <div className="text-panel">
      <div className="panel-header">
        <h3>Text</h3>
      </div>

      <div className="panel-content">
        <div className="text-input-section">
          <label>Text Content</label>
          <textarea
            className="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Enter your text..."
          />
        </div>

        <div className="text-style-section">
          <label>Style</label>
          <div className="preset-grid">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`preset-btn ${textStyle === preset.id ? 'active' : ''}`}
                onClick={() => setTextStyle(preset.id)}
              >
                <span className="preset-icon">{preset.icon}</span>
                <span className="preset-name">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-animation-section">
          <label htmlFor="text-animation">Animation</label>
          <select
            id="text-animation"
            className="select-input"
            value={animation}
            onChange={(e) => setAnimation(e.target.value as TextAnimation)}
            aria-label="Text animation selection"
          >
            {ANIMATIONS.map((anim) => (
              <option key={anim.id} value={anim.id}>
                {anim.name}
              </option>
            ))}
          </select>
        </div>

        {textOverlay && (
          <div className="text-properties-section">
            <label>Properties</label>
            
            <div className="property-row">
              <label htmlFor="font-size">Font Size</label>
              <input
                id="font-size"
                type="number"
                className="number-input"
                value={textOverlay.fontSize}
                onChange={(e) =>
                  handleUpdateText({ fontSize: Number.parseInt(e.target.value) || 24 })
                }
                min={8}
                max={200}
                aria-label="Font size"
              />
            </div>

            <div className="property-row">
              <label htmlFor="text-color">Color</label>
              <input
                id="text-color"
                type="color"
                className="color-input"
                value={textOverlay.color}
                onChange={(e) => handleUpdateText({ color: e.target.value })}
                aria-label="Text color"
              />
            </div>

            <div className="property-row">
              <label htmlFor="text-opacity">Opacity</label>
              <input
                id="text-opacity"
                type="range"
                className="range-input"
                min={0}
                max={100}
                value={textOverlay.opacity}
                onChange={(e) =>
                  handleUpdateText({ opacity: Number.parseInt(e.target.value) })
                }
                aria-label="Text opacity"
              />
            </div>
          </div>
        )}

        <div className="text-actions">
          {textOverlay ? (
            <>
              <button className="btn primary" onClick={handleAddText}>
                Update Text
              </button>
              <button className="btn danger" onClick={handleRemoveText}>
                Remove Text
              </button>
            </>
          ) : (
            <button
              className="btn primary"
              onClick={handleAddText}
              disabled={!selectedClip}
            >
              Add Text
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextPanel;

